$ErrorActionPreference='Stop'
$taskRoot='D:\DCN\KTN_11235645_DoCamNhung'
$listener=Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if($listener) {
  $taskProcess=Get-CimInstance Win32_Process -Filter "ProcessId=$($listener.OwningProcess)"
  $argFile=[regex]::Match($taskProcess.CommandLine,'@([^\s"]+)').Groups[1].Value
  $owned=$taskProcess.CommandLine.Contains($taskRoot)
  if(!$owned -and $argFile -and (Test-Path -LiteralPath $argFile)) {$owned=(([IO.File]::ReadAllText($argFile) -replace '[\\/]+','/').ToLowerInvariant()).Contains(($taskRoot -replace '[\\/]+','/').ToLowerInvariant())}
  if($taskProcess.Name -ne 'java.exe' -or !$owned -or !$taskProcess.CommandLine.Contains('TmsApplication')) { throw 'Port 8080 is not the verified workspace backend.' }
  Stop-Process -Id $taskProcess.ProcessId
  Write-Output "Stopped workspace backend PID $($taskProcess.ProcessId)"
}
$taskServer=Start-Process powershell.exe -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-File',"$taskRoot\scripts\Start-Backend.ps1" -WorkingDirectory $taskRoot -WindowStyle Hidden -RedirectStandardOutput "$taskRoot\var\ui-audit\document-backend.log" -RedirectStandardError "$taskRoot\var\ui-audit\document-backend.err" -PassThru
Write-Output "Started local backend helper PID $($taskServer.Id)"
