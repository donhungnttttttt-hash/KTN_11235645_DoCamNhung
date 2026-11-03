param(
    [Parameter(Mandatory=$true)][string]$PrivateRequestFile,
    [string]$DatabaseConfigFile,
    [string]$JarPath,
    [ValidateSet('preflight','apply')][string]$Action='preflight',
    [string]$ExpectedFingerprint
)
$ErrorActionPreference='Stop'
$taskRoot=Split-Path -Parent $PSScriptRoot
if(!$DatabaseConfigFile){$DatabaseConfigFile=Join-Path $taskRoot '.env.mysql.local'}
if(!$JarPath){$JarPath=Join-Path $taskRoot 'Backend/target/tms-backend-0.1.0-SNAPSHOT.jar'}
foreach($file in @($PrivateRequestFile,$DatabaseConfigFile,$JarPath)){if(!(Test-Path -LiteralPath $file -PathType Leaf)){throw 'Required private input, database configuration or packaged backend is missing.'}}
if($Action -eq 'apply' -and $ExpectedFingerprint -notmatch '^[a-f0-9]{64}$'){throw 'Apply requires the exact fingerprint returned by preflight.'}
# Credentials are inherited only by this child process, never placed on argv.
$names=@('SPRING_PROFILES_ACTIVE','TMS_ADMIN_PROVISION_FILE','TMS_ADMIN_PROVISION_ACTION','TMS_ADMIN_PROVISION_FINGERPRINT','TMS_DB_URL','TMS_MIGRATION_USER','TMS_MIGRATION_PASSWORD')
$previous=@{};foreach($name in $names){$previous[$name]=[Environment]::GetEnvironmentVariable($name,'Process')}
try{
    $config=@{};foreach($line in [IO.File]::ReadAllLines((Resolve-Path -LiteralPath $DatabaseConfigFile))){if($line -match '^([A-Z_]+)=(.*)$'){$config[$Matches[1]]=$Matches[2]}}
    if($config.TMS_MYSQL_HOST -notin @('localhost','127.0.0.1') -or $config.TMS_MYSQL_PORT -notmatch '^\d+$' -or $config.TMS_DB_NAME -notmatch '^[A-Za-z0-9_]+$'){throw 'Expected a valid native loopback database configuration.'}
    $env:TMS_DB_URL="jdbc:mysql://$($config.TMS_MYSQL_HOST):$($config.TMS_MYSQL_PORT)/$($config.TMS_DB_NAME)?connectionTimeZone=UTC&forceConnectionTimeZoneToSession=true&allowPublicKeyRetrieval=true&sslMode=DISABLED"
    $env:TMS_MIGRATION_USER=$config.TMS_MIGRATION_USER;$env:TMS_MIGRATION_PASSWORD=$config.TMS_MIGRATION_PASSWORD
    $env:SPRING_PROFILES_ACTIVE='identity-provision';$env:TMS_ADMIN_PROVISION_FILE=(Resolve-Path -LiteralPath $PrivateRequestFile).Path
    $env:TMS_ADMIN_PROVISION_ACTION=$Action;$env:TMS_ADMIN_PROVISION_FINGERPRINT=$ExpectedFingerprint
    & rtk proxy java -jar $JarPath --tms-provision-admins
    if($LASTEXITCODE -ne 0){throw 'Offline Admin provisioning did not complete.'}
}finally{foreach($name in $names){[Environment]::SetEnvironmentVariable($name,$previous[$name],'Process')}}
