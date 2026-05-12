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
            return NetworkInterface.GetAllNetworkInterfaces()
                .Where(IsUsableInterface)
                .Select(BuildNetworkInterfaceInfo)
                .Where(info => info != null)
                .OrderByDescending(info => info!.Score)
                .FirstOrDefault();
        }
        catch { }
        return null;
    }

    private static bool IsUsableInterface(NetworkInterface networkInterface)
    {
        if (networkInterface.OperationalStatus != OperationalStatus.Up)
        {
            return false;
        }

        if (networkInterface.NetworkInterfaceType is NetworkInterfaceType.Loopback or NetworkInterfaceType.Tunnel)
        {
            return false;
        }

        var physicalAddress = networkInterface.GetPhysicalAddress().GetAddressBytes();
        if (physicalAddress.Length == 0 || physicalAddress.All(value => value == 0))
        {
            return false;
        }

        var identity = $"{networkInterface.Name} {networkInterface.Description}".ToLowerInvariant();
        var blockedTerms = new[]
        {
            "virtual",
            "vmware",
            "hyper-v",
            "bluetooth",
            "loopback",
            "pseudo",
            "tunnel",
            "tap",
            "wi-fi direct",
            "virtualbox",
            "docker",
            "npcap",
        };

        return !blockedTerms.Any(identity.Contains);
    }

    private static NetworkInterfaceInfo? BuildNetworkInterfaceInfo(NetworkInterface networkInterface)
    {
        var props = networkInterface.GetIPProperties();
        var ipv4 = props.UnicastAddresses
            .Where(address => address.Address.AddressFamily == AddressFamily.InterNetwork)
            .Select(address => address.Address.ToString())
            .FirstOrDefault(address => !address.StartsWith("169.254.", StringComparison.OrdinalIgnoreCase));

        if (string.IsNullOrWhiteSpace(ipv4))
        {
            return null;
        }

        var hasGateway = props.GatewayAddresses.Any(address => address.Address.AddressFamily == AddressFamily.InterNetwork);
        var typeScore = networkInterface.NetworkInterfaceType switch
        {
            NetworkInterfaceType.Ethernet => 40,
            NetworkInterfaceType.Wireless80211 => 35,
            _ => 10,
        };
        var speedScore = networkInterface.Speed > 0 ? Math.Min(20, (int)(networkInterface.Speed / 100_000_000)) : 0;
        var gatewayScore = hasGateway ? 50 : 0;

        return new NetworkInterfaceInfo
        {
            IpAddress = ipv4,
            MacAddress = string.Join(":", networkInterface.GetPhysicalAddress().GetAddressBytes().Select(b => b.ToString("X2"))),
            Name = string.IsNullOrWhiteSpace(networkInterface.Description) ? networkInterface.Name : networkInterface.Description,
            Score = gatewayScore + typeScore + speedScore,
        };
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
        public int Score { get; init; }
    }
}
