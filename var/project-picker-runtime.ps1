$ErrorActionPreference='Stop'
$taskRoot='D:\DCN\KTN_11235645_DoCamNhung'
$owners=@(Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique)
foreach($owner in $owners) {
 $proc=Get-CimInstance Win32_Process -Filter ('ProcessId='+$owner)
 if($proc.Name -ne 'java.exe' -or $proc.CommandLine -notmatch 'vn.syp.tms.TmsApplication'){throw 'Port 8080 is not the verified TMS Java application.'}
 if($proc.CommandLine -notmatch '@"?([^" ]+\.argfile)'){throw 'Expected local Spring classpath argument file.'}
 $argText=[IO.File]::ReadAllText($Matches[1]).Replace('\\','\').Replace('/','\')
 if(!$argText.Contains($taskRoot+'\Backend\target\classes')){throw 'Classpath is outside this repository.'}
 Stop-Process -Id $owner
 Wait-Process -Id $owner -Timeout 15 -ErrorAction SilentlyContinue
 Write-Output "Stopped verified TMS PID $owner."
}
if(Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue){throw '8080 still occupied.'}
Start-Process -FilePath 'powershell.exe' -WindowStyle Hidden -WorkingDirectory $taskRoot -ArgumentList @('-NoProfile','-File',(Join-Path $taskRoot 'scripts/Start-Backend.ps1')) -RedirectStandardOutput (Join-Path $taskRoot 'var/project-picker-backend.log') -RedirectStandardError (Join-Path $taskRoot 'var/project-picker-backend-error.log') | Out-Null
Write-Output 'Started updated backend; readiness check pending.'
