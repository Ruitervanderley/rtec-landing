using System;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Net.NetworkInformation;
using System.Net.Sockets;
using System.Management;
using Microsoft.Win32;

namespace noc_agent;

public class DeviceMetrics
{
    public double CpuUsagePercent { get; set; }
    public long RamUsedMb { get; set; }
    public long RamTotalMb { get; set; }
    public double DiskCFreePercent { get; set; }
    public string Hostname { get; set; } = string.Empty;
    public string LocalIpAddress { get; set; } = string.Empty;
    public string MacAddress { get; set; } = string.Empty;
    public string LoggedInUser { get; set; } = string.Empty;
    public string MachineGuid { get; set; } = string.Empty;
    public string NetworkAdapterName { get; set; } = string.Empty;
    public string OsVersion { get; set; } = string.Empty;
    public long UptimeSeconds { get; set; }
}

public class DeviceMetricsCollector
{
    private PerformanceCounter? _cpuCounter;
    private PerformanceCounter? _ramCounter;

    public DeviceMetricsCollector()
    {
        try
        {
            _cpuCounter = new PerformanceCounter("Processor", "% Processor Time", "_Total");
            _ramCounter = new PerformanceCounter("Memory", "Available MBytes");

            _cpuCounter.NextValue();
            _ramCounter.NextValue();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Failed to initialize performance counters: {ex.Message}");
        }
    }

    public DeviceMetrics Collect()
    {
        var primaryInterface = GetPrimaryInterface();
        var metrics = new DeviceMetrics
        {
            Hostname = Environment.MachineName,
            LocalIpAddress = primaryInterface?.IpAddress ?? "Unknown",
            MacAddress = primaryInterface?.MacAddress ?? "Unknown",
            LoggedInUser = GetLoggedInUser(),
            MachineGuid = GetMachineGuid(),
            NetworkAdapterName = primaryInterface?.Name ?? "Unknown",
            OsVersion = Environment.OSVersion.VersionString,
            UptimeSeconds = Environment.TickCount64 / 1000
        };

        try
        {
            if (_cpuCounter != null)
                metrics.CpuUsagePercent = Math.Round(_cpuCounter.NextValue(), 2);

            if (_ramCounter != null)
            {
                long availableRamMb = (long)_ramCounter.NextValue();
                metrics.RamTotalMb = GetTotalPhysicalMemoryMb();
                metrics.RamUsedMb = metrics.RamTotalMb - availableRamMb;
                if (metrics.RamUsedMb < 0) metrics.RamUsedMb = 0;
            }

            var driveC = DriveInfo.GetDrives().FirstOrDefault(d => d.Name.StartsWith("C", StringComparison.OrdinalIgnoreCase) && d.IsReady);
            if (driveC != null)
                metrics.DiskCFreePercent = Math.Round((double)driveC.AvailableFreeSpace / driveC.TotalSize * 100, 2);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error collecting metrics: {ex.Message}");
        }

        return metrics;
    }

    private long GetTotalPhysicalMemoryMb()
    {
        try
        {
            using var searcher = new ManagementObjectSearcher("SELECT TotalPhysicalMemory FROM Win32_ComputerSystem");
            foreach (var item in searcher.Get())
            {
                if (item["TotalPhysicalMemory"] != null)
                {
                    long totalBytes = Convert.ToInt64(item["TotalPhysicalMemory"]);
                    return totalBytes / (1024 * 1024);
                }
            }
        }
        catch (Exception) { /* fallback */ }
        return 8192;
    }

    private NetworkInterfaceInfo? GetPrimaryInterface()
    {
        try
        {
            foreach (var ni in NetworkInterface.GetAllNetworkInterfaces())
            {
                if (ni.OperationalStatus == OperationalStatus.Up && ni.NetworkInterfaceType != NetworkInterfaceType.Loopback)
                {
                    var props = ni.GetIPProperties();
                    var ipv4 = props.UnicastAddresses.FirstOrDefault(a => a.Address.AddressFamily == AddressFamily.InterNetwork);
                    if (ipv4 != null)
                    {
                        return new NetworkInterfaceInfo
                        {
                            IpAddress = ipv4.Address.ToString(),
                            MacAddress = string.Join(":", ni.GetPhysicalAddress().GetAddressBytes().Select(b => b.ToString("X2"))),
                            Name = ni.Name,
                        };
                    }
                }
            }
        }
        catch { }
        return null;
    }

    private string GetMachineGuid()
    {
        try
        {
            using var key = Registry.LocalMachine.OpenSubKey(@"SOFTWARE\Microsoft\Cryptography");
            return key?.GetValue("MachineGuid")?.ToString() ?? string.Empty;
        }
        catch { }
        return string.Empty;
    }

    private string GetLoggedInUser()
    {
        try
        {
            using var searcher = new ManagementObjectSearcher("SELECT UserName FROM Win32_ComputerSystem");
            foreach (var item in searcher.Get())
            {
                var username = item["UserName"]?.ToString();
                if (!string.IsNullOrEmpty(username)) return username;
            }
        }
        catch { }
        
        return Environment.UserName;
    }

    private sealed class NetworkInterfaceInfo
    {
        public string IpAddress { get; init; } = string.Empty;
        public string MacAddress { get; init; } = string.Empty;
        public string Name { get; init; } = string.Empty;
    }
}
