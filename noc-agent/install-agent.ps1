[CmdletBinding()]
param(
    [string]$InstallPath = 'C:\Rtec\NOC',
    [string]$ServiceName,
    [switch]$SkipBgInfoValidation
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Get-AgentSettings {
    param(
        [string]$SettingsPath
    )

    if (-not (Test-Path -LiteralPath $SettingsPath)) {
        throw "Arquivo de configuração não encontrado: $SettingsPath"
    }

    $config = Get-Content -LiteralPath $SettingsPath -Raw | ConvertFrom-Json
    if (-not $config.AgentSettings) {
        throw 'Seção AgentSettings ausente no appsettings.json.'
    }

    return $config.AgentSettings
}

if (-not ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw 'Execute este script em um PowerShell elevado (Administrador).'
}

$scriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$sourceExe = Join-Path $scriptDirectory 'noc-agent.exe'
$sourceSettings = Join-Path $scriptDirectory 'appsettings.json'
$sourceBgInfo = Join-Path $scriptDirectory 'Bginfo.exe'
$sourceBgInfoProfile = Join-Path $scriptDirectory 'rtec-bginfo.bgi'

if (-not (Test-Path -LiteralPath $sourceExe)) {
    throw "Executável do agente não encontrado em $sourceExe"
}

$agentSettings = Get-AgentSettings -SettingsPath $sourceSettings
$resolvedServiceName = if ([string]::IsNullOrWhiteSpace($ServiceName)) {
    if ([string]::IsNullOrWhiteSpace($agentSettings.ServiceName)) { 'RtecNocAgent' } else { [string]$agentSettings.ServiceName }
} else {
    $ServiceName
}

if ([string]::IsNullOrWhiteSpace($agentSettings.DeviceToken)) {
    Write-Warning 'DeviceToken está vazio. O agente será instalado, mas não enviará heartbeat até receber um token válido.'
}

if ($SkipBgInfoValidation) {
    Write-Warning '-SkipBgInfoValidation foi mantido apenas por compatibilidade. O agente agora gera o layout da área de trabalho sem depender do Bginfo.exe.'
}

New-Item -ItemType Directory -Force -Path $InstallPath | Out-Null
Copy-Item -LiteralPath $sourceExe -Destination (Join-Path $InstallPath 'noc-agent.exe') -Force
Copy-Item -LiteralPath $sourceSettings -Destination (Join-Path $InstallPath 'appsettings.json') -Force

if (Test-Path -LiteralPath $sourceBgInfo) {
    Copy-Item -LiteralPath $sourceBgInfo -Destination (Join-Path $InstallPath 'Bginfo.exe') -Force
}

if (Test-Path -LiteralPath $sourceBgInfoProfile) {
    Copy-Item -LiteralPath $sourceBgInfoProfile -Destination (Join-Path $InstallPath 'rtec-bginfo.bgi') -Force
}

foreach ($wallpaperName in @('wallpaper.jpg', 'wallpaper.jpeg', 'wallpaper.png')) {
    $sourceWallpaper = Join-Path $scriptDirectory $wallpaperName
    if (Test-Path -LiteralPath $sourceWallpaper) {
        Copy-Item -LiteralPath $sourceWallpaper -Destination (Join-Path $InstallPath $wallpaperName) -Force
    }
}

$service = Get-Service -Name $resolvedServiceName -ErrorAction SilentlyContinue
if ($service) {
    Write-Host "Serviço $resolvedServiceName já existe. Reiniciando com os arquivos atualizados..."
    if ($service.Status -ne 'Stopped') {
        Stop-Service -Name $resolvedServiceName -Force
    }
} else {
    Write-Host "Criando serviço $resolvedServiceName..."
    sc.exe create $resolvedServiceName binPath= "`"$InstallPath\noc-agent.exe`"" start= auto | Out-Null
}

sc.exe description $resolvedServiceName "RTEC NOC Agent - telemetria operacional e heartbeat do tenant." | Out-Null
Start-Service -Name $resolvedServiceName

if ($agentSettings.EnableBgInfo) {
    Write-Host 'Aplicando identificação visual limpa na área de trabalho do usuário atual...'
    & (Join-Path $InstallPath 'noc-agent.exe') --apply-desktop-info
}

Write-Host "Agente instalado com sucesso em $InstallPath"
Write-Host "Serviço: $resolvedServiceName"
