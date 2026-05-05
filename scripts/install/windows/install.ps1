#Requires -Version 7.0
<#
.SYNOPSIS
  Nimbus installer for Windows (per-user, no admin).
.PARAMETER Yes
  Skip confirmation prompts.
.PARAMETER DryRun
  Print planned actions and exit without writing.
#>
[CmdletBinding()]
param(
  [switch]$Yes,
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"

$InstallDir = Join-Path $env:LOCALAPPDATA "Programs\Nimbus\bin"
$ScriptDir  = Split-Path -Parent $MyInvocation.MyCommand.Path
$NimbusSrc  = Join-Path $ScriptDir "nimbus.exe"
$GatewaySrc = Join-Path $ScriptDir "nimbus-gateway.exe"

if (-not (Test-Path $NimbusSrc) -or -not (Test-Path $GatewaySrc)) {
  $NimbusSrc  = Join-Path $ScriptDir "bin\nimbus.exe"
  $GatewaySrc = Join-Path $ScriptDir "bin\nimbus-gateway.exe"
}
if (-not (Test-Path $NimbusSrc) -or -not (Test-Path $GatewaySrc)) {
  throw "Cannot locate 'nimbus.exe' or 'nimbus-gateway.exe' beside this script."
}

Write-Host "About to install Nimbus:"
Write-Host "  Binaries: $NimbusSrc, $GatewaySrc"
Write-Host "  -> into:  $InstallDir"
Write-Host "  Update User PATH (registry: HKCU\Environment)"

if ($DryRun) {
  Write-Host "(--DryRun; no changes made)"
  exit 0
}

if (-not $Yes) {
  $answer = Read-Host "Continue? [y/N]"
  if ($answer -notmatch '^(y|yes)$') { Write-Host "Aborted."; exit 1 }
}

if (-not (Test-Path $InstallDir)) {
  New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
}

if ((Test-Path (Join-Path $InstallDir "nimbus.exe")) -and -not $Yes) {
  $answer2 = Read-Host "Existing install detected. Overwrite? [y/N]"
  if ($answer2 -notmatch '^(y|yes)$') { Write-Host "Aborted."; exit 1 }
}

Copy-Item -Path $NimbusSrc  -Destination (Join-Path $InstallDir "nimbus.exe")  -Force
Copy-Item -Path $GatewaySrc -Destination (Join-Path $InstallDir "nimbus-gateway.exe") -Force

# Update User PATH via .NET API (avoids setx 1024-char truncation bug).
$currentPath = [Environment]::GetEnvironmentVariable("PATH", "User")
if ($null -eq $currentPath) { $currentPath = "" }

# Idempotent: only add if not already present (case-insensitive on Windows).
$pathSegments = $currentPath -split ";" | Where-Object { $_ -ne "" }
$alreadyPresent = $pathSegments | Where-Object { $_ -ieq $InstallDir }
if (-not $alreadyPresent) {
  $newPath = if ($currentPath -eq "") { $InstallDir } else { "$currentPath;$InstallDir" }
  [Environment]::SetEnvironmentVariable("PATH", $newPath, "User")

  # Broadcast WM_SETTINGCHANGE so already-open Explorer / shells pick up the new value.
  $signature = @'
[DllImport("user32.dll", SetLastError=true, CharSet=CharSet.Auto)]
public static extern IntPtr SendMessageTimeout(
  IntPtr hWnd, uint Msg, UIntPtr wParam, string lParam,
  uint fuFlags, uint uTimeout, out UIntPtr lpdwResult);
'@
  $type = Add-Type -MemberDefinition $signature -Name 'NimbusEnvBroadcast' -Namespace Win32 -PassThru
  [UIntPtr]$result = [UIntPtr]::Zero
  $HWND_BROADCAST = [IntPtr]0xffff
  $WM_SETTINGCHANGE = 0x001A
  $SMTO_ABORTIFHUNG = 0x0002
  $type::SendMessageTimeout($HWND_BROADCAST, $WM_SETTINGCHANGE, [UIntPtr]::Zero, "Environment", $SMTO_ABORTIFHUNG, 5000, [ref]$result) | Out-Null
}

Write-Host ""
Write-Host "✓ Nimbus installed."
Write-Host "  Open a new shell, then run: nimbus --version"
