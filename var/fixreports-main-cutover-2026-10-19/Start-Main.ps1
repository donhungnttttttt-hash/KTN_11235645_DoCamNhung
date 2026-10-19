$ErrorActionPreference='Stop'
$repoRoot=(Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$before=Get-Content -LiteralPath (Join-Path $PSScriptRoot 'main-before-proof.json') -Raw | ConvertFrom-Json
if($before.status -ne 'PASS'){throw 'Stopped-writer preservation proof required'}
if(Test-Path -LiteralPath (Join-Path $PSScriptRoot 'main-launch.json')){throw 'Launch journal already exists; refusing duplicate startup'}
if(@(Get-NetTCPConnection -State Listen -LocalPort 8080 -ErrorAction SilentlyContinue).Count -ne 0){throw '8080 occupied; refusing duplicate startup'}
$env:TMS_PORT='8080'
$env:TMS_BIND_ADDRESS='127.0.0.1'
$env:TMS_LOCAL_CONFIG_FILE=Join-Path $repoRoot '.env.mysql.local'
$launcher=Start-Process -FilePath 'powershell.exe' -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-File',(Join-Path $repoRoot 'scripts/Start-Backend.ps1')) -WorkingDirectory $repoRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $PSScriptRoot 'main-backend.log') -RedirectStandardError (Join-Path $PSScriptRoot 'main-backend.err.log') -PassThru
$proof=[ordered]@{launchedAt=[DateTime]::UtcNow.ToString('o');launcherPid=$launcher.Id;port=8080;workflow='scripts/Start-Backend.ps1';schema='tms';profile='local';aiConfig='Existing local config imported by standard workflow';testFixturesAdded=$false}
$proof|ConvertTo-Json|Set-Content -LiteralPath (Join-Path $PSScriptRoot 'main-launch.json') -Encoding UTF8
$proof|ConvertTo-Json
