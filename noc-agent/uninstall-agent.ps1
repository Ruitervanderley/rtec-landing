[CmdletBinding()]
param(
    [string]$InstallPath = 'C:\Rtec\NOC',
    [string]$ServiceName = 'RtecNocAgent',
    [switch]$KeepFiles
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if (-not ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw 'Execute este script em um PowerShell elevado (Administrador).'
}

$service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($service) {
    if ($service.Status -ne 'Stopped') {
        Stop-Service -Name $ServiceName -Force
    }

    sc.exe delete $ServiceName | Out-Null
    Write-Host "Serviço $ServiceName removido."
} else {
    Write-Host "Serviço $ServiceName não encontrado. Seguindo com a limpeza."
}

if (-not $KeepFiles -and (Test-Path -LiteralPath $InstallPath)) {
    Remove-Item -LiteralPath $InstallPath -Recurse -Force
    Write-Host "Arquivos removidos de $InstallPath"
}
