$ErrorActionPreference='Stop'
$repoRoot=(Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$old=Get-Content -LiteralPath (Join-Path $PSScriptRoot 'main-stopped.json') -Raw | ConvertFrom-Json
$listener=@(Get-NetTCPConnection -State Listen -LocalAddress '127.0.0.1' -LocalPort 8080)
if($listener.Count -ne 1){throw 'Expected one main backend listener'}
$actual=Get-CimInstance Win32_Process -Filter ('ProcessId='+$listener[0].OwningProcess)
$parent=Get-CimInstance Win32_Process -Filter ('ProcessId='+$actual.ParentProcessId)
if($actual.Name -ne 'java.exe' -or !$actual.CommandLine.Contains('vn.syp.tms.TmsApplication') -or !$actual.CommandLine.Contains('spring.profiles.active=local') -or $null -eq $parent -or !$parent.CommandLine.Contains($repoRoot) -or $actual.ProcessId -eq $old.stoppedPid){throw 'Unexpected final main process identity'}
foreach($other in $old.otherListenersUnchanged){if(!(Get-NetTCPConnection -State Listen -LocalPort $other.LocalPort|Where-Object OwningProcess -eq $other.OwningProcess)){throw 'Unrelated listener differs'}}
$logStream=[IO.File]::Open((Join-Path $PSScriptRoot 'main-backend.log'),[IO.FileMode]::Open,[IO.FileAccess]::Read,[IO.FileShare]::ReadWrite)
$reader=New-Object IO.StreamReader($logStream)
try{$log=$reader.ReadToEnd()}finally{$reader.Dispose();$logStream.Dispose()}
if(!$log.Contains('Started TmsApplication') -or !$log.Contains('Successfully applied 3 migrations') -or $log.Contains(' ERROR ')){throw 'Expected clean successful startup/migration log'}
$health=Invoke-RestMethod -Uri 'http://127.0.0.1:8080/actuator/health' -TimeoutSec 5
if($health.status -ne 'UP'){throw 'Main not UP'}
$proof=[ordered]@{checkedAt=[DateTime]::UtcNow.ToString('o');status='PASS';pid=$actual.ProcessId;previousPid=$old.stoppedPid;port=8080;workspaceVerified=$true;profile='local';health='UP';migrationsApplied=@(31,32,33);startupErrors=0;otherListenerPidsUnchanged=$true;otherListeners=$old.otherListenersUnchanged}
$proof|ConvertTo-Json -Depth 5|Set-Content -LiteralPath (Join-Path $PSScriptRoot 'main-runtime-final.json') -Encoding UTF8
$proof|ConvertTo-Json -Depth 5
