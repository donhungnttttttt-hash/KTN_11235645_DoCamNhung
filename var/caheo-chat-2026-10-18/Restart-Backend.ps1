$ErrorActionPreference = 'Stop'
$taskRoot = 'D:\DCN\KTN_11235645_DoCamNhung'
$artifactDirectory = Join-Path $taskRoot 'var\caheo-chat-2026-10-18'
$backendProcess = Get-CimInstance Win32_Process -Filter 'ProcessId=27440'
if ($null -eq $backendProcess -or $backendProcess.Name -ne 'java.exe' -or $backendProcess.CommandLine -notmatch 'vn\.syp\.tms\.TmsApplication') {
    throw 'The previously verified TMS backend changed; inspect again.'
}
$ownedListeners = @(Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue)
if ($ownedListeners.Count -ne 1 -or $ownedListeners[0].OwningProcess -ne $backendProcess.ProcessId) {
    throw 'Port 8080 ownership changed; refusing to stop another process.'
}
Stop-Process -Id $backendProcess.ProcessId -ErrorAction Stop
$stopDeadline = [DateTime]::UtcNow.AddSeconds(10)
while (@(Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue).Count -gt 0 -and [DateTime]::UtcNow -lt $stopDeadline) {
    Start-Sleep -Milliseconds 200
}
if (@(Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue).Count -gt 0) {
    throw 'Port 8080 remains occupied; no new backend was started.'
}
$rtkExecutable = (Get-Command rtk -CommandType Application).Source
$newRuntime = Start-Process -FilePath $rtkExecutable -ArgumentList @('proxy', 'powershell', '-NoProfile', '-File', 'scripts/Start-Backend.ps1') -WorkingDirectory $taskRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $artifactDirectory 'backend.out.log') -RedirectStandardError (Join-Path $artifactDirectory 'backend.err.log') -PassThru
[pscustomobject]@{ StoppedTmsPid = $backendProcess.ProcessId; LauncherPid = $newRuntime.Id; StartedAtUtc = [DateTime]::UtcNow.ToString('o') } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $artifactDirectory 'runtime.json') -Encoding UTF8
Write-Output ('TMS chat fix restart requested; launcher PID ' + $newRuntime.Id)
