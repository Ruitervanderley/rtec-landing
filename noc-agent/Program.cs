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

// Register HttpClient for the Worker
builder.Services.AddHttpClient<Worker>((serviceProvider, client) =>
{
    var settings = serviceProvider
        .GetRequiredService<Microsoft.Extensions.Options.IOptions<AgentSettings>>()
        .Value;

    client.Timeout = TimeSpan.FromSeconds(settings.HeartbeatTimeoutSeconds > 0
        ? settings.HeartbeatTimeoutSeconds
        : 20);
    client.DefaultRequestHeaders.UserAgent.ParseAdd("RtecNocAgent/1.0");
});

// Register the Worker
builder.Services.AddHostedService<Worker>();

var host = builder.Build();
host.Run();
