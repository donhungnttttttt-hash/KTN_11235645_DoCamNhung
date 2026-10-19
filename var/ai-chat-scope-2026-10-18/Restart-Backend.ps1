$ErrorActionPreference='Stop'
$taskRoot='D:\DCN\KTN_11235645_DoCamNhung'
$artifactDirectory=Join-Path $taskRoot 'var\ai-chat-scope-2026-10-18'
$runtimeProcess=Get-CimInstance Win32_Process -Filter 'ProcessId=26956'
$listeners=@(Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue)
if($null -eq $runtimeProcess -or $runtimeProcess.Name -ne 'java.exe' -or $runtimeProcess.CommandLine -notmatch 'vn\.syp\.tms\.TmsApplication' -or $listeners.Count -ne 1 -or $listeners[0].OwningProcess -ne $runtimeProcess.ProcessId){throw 'Verified TMS process changed; inspect before restarting.'}
Stop-Process -Id $runtimeProcess.ProcessId -ErrorAction Stop
$stopDeadline=[DateTime]::UtcNow.AddSeconds(10)
while(@(Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue).Count -gt 0 -and [DateTime]::UtcNow -lt $stopDeadline){Start-Sleep -Milliseconds 200}
if(@(Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue).Count -gt 0){throw 'Port 8080 remains occupied.'}
$rtkExecutable=(Get-Command rtk -CommandType Application).Source
$launcherProcess=Start-Process -FilePath $rtkExecutable -ArgumentList @('proxy','powershell','-NoProfile','-File','scripts/Start-Backend.ps1') -WorkingDirectory $taskRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $artifactDirectory 'backend.out.log') -RedirectStandardError (Join-Path $artifactDirectory 'backend.err.log') -PassThru
[pscustomobject]@{StoppedTmsPid=$runtimeProcess.ProcessId;LauncherPid=$launcherProcess.Id;StartedAtUtc=[DateTime]::UtcNow.ToString('o')}|ConvertTo-Json|Set-Content -LiteralPath (Join-Path $artifactDirectory 'runtime.json') -Encoding UTF8
Write-Output ('TMS restart requested; launcher PID '+$launcherProcess.Id)
