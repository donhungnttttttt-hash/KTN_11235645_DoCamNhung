param([ValidateSet('Stop','Start')][string]$Action)
$ErrorActionPreference='Stop'
$taskRoot='D:\DCN\KTN_11235645_DoCamNhung'
$owners=@(Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique)
if($Action -eq 'Stop') {
 foreach($owner in $owners) {
  $proc=Get-CimInstance Win32_Process -Filter ('ProcessId='+$owner)
  $isTms=$proc.Name -eq 'java.exe' -and ($proc.CommandLine -match 'vn.syp.tms.TmsApplication|tms-backend' -or $proc.CommandLine.Contains($taskRoot+'\Backend\var\runtime\tms-'))
  if(!$isTms -and $proc.CommandLine -match '@"?([^" ]+\.argfile)') {
   $argFile=$Matches[1]
   if(Test-Path -LiteralPath $argFile){$argText=[IO.File]::ReadAllText($argFile);$isTms=$argText -match 'KTN_11235645_DoCamNhung' -and $argText -match 'vn.syp.tms.TmsApplication|Backend.target.classes'}
  }
  if(!$isTms){throw '8080 is not a verified TMS Java process; not stopping.'}
  Stop-Process -Id $owner
  Wait-Process -Id $owner -Timeout 15 -ErrorAction SilentlyContinue
  Write-Output "Stopped verified TMS backend PID $owner for backup and V22 migration."
 }
} elseif($Action -eq 'Start') {
 if($owners.Count){throw 'Port 8080 already has a listener.'}
 Start-Process -FilePath 'powershell.exe' -WindowStyle Hidden -WorkingDirectory $taskRoot -ArgumentList @('-NoProfile','-File',(Join-Path $taskRoot 'scripts/Start-Backend.ps1')) -RedirectStandardOutput (Join-Path $taskRoot 'var/scale-main-backend.log') -RedirectStandardError (Join-Path $taskRoot 'var/scale-main-backend-error.log') | Out-Null
 Write-Output 'Started main backend with local Flyway; readiness pending.'
}
