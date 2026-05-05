#Requires -Version 7.0
[CmdletBinding()]
param(
  [switch]$Yes
)

$ErrorActionPreference = "Stop"
$InstallDir = Join-Path $env:LOCALAPPDATA "Programs\Nimbus\bin"

Write-Host "About to uninstall Nimbus:"
Write-Host "  Remove: $InstallDir\nimbus.exe"
Write-Host "  Remove: $InstallDir\nimbus-gateway.exe"
Write-Host "  Remove $InstallDir from User PATH (registry: HKCU\Environment)"

if (-not $Yes) {
  $answer = Read-Host "Continue? [y/N]"
  if ($answer -notmatch '^(y|yes)$') { Write-Host "Aborted."; exit 1 }
}

Remove-Item -Path (Join-Path $InstallDir "nimbus.exe")         -Force -ErrorAction SilentlyContinue
Remove-Item -Path (Join-Path $InstallDir "nimbus-gateway.exe") -Force -ErrorAction SilentlyContinue

$currentPath = [Environment]::GetEnvironmentVariable("PATH", "User")
if ($null -ne $currentPath) {
  $newSegments = $currentPath -split ";" | Where-Object { $_ -ne "" -and $_ -inotlike "*Nimbus\bin" }
  $newPath = $newSegments -join ";"
  [Environment]::SetEnvironmentVariable("PATH", $newPath, "User")
}

Write-Host "✓ Nimbus uninstalled."
