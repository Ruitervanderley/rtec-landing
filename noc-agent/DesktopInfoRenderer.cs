using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;
using System.Runtime.Versioning;

namespace noc_agent;

public sealed class DesktopInfoSnapshot
{
    public string CompanyName { get; init; } = string.Empty;
    public string DeviceName { get; init; } = string.Empty;
    public string UserName { get; init; } = string.Empty;
    public string IpAddress { get; init; } = string.Empty;
    public string MacAddress { get; init; } = string.Empty;
    public string AdapterName { get; init; } = string.Empty;
    public string AgentVersion { get; init; } = string.Empty;
    public bool PreserveExistingWallpaper { get; init; }
    public string WallpaperImagePath { get; init; } = string.Empty;
    public DateTimeOffset UpdatedAt { get; init; }
}

[SupportedOSPlatform("windows")]
public static class DesktopInfoRenderer
{
    private const int SpiSetDeskWallpaper = 20;
    private const int SpiGetDeskWallpaper = 0x0073;
    private const int SpifUpdateIniFile = 0x01;
    private const int SpifSendWinIniChange = 0x02;

    public static string Apply(DesktopInfoSnapshot snapshot)
    {
        var outputDirectory = GetOutputDirectory();
        Directory.CreateDirectory(outputDirectory);

        var baseWallpaper = ResolveBaseWallpaper(snapshot);
        using var baseImage = LoadBaseImage(baseWallpaper);
        using var canvas = new Bitmap(baseImage.Width, baseImage.Height, PixelFormat.Format24bppRgb);
        using var graphics = Graphics.FromImage(canvas);

        graphics.SmoothingMode = SmoothingMode.AntiAlias;
        graphics.TextRenderingHint = System.Drawing.Text.TextRenderingHint.ClearTypeGridFit;
        graphics.DrawImage(baseImage, 0, 0, canvas.Width, canvas.Height);
        DrawInfoCard(graphics, canvas.Size, snapshot);

        var outputPath = Path.Combine(outputDirectory, "rtec-noc-wallpaper.jpg");
        canvas.Save(outputPath, ImageFormat.Jpeg);
        SetWallpaper(outputPath);

        return outputPath;
    }

    private static void DrawInfoCard(Graphics graphics, Size canvasSize, DesktopInfoSnapshot snapshot)
    {
        var scale = Math.Max(1f, Math.Min(canvasSize.Width / 1920f, canvasSize.Height / 1080f));
        var width = (int)(520 * scale);
        var height = (int)(260 * scale);
        var margin = (int)(42 * scale);
        var bottomSafeArea = (int)(126 * scale);
        var x = Math.Max(margin, canvasSize.Width - width - margin);
        var y = Math.Max(margin, canvasSize.Height - height - margin - bottomSafeArea);
        var bounds = new Rectangle(x, y, width, height);

        using var cardBrush = new SolidBrush(Color.FromArgb(218, 5, 18, 34));
        using var borderPen = new Pen(Color.FromArgb(190, 51, 154, 240), Math.Max(1f, 2f * scale));
        using var titleBrush = new SolidBrush(Color.FromArgb(255, 226, 245, 255));
        using var labelBrush = new SolidBrush(Color.FromArgb(255, 120, 184, 223));
        using var valueBrush = new SolidBrush(Color.White);
        using var accentBrush = new SolidBrush(Color.FromArgb(255, 45, 164, 255));
        using var titleFont = new Font("Segoe UI", 18 * scale, FontStyle.Bold, GraphicsUnit.Pixel);
        using var metaFont = new Font("Segoe UI", 11 * scale, FontStyle.Bold, GraphicsUnit.Pixel);
        using var valueFont = new Font("Segoe UI", 14 * scale, FontStyle.Regular, GraphicsUnit.Pixel);

        FillRoundedRectangle(graphics, cardBrush, bounds, 22 * scale);
        DrawRoundedRectangle(graphics, borderPen, bounds, 22 * scale);

        var cursorY = y + (int)(24 * scale);
        graphics.FillEllipse(accentBrush, x + (int)(26 * scale), cursorY + (int)(2 * scale), (int)(12 * scale), (int)(12 * scale));
        graphics.DrawString("RTEC NOC AGENT", titleFont, titleBrush, x + (int)(50 * scale), cursorY);
        cursorY += (int)(34 * scale);
        graphics.DrawString(NormalizeText(snapshot.CompanyName, "Cliente RTEC"), valueFont, valueBrush, x + (int)(50 * scale), cursorY);
        cursorY += (int)(34 * scale);

        DrawLine("Maquina", NormalizeText(snapshot.DeviceName, Environment.MachineName), graphics, labelBrush, valueBrush, metaFont, valueFont, x, ref cursorY, scale);
        DrawLine("Usuario", NormalizeText(snapshot.UserName, Environment.UserName), graphics, labelBrush, valueBrush, metaFont, valueFont, x, ref cursorY, scale);
        DrawLine("IP", NormalizeText(snapshot.IpAddress, "-"), graphics, labelBrush, valueBrush, metaFont, valueFont, x, ref cursorY, scale);
        DrawLine("MAC", NormalizeText(snapshot.MacAddress, "-"), graphics, labelBrush, valueBrush, metaFont, valueFont, x, ref cursorY, scale);
        DrawLine("Rede", NormalizeText(snapshot.AdapterName, "-"), graphics, labelBrush, valueBrush, metaFont, valueFont, x, ref cursorY, scale);

        var footer = $"Agente {NormalizeText(snapshot.AgentVersion, "1.1.0")}  |  Atualizado {snapshot.UpdatedAt:dd/MM/yyyy HH:mm}";
        graphics.DrawString(footer, metaFont, labelBrush, x + (int)(50 * scale), y + height - (int)(36 * scale));
    }

