$ErrorActionPreference = "SilentlyContinue"
$sejak = (Get-Date).AddDays(-7)
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$namaUser = [regex]::Escape($env:USERNAME)
function Tulis($t) { $s = [string]$t; if ($namaUser) { $s = $s -replace $namaUser, "<user>" }; [Console]::Out.WriteLine($s) }
function Judul($t) { Tulis ""; Tulis "==== $t ====" }
Judul "System"
$os = Get-CimInstance Win32_OperatingSystem
Tulis "Windows: $($os.Caption) $($os.Version) build $($os.BuildNumber)"
Tulis ("RAM: {0:N1} GB" -f ($os.TotalVisibleMemorySize / 1MB))
Get-CimInstance Win32_VideoController | ForEach-Object { Tulis "GPU: $($_.Name) | driver $($_.DriverVersion) ($($_.DriverDate))" }
Get-CimInstance Win32_Processor | ForEach-Object { Tulis "CPU: $($_.Name)" }

Judul "WebView2 runtime"
foreach ($k in @("HKLM:\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}",
                 "HKCU:\Software\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}")) {
  $v = (Get-ItemProperty $k).pv; if ($v) { Tulis "$k -> $v" }
}

Judul "Chudai Account Manager"
Get-ChildItem "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall" | ForEach-Object {
  $p = Get-ItemProperty $_.PSPath; if ($p.DisplayName -match "Chudai") { Tulis "$($p.DisplayName) $($p.DisplayVersion)" }
}

Judul "Antivirus"
Get-CimInstance -Namespace root/SecurityCenter2 -ClassName AntiVirusProduct | ForEach-Object { Tulis $_.displayName }

Judul "Blue screens / unexpected restarts (System log, 7 days)"
Get-WinEvent -FilterHashtable @{ LogName = "System"; StartTime = $sejak; Id = 41, 1001, 6008, 4101, 14, 153 } |
  Where-Object { $_.ProviderName -match "Kernel-Power|WER-SystemErrorReporting|BugCheck|EventLog|Display|nvlddmkm|amdkmdag|atikmdag|igfx|dxgkrnl" } |
  Sort-Object TimeCreated | ForEach-Object {
    $m = ($_.Message -replace "\s+", " ")
    if ($m.Length -gt 300) { $m = $m.Substring(0, 300) }
    Tulis ("{0:yyyy-MM-dd HH:mm:ss} [{1} {2}] {3}" -f $_.TimeCreated, $_.ProviderName, $_.Id, $m)
  }

Judul "Application crashes / hangs (CAM, WebView2, Roblox, GPU)"
Get-WinEvent -FilterHashtable @{ LogName = "Application"; StartTime = $sejak; Id = 1000, 1001, 1002 } |
  Where-Object { $_.Message -match "Chudai|msedgewebview2|Roblox|nvlddmkm|atikmdag|amdkmdag|igdkmd|dwm" } |
  Sort-Object TimeCreated | ForEach-Object {
    $m = ($_.Message -replace "\s+", " ")
    if ($m.Length -gt 400) { $m = $m.Substring(0, 400) }
    Tulis ("{0:yyyy-MM-dd HH:mm:ss} [{1} {2}] {3}" -f $_.TimeCreated, $_.ProviderName, $_.Id, $m)
  }

Judul "Reliability Monitor (7 days)"
Get-CimInstance Win32_ReliabilityRecords | Where-Object { $_.TimeGenerated -gt $sejak -and $_.SourceName -match "Windows Error Reporting|BugCheck|Kernel|EventLog|Application Error|Application Hang" } |
  Sort-Object TimeGenerated | Select-Object -Last 40 | ForEach-Object {
    $m = ($_.Message -replace "\s+", " ")
    if ($m.Length -gt 300) { $m = $m.Substring(0, 300) }
    Tulis ("{0} [{1}] {2} {3}" -f $_.TimeGenerated, $_.SourceName, $_.ProductName, $m)
  }

Judul "Crash dump files"
Get-ChildItem "$env:SystemRoot\Minidump" | Sort-Object LastWriteTime | ForEach-Object { Tulis ("{0:yyyy-MM-dd HH:mm:ss} {1}" -f $_.LastWriteTime, $_.Name) }
Get-ChildItem "$env:LOCALAPPDATA\CrashDumps" | Where-Object { $_.Name -match "Chudai|msedgewebview2" } | ForEach-Object { Tulis ("{0:yyyy-MM-dd HH:mm:ss} {1}" -f $_.LastWriteTime, $_.Name) }

Judul "CAM crash log"
$log = Join-Path $env:APPDATA "RobloxAccountManager\crash.log"
if (Test-Path $log) { Get-Content $log -Tail 40 | ForEach-Object { Tulis $_ } } else { Tulis "(none)" }

