namespace noc_agent;

public class AgentSettings
{
    public const string SectionName = "AgentSettings";

    public string ApiBaseUrl { get; set; } = "https://api.rtectecnologia.com.br";
    public string CompanyName { get; set; } = "Cliente RTEC";
    public string DeviceToken { get; set; } = string.Empty;
    public string DeviceNameOverride { get; set; } = string.Empty;
    public bool EnableBgInfo { get; set; } = true;
    public bool PreserveExistingWallpaper { get; set; } = true;
    public string WallpaperImagePath { get; set; } = string.Empty;
    public int HeartbeatTimeoutSeconds { get; set; } = 20;
    public int IntervalSeconds { get; set; } = 60;
    public string ServiceName { get; set; } = "RtecNocAgent";
}
