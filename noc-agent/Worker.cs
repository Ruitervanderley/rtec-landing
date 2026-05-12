using System;
using System.Diagnostics;
using System.IO;
using System.Net.Http.Json;
using System.Reflection;
using Microsoft.Extensions.Options;

namespace noc_agent;

public class Worker : BackgroundService
{
    private readonly ILogger<Worker> _logger;
    private readonly HttpClient _httpClient;
    private readonly AgentSettings _settings;
    private readonly DeviceMetricsCollector _collector;
    private readonly string _appDirectory;
    private readonly string _appVersion;
    private readonly Uri _heartbeatUri;
    private bool _missingTokenWarningLogged;

    public Worker(ILogger<Worker> logger, HttpClient httpClient, IOptions<AgentSettings> settings)
    {
        _logger = logger;
        _httpClient = httpClient;
        _settings = settings.Value;
        _collector = new DeviceMetricsCollector();
        _appDirectory = AppContext.BaseDirectory;
        _appVersion = ResolveAgentVersion();
        _heartbeatUri = new Uri($"{_settings.ApiBaseUrl.TrimEnd('/')}/v1/device/heartbeat");
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("RTEC NOC Agent initializing at: {time}", DateTimeOffset.Now);

        if (string.IsNullOrWhiteSpace(_settings.DeviceToken))
        {
            _logger.LogWarning("Device token is not configured. Telemetry will stay local until a valid token is provided.");
        }
        else
        {
            _httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {_settings.DeviceToken}");
        }

        // Apply BGInfo immediately on startup
        TryApplyBgInfo();

        int loopCounter = 0;

        while (!stoppingToken.IsCancellationRequested)
        {
            if (_logger.IsEnabled(LogLevel.Information))
            {
                _logger.LogInformation("Agent running at: {time}", DateTimeOffset.Now);
            }

            try
            {
                if (string.IsNullOrWhiteSpace(_settings.DeviceToken))
                {
                    if (!_missingTokenWarningLogged)
                    {
                        _logger.LogWarning("Skipping heartbeat because no device token is configured.");
                        _missingTokenWarningLogged = true;
                    }

                    await Task.Delay(TimeSpan.FromSeconds(GetDelaySeconds()), stoppingToken);
                    continue;
                }

                _missingTokenWarningLogged = false;
                var metrics = _collector.Collect();
                var deviceName = string.IsNullOrWhiteSpace(_settings.DeviceNameOverride)
                    ? metrics.Hostname
                    : _settings.DeviceNameOverride.Trim();
                
                var payload = new
                {
                    status = "ONLINE",
                    app_version = _appVersion,
                    device_name = deviceName,
                    meta = new
                    {
                        cpu_usage_percent = metrics.CpuUsagePercent,
                        ram_used_mb = metrics.RamUsedMb,
                        ram_total_mb = metrics.RamTotalMb,
                        disk_c_free_percent = metrics.DiskCFreePercent,
                        hostname = metrics.Hostname,
                        machine_guid = metrics.MachineGuid,
                        local_ip = metrics.LocalIpAddress,
                        mac_address = metrics.MacAddress,
                        network_adapter_name = metrics.NetworkAdapterName,
                        logged_in_user = metrics.LoggedInUser,
                        os_version = metrics.OsVersion,
                        uptime_seconds = metrics.UptimeSeconds
                    }
                };

                _logger.LogInformation("Sending heartbeat for {Hostname} | CPU: {Cpu}% | Free C: {Disk}%", 
                    deviceName, metrics.CpuUsagePercent, metrics.DiskCFreePercent);

                var response = await _httpClient.PostAsJsonAsync(_heartbeatUri, payload, stoppingToken);

                if (response.IsSuccessStatusCode)
                {
                    _logger.LogDebug("Heartbeat successful.");
                }
                else
                {
                    var content = await response.Content.ReadAsStringAsync(stoppingToken);
                    _logger.LogError("Heartbeat failed with {StatusCode}. Response: {Content}", response.StatusCode, content);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while sending the heartbeat.");
            }

            // Every ~60 loops (e.g. 1 hour if interval is 60s), re-apply the BGInfo to catch IP changes
            loopCounter++;
            if (loopCounter >= 60)
            {
                TryApplyBgInfo();
                loopCounter = 0;
            }

            await Task.Delay(TimeSpan.FromSeconds(GetDelaySeconds()), stoppingToken);
        }
    }

    private int GetDelaySeconds()
    {
        return _settings.IntervalSeconds > 10 ? _settings.IntervalSeconds : 60;
    }

    private void TryApplyBgInfo()
    {
        if (!_settings.EnableBgInfo)
        {
            _logger.LogInformation("BGInfo is disabled in appsettings.");
            return;
        }

        try
        {
            string bgInfoPath = Path.Combine(_appDirectory, "Bginfo.exe");
            string configPath = Path.Combine(_appDirectory, "rtec-bginfo.bgi");

            if (!File.Exists(bgInfoPath))
            {
                _logger.LogWarning("Bginfo.exe was not found in the application directory. Skipping wallpaper update.");
                return;
            }

            _logger.LogInformation("Applying Desktop Wallpaper Information via BGInfo...");

            var startInfo = new ProcessStartInfo
            {
                FileName = bgInfoPath,
                // /timer:0 = Do not show countdown dialog
                // /silent = No errors/prompts
                // /nolicprompt = Accept sysinternals EULA automatically
                Arguments = File.Exists(configPath) 
                    ? $"\"{configPath}\" /timer:0 /silent /nolicprompt"
                    : "/timer:0 /silent /nolicprompt",
                UseShellExecute = false,
                CreateNoWindow = true
            };

            using var process = Process.Start(startInfo);
            if (process != null)
            {
                // Give it 10 seconds to finish drawing the wallpaper
                if (!process.WaitForExit(10000))
                {
                    process.Kill();
                    _logger.LogWarning("Bginfo process took too long and was terminated.");
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An error occurred while trying to run Bginfo.");
        }
    }

    private static string ResolveAgentVersion()
    {
        var assembly = Assembly.GetExecutingAssembly();
        var informationalVersion = assembly
            .GetCustomAttribute<AssemblyInformationalVersionAttribute>()
            ?.InformationalVersion;

        if (!string.IsNullOrWhiteSpace(informationalVersion))
        {
            return informationalVersion.Trim();
        }

        return assembly.GetName().Version?.ToString() ?? "1.0.0";
    }
}
