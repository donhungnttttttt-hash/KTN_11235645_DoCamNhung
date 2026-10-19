$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$manifestPath = Join-Path $PSScriptRoot 'isolated-runtime.json'
$runtime = Get-Content -Raw -Encoding UTF8 -LiteralPath $manifestPath | ConvertFrom-Json
if ($runtime.schema -ne 'tms_docstest_2060e04c986c' -or $runtime.backendPort -ne 8081 -or $runtime.backendPid -le 0) { throw 'Owned runtime guard mismatch' }
$owned = Get-CimInstance Win32_Process -Filter ('ProcessId=' + $runtime.backendPid)
if ($null -eq $owned -or $owned.Name -ne 'java.exe' -or -not $owned.CommandLine.Contains('--server.port=8081') -or -not $owned.CommandLine.Contains('--spring.profiles.active=fr-browser-isolated') -or -not $owned.CommandLine.Contains($repoRoot)) { throw 'PID identity mismatch; no process stopped' }
Stop-Process -Id $runtime.backendPid -ErrorAction Stop
$runtime.state = 'BACKEND_STOPPED_FOR_IMMUTABLE_JAR'
$runtime | Add-Member -NotePropertyName stoppedAt -NotePropertyValue ([DateTime]::UtcNow.ToString('o')) -Force
$runtime | ConvertTo-Json -Depth 12 | Set-Content -Encoding UTF8 -LiteralPath $manifestPath
Write-Output 'Stopped only the manifest-owned isolated backend8081; frontend and main services retained.'
