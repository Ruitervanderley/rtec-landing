using noc_agent;

var builder = Host.CreateApplicationBuilder(args);

var agentSettings = builder.Configuration
    .GetSection(AgentSettings.SectionName)
    .Get<AgentSettings>() ?? new AgentSettings();

// Register as a Windows Service
builder.Services.AddWindowsService(options =>
{
    options.ServiceName = string.IsNullOrWhiteSpace(agentSettings.ServiceName)
        ? "RtecNocAgent"
        : agentSettings.ServiceName.Trim();
});

// Configure Settings
builder.Services.Configure<AgentSettings>(
    builder.Configuration.GetSection(AgentSettings.SectionName));

if (args.Contains("--apply-desktop-info", StringComparer.OrdinalIgnoreCase))
{
    var collector = new DeviceMetricsCollector();
    var metrics = collector.Collect();
    var deviceName = string.IsNullOrWhiteSpace(agentSettings.DeviceNameOverride)
        ? metrics.Hostname
        : agentSettings.DeviceNameOverride.Trim();

    DesktopInfoRenderer.Apply(new DesktopInfoSnapshot
    {
        CompanyName = agentSettings.CompanyName,
        DeviceName = deviceName,
        UserName = metrics.LoggedInUser,
        IpAddress = metrics.LocalIpAddress,
        MacAddress = metrics.MacAddress,
        AdapterName = metrics.NetworkAdapterName,
        AgentVersion = typeof(Program).Assembly.GetName().Version?.ToString() ?? "1.2.0",
        PreserveExistingWallpaper = agentSettings.PreserveExistingWallpaper,
        WallpaperImagePath = agentSettings.WallpaperImagePath,
        UpdatedAt = DateTimeOffset.Now,
    });

    return;
}

// Register HttpClient for the Worker
builder.Services.AddHttpClient<Worker>((serviceProvider, client) =>
{
    var settings = serviceProvider
        .GetRequiredService<Microsoft.Extensions.Options.IOptions<AgentSettings>>()
        .Value;

    client.Timeout = TimeSpan.FromSeconds(settings.HeartbeatTimeoutSeconds > 0
        ? settings.HeartbeatTimeoutSeconds
        : 20);
    client.DefaultRequestHeaders.UserAgent.ParseAdd("RtecNocAgent/1.2");
});

// Register the Worker
builder.Services.AddHostedService<Worker>();

var host = builder.Build();
host.Run();
