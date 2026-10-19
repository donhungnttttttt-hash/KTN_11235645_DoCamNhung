$ErrorActionPreference = 'Stop'
$taskRoot = 'D:\DCN\KTN_11235645_DoCamNhung'
$listener = Get-NetTCPConnection -LocalPort 8080 -State Listen | Select-Object -First 1
$backendProcess = Get-CimInstance Win32_Process -Filter "ProcessId=$($listener.OwningProcess)"
if ($backendProcess.Name -ne 'java.exe' -or $backendProcess.CommandLine -notmatch 'vn\.syp\.tms\.TmsApplication') { throw 'Port 8080 is not the expected local TMS backend.' }
Stop-Process -Id $backendProcess.ProcessId
$started = Start-Process powershell.exe -WindowStyle Hidden -WorkingDirectory $taskRoot -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-File',"$taskRoot\scripts\Start-Backend.ps1" -RedirectStandardOutput "$taskRoot\var\ui-audit\deep-backend.log" -RedirectStandardError "$taskRoot\var\ui-audit\deep-backend.err" -PassThru
Write-Output "Local TMS restart launcher PID $($started.Id)"
