$ErrorActionPreference='Stop'
$taskRoot=(Resolve-Path '.').Path
$listener=Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue
if($listener) {
  $backendPid=$listener[0].OwningProcess
  $process=Get-CimInstance Win32_Process -Filter "ProcessId=$backendPid"
  if($process.Name -ne 'java.exe' -or $process.CommandLine -notmatch 'vn.syp.tms.TmsApplication|tms-backend') { throw 'Refusing to stop unknown listener' }
  Stop-Process -Id $backendPid
  Write-Output "Stopped old TMS backend $backendPid"
}
$proc=Start-Process powershell -ArgumentList @('-NoProfile','-File',(Join-Path $taskRoot 'scripts/Start-Backend.ps1')) -WindowStyle Hidden -WorkingDirectory $taskRoot -RedirectStandardOutput (Join-Path $taskRoot 'var/admin-excel/main-backend.log') -RedirectStandardError (Join-Path $taskRoot 'var/admin-excel/main-backend.err') -PassThru
Write-Output "Started TMS launcher $($proc.Id)"