    private static void DrawLine(
        string label,
        string value,
        Graphics graphics,
        Brush labelBrush,
        Brush valueBrush,
        Font labelFont,
        Font valueFont,
        int x,
        ref int cursorY,
        float scale)
    {
        graphics.DrawString($"{label}:", labelFont, labelBrush, x + (int)(50 * scale), cursorY);
        graphics.DrawString(TrimForWallpaper(value), valueFont, valueBrush, x + (int)(150 * scale), cursorY - (int)(2 * scale));
        cursorY += (int)(28 * scale);
    }

    private static string TrimForWallpaper(string value)
    {
        return value.Length <= 44 ? value : string.Concat(value.AsSpan(0, 41), "...");
    }

    private static string NormalizeText(string value, string fallback)
    {
        return string.IsNullOrWhiteSpace(value) || value.Equals("Unknown", StringComparison.OrdinalIgnoreCase)
            ? fallback
            : value.Trim();
    }

    private static void FillRoundedRectangle(Graphics graphics, Brush brush, Rectangle bounds, float radius)
    {
        using var path = CreateRoundedRectangle(bounds, radius);
        graphics.FillPath(brush, path);
    }

    private static void DrawRoundedRectangle(Graphics graphics, Pen pen, Rectangle bounds, float radius)
    {
        using var path = CreateRoundedRectangle(bounds, radius);
        graphics.DrawPath(pen, path);
    }

    private static GraphicsPath CreateRoundedRectangle(Rectangle bounds, float radius)
    {
        var diameter = radius * 2;
        var path = new GraphicsPath();
        path.AddArc(bounds.X, bounds.Y, diameter, diameter, 180, 90);
        path.AddArc(bounds.Right - diameter, bounds.Y, diameter, diameter, 270, 90);
        path.AddArc(bounds.Right - diameter, bounds.Bottom - diameter, diameter, diameter, 0, 90);
        path.AddArc(bounds.X, bounds.Bottom - diameter, diameter, diameter, 90, 90);
        path.CloseFigure();
        return path;
    }

    private static Image LoadBaseImage(string currentWallpaper)
    {
        if (!string.IsNullOrWhiteSpace(currentWallpaper) && File.Exists(currentWallpaper))
        {
            using var image = Image.FromFile(currentWallpaper);
            return new Bitmap(image);
        }

        var bitmap = new Bitmap(1920, 1080, PixelFormat.Format24bppRgb);
        using var graphics = Graphics.FromImage(bitmap);
        using var brush = new LinearGradientBrush(
            new Rectangle(0, 0, bitmap.Width, bitmap.Height),
            Color.FromArgb(255, 7, 16, 32),
            Color.FromArgb(255, 12, 86, 138),
            LinearGradientMode.ForwardDiagonal);
        graphics.FillRectangle(brush, 0, 0, bitmap.Width, bitmap.Height);
        return bitmap;
    }

    private static string ResolveBaseWallpaper(DesktopInfoSnapshot snapshot)
    {
        var configuredWallpaper = ResolveConfiguredWallpaperPath(snapshot.WallpaperImagePath);
        if (!string.IsNullOrWhiteSpace(configuredWallpaper) && File.Exists(configuredWallpaper))
        {
            return configuredWallpaper;
        }

        return snapshot.PreserveExistingWallpaper ? GetCurrentWallpaperPath() : string.Empty;
    }

    private static string ResolveConfiguredWallpaperPath(string wallpaperImagePath)
    {
        if (string.IsNullOrWhiteSpace(wallpaperImagePath))
        {
            return string.Empty;
        }

        var trimmedPath = wallpaperImagePath.Trim();
        return Path.IsPathRooted(trimmedPath)
            ? trimmedPath
            : Path.Combine(AppContext.BaseDirectory, trimmedPath);
    }

    private static string GetOutputDirectory()
    {
        var programData = Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData);
        return Path.Combine(programData, "Rtec", "NOC");
    }

    private static string GetCurrentWallpaperPath()
    {
        var buffer = new string('\0', 1024);
        return SystemParametersInfo(SpiGetDeskWallpaper, buffer.Length, buffer, 0)
            ? buffer.TrimEnd('\0')
            : string.Empty;
    }

    private static void SetWallpaper(string wallpaperPath)
    {
        SystemParametersInfo(SpiSetDeskWallpaper, 0, wallpaperPath, SpifUpdateIniFile | SpifSendWinIniChange);
    }

    [DllImport("user32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern bool SystemParametersInfo(int action, int parameter, string value, int flags);
}
