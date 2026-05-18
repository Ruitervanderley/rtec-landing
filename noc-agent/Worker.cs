using System;
using System.Net.Http.Json;
using System.Reflection;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;

namespace noc_agent;

public class Worker : BackgroundService
{
    private readonly ILogger<Worker> _logger;
    private readonly HttpClient _httpClient;
    private readonly AgentSettings _settings;
    private readonly DeviceMetricsCollector _collector;
    private readonly string _appVersion;
    private readonly Uri _heartbeatUri;
    private readonly Uri _commandsUri;
    private bool _missingTokenWarningLogged;

    public Worker(ILogger<Worker> logger, HttpClient httpClient, IOptions<AgentSettings> settings)
    {
        _logger = logger;
        _httpClient = httpClient;
        _settings = settings.Value;
        _collector = new DeviceMetricsCollector();
        _appVersion = ResolveAgentVersion();
        _heartbeatUri = new Uri($"{_settings.ApiBaseUrl.TrimEnd('/')}/v1/device/heartbeat");
        _commandsUri = new Uri($"{_settings.ApiBaseUrl.TrimEnd('/')}/v1/device/commands");
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

        // Apply a clean RTEC desktop information card immediately on startup.
        TryApplyDesktopInfo();

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
                await SendHeartbeatAsync(stoppingToken);
                await PollCommandsAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while sending the heartbeat.");
            }

            // Every ~60 loops (e.g. 1 hour if interval is 60s), refresh desktop info to catch IP changes.
            loopCounter++;
            if (loopCounter >= 60)
            {
                TryApplyDesktopInfo();
                loopCounter = 0;
            }

            await Task.Delay(TimeSpan.FromSeconds(GetDelaySeconds()), stoppingToken);
        }
    }

    private int GetDelaySeconds()
    {
        return _settings.IntervalSeconds > 10 ? _settings.IntervalSeconds : 60;
    }

    private string ResolveDeviceName(DeviceMetrics metrics)
    {
        return string.IsNullOrWhiteSpace(_settings.DeviceNameOverride)
            ? metrics.Hostname
            : _settings.DeviceNameOverride.Trim();
    }

    private void TryApplyDesktopInfo()
    {
        if (!_settings.EnableBgInfo)
        {
            _logger.LogInformation("Desktop information card is disabled in appsettings.");
            return;
        }

        try
        {
            var metrics = _collector.Collect();
            var outputPath = DesktopInfoRenderer.Apply(new DesktopInfoSnapshot
            {
                CompanyName = _settings.CompanyName,
                DeviceName = ResolveDeviceName(metrics),
                UserName = metrics.LoggedInUser,
                IpAddress = metrics.LocalIpAddress,
                MacAddress = metrics.MacAddress,
                AdapterName = metrics.NetworkAdapterName,
                AgentVersion = _appVersion,
                PreserveExistingWallpaper = _settings.PreserveExistingWallpaper,
                WallpaperImagePath = _settings.WallpaperImagePath,
                UpdatedAt = DateTimeOffset.Now,
            });

            _logger.LogInformation("Desktop information card applied at {WallpaperPath}.", outputPath);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An error occurred while applying desktop information.");
        }
    }

    private async Task SendHeartbeatAsync(CancellationToken stoppingToken)
    {
        var metrics = _collector.Collect();
        var deviceName = ResolveDeviceName(metrics);

        var payload = new
        {
            status = "ONLINE",
            appVersion = _appVersion,
            app_version = _appVersion,
            device_name = deviceName,
            meta = BuildMetricsPayload(metrics)
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

    private async Task PollCommandsAsync(CancellationToken stoppingToken)
    {
        try
        {
            var response = await _httpClient.GetAsync(_commandsUri, stoppingToken);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Command polling failed with {StatusCode}.", response.StatusCode);
                return;
            }

            var payload = await response.Content.ReadFromJsonAsync<DeviceCommandPollResponse>(cancellationToken: stoppingToken);
            if (payload?.Commands is null || payload.Commands.Count == 0)
            {
                return;
            }

            foreach (var command in payload.Commands)
            {
                await ExecuteCommandAsync(command, stoppingToken);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An error occurred while polling agent commands.");
        }
    }

    private async Task ExecuteCommandAsync(DeviceCommand command, CancellationToken stoppingToken)
    {
        try
        {
            _logger.LogInformation("Executing NOC command {CommandType} ({CommandId}).", command.CommandType, command.Id);

            object result = command.CommandType switch
            {
                "FORCE_HEARTBEAT" => await ExecuteForceHeartbeatAsync(stoppingToken),
                "APPLY_DESKTOP_INFO" => ExecuteApplyDesktopInfo(),
                "COLLECT_DIAGNOSTIC" => ExecuteCollectDiagnostic(),
                _ => throw new InvalidOperationException($"Unsupported command type: {command.CommandType}")
            };

            await CompleteCommandAsync(command.Id, "SUCCEEDED", result, null, stoppingToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "NOC command {CommandType} ({CommandId}) failed.", command.CommandType, command.Id);
            await CompleteCommandAsync(command.Id, "FAILED", null, ex.Message, stoppingToken);
        }
    }

    private async Task<object> ExecuteForceHeartbeatAsync(CancellationToken stoppingToken)
    {
        await SendHeartbeatAsync(stoppingToken);
        return new
        {
            message = "Heartbeat sent on demand",
            completedAt = DateTimeOffset.UtcNow
        };
    }

    private object ExecuteApplyDesktopInfo()
    {
        TryApplyDesktopInfo();
        return new
        {
            message = "Desktop information card reapplied",
            completedAt = DateTimeOffset.UtcNow
        };
    }

    private object ExecuteCollectDiagnostic()
    {
        var metrics = _collector.Collect();
        return new
        {
            collectedAt = DateTimeOffset.UtcNow,
            metrics = BuildMetricsPayload(metrics)
        };
    }

    private async Task CompleteCommandAsync(string commandId, string status, object? result, string? errorMessage, CancellationToken stoppingToken)
    {
        var uri = new Uri($"{_commandsUri}/{commandId}/complete");
        var response = await _httpClient.PostAsJsonAsync(uri, new
        {
            status,
            result,
            errorMessage
        }, stoppingToken);

        if (!response.IsSuccessStatusCode)
        {
            var content = await response.Content.ReadAsStringAsync(stoppingToken);
            _logger.LogWarning("Failed to complete command {CommandId}: {StatusCode} {Content}", commandId, response.StatusCode, content);
        }
    }

    private static object BuildMetricsPayload(DeviceMetrics metrics)
    {
        return new
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
        };
    }

    private static string ResolveAgentVersion()
    {
        var assembly = Assembly.GetExecutingAssembly();
        var informationalVersion = assembly
            .GetCustomAttribute<AssemblyInformationalVersionAttribute>()
            ?.InformationalVersion;

        if (!string.IsNullOrWhiteSpace(informationalVersion))
        {
            return NormalizeVersion(informationalVersion);
        }

        return assembly.GetName().Version?.ToString() ?? "1.0.0";
    }

    private static string NormalizeVersion(string version)
    {
        var normalized = version.Trim();
        var metadataIndex = normalized.IndexOf('+');
        return metadataIndex > 0 ? normalized[..metadataIndex] : normalized;
    }
}

public sealed class DeviceCommandPollResponse
{
    [JsonPropertyName("commands")]
    public List<DeviceCommand> Commands { get; set; } = [];
}

public sealed class DeviceCommand
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("commandType")]
    public string CommandType { get; set; } = string.Empty;
}
