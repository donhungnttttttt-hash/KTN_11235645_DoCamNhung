param([int]$ExpectedPid=25696,[ValidatePattern('^[a-z-]+$')][string]$RunName='backend')
$ErrorActionPreference='Stop'
$repoRoot=(Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$baseline=Get-Content -LiteralPath (Join-Path $PSScriptRoot 'baseline.json') -Raw | ConvertFrom-Json
foreach($entry in $baseline.files.PSObject.Properties | Where-Object Name -like 'Backend/src/main/resources/db/migration/*') {
  if((Get-FileHash -LiteralPath (Join-Path $repoRoot $entry.Name) -Algorithm SHA256).Hash.ToLowerInvariant() -ne $entry.Value){throw 'Migration changed: refusing restart'}
}
$listeners=@(Get-NetTCPConnection -LocalPort 8080 -State Listen)
if($listeners.Count -ne 1 -or $listeners[0].LocalAddress -ne '127.0.0.1'){throw 'Expected one loopback8080 listener'}
$targetProcess=Get-CimInstance Win32_Process -Filter ('ProcessId='+$listeners[0].OwningProcess)
$parentProcess=Get-CimInstance Win32_Process -Filter ('ProcessId='+$targetProcess.ParentProcessId)
if($targetProcess.ProcessId -ne $ExpectedPid -or $targetProcess.Name -ne 'java.exe' -or !$targetProcess.CommandLine.Contains('vn.syp.tms.TmsApplication') -or !$targetProcess.CommandLine.Contains('spring.profiles.active=local') -or !$parentProcess.CommandLine.Contains($repoRoot)){throw 'Main backend identity changed'}
if(Test-Path -LiteralPath (Join-Path $PSScriptRoot ($RunName+'-restart.json'))){throw 'Restart journal already exists'}
$otherListeners=@(Get-NetTCPConnection -State Listen | Where-Object LocalPort -in @(5173,5174,8081) | Select-Object LocalPort,OwningProcess)
$configHash=(Get-FileHash -LiteralPath (Join-Path $repoRoot '.env.mysql.local') -Algorithm SHA256).Hash
Stop-Process -Id $targetProcess.ProcessId
Wait-Process -Id $targetProcess.ProcessId -Timeout 15 -ErrorAction SilentlyContinue
if(@(Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue).Count){throw '8080 still occupied'}
$env:TMS_PORT='8080';$env:TMS_BIND_ADDRESS='127.0.0.1';$env:TMS_LOCAL_CONFIG_FILE=Join-Path $repoRoot '.env.mysql.local'
$launcher=Start-Process -FilePath 'powershell.exe' -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-File',(Join-Path $repoRoot 'scripts/Start-Backend.ps1')) -WorkingDirectory $repoRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $PSScriptRoot ($RunName+'.log')) -RedirectStandardError (Join-Path $PSScriptRoot ($RunName+'.err.log')) -PassThru
$result=[ordered]@{at=[DateTime]::UtcNow.ToString('o');stoppedPid=$targetProcess.ProcessId;launcherPid=$launcher.Id;port=8080;purpose='Load verified management report AI output contract fix';migrationFilesUnchanged=$true;configurationHash=$configHash;otherListeners=$otherListeners}
$result|ConvertTo-Json -Depth 5|Set-Content -LiteralPath (Join-Path $PSScriptRoot ($RunName+'-restart.json')) -Encoding UTF8
$result|ConvertTo-Json -Depth 5
