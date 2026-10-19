$ErrorActionPreference='Stop'
$taskRoot='D:\DCN\KTN_11235645_DoCamNhung'
foreach($port in @(18080,15173)) { if(Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue){throw 'Preview port already used; do not replace an unknown process.'} }
foreach($line in [IO.File]::ReadAllLines((Join-Path $taskRoot '.env.mysql.local'))) {
 if($line -match '^(TMS_DB_USER|TMS_DB_PASSWORD|TMS_MIGRATION_USER|TMS_MIGRATION_PASSWORD|TMS_MYSQL_PORT)=(.+)$'){[Environment]::SetEnvironmentVariable($Matches[1],$Matches[2],'Process')}
}
if($env:TMS_MYSQL_PORT -ne '3307'){throw 'Unexpected native MySQL port'}
$env:TMS_DB_URL='jdbc:mysql://127.0.0.1:3307/tms_docstest_202610080025?connectionTimeZone=UTC&forceConnectionTimeZoneToSession=true&allowPublicKeyRetrieval=true&sslMode=DISABLED'
$env:TMS_LOCAL_CONFIG_FILE='nonexistent-scale-preview.properties'
$env:TMS_BOOTSTRAP_ENABLED='false';$env:TMS_REDMINE_ENABLED='false';$env:DEBUG='false';$env:TRACE='false'
$previewJar=Join-Path $taskRoot 'Backend/var/runtime/tms-scale-v22.jar'
Copy-Item -LiteralPath (Join-Path $taskRoot 'Backend/target/tms-backend-0.1.0-SNAPSHOT.jar') -Destination $previewJar
$server=Start-Process -FilePath 'java.exe' -WindowStyle Hidden -WorkingDirectory (Join-Path $taskRoot 'Backend') -ArgumentList @('-jar',$previewJar,'--spring.profiles.active=local','--server.port=18080') -RedirectStandardOutput (Join-Path $taskRoot 'var/scale-preview-backend.log') -RedirectStandardError (Join-Path $taskRoot 'var/scale-preview-backend-error.log') -PassThru
$front=Start-Process -FilePath 'powershell.exe' -WindowStyle Hidden -WorkingDirectory $taskRoot -ArgumentList @('-NoProfile','-File',(Join-Path $taskRoot 'var/start-scale-frontend.ps1')) -RedirectStandardOutput (Join-Path $taskRoot 'var/scale-preview-frontend.log') -RedirectStandardError (Join-Path $taskRoot 'var/scale-preview-frontend-error.log') -PassThru
[pscustomobject]@{backend=$server.Id;frontendLauncher=$front.Id;schema='tms_docstest_202610080025'} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $taskRoot 'var/scale-preview-processes.json')
Write-Output 'Started isolated V22 preview on 18080/15173; readiness pending.'
