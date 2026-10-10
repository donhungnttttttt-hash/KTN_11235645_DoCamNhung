param(
    [ValidateRange(1,65535)][int]$Port = 3307,
    [ValidatePattern('^[a-zA-Z0-9_]+$')][string]$AdminUser = 'root',
    [string]$MySqlClient = 'C:\Program Files\MySQL\MySQL Server 9.7\bin\mysql.exe',
    [string]$ImportDumpPath,
    [switch]$PlanOnly
)
$ErrorActionPreference='Stop'
$taskRoot=Split-Path -Parent $PSScriptRoot
$client=(Resolve-Path -LiteralPath $MySqlClient).Path
$jar=Join-Path $taskRoot 'Backend/target/tms-backend-0.1.0-SNAPSHOT.jar'
$configuration=Join-Path $taskRoot '.env.mysql.local'
$state=Join-Path $taskRoot 'var/mysql-native'
if($PlanOnly){
    Write-Output "Native MySQL target: 127.0.0.1:$Port / tms; admin: $AdminUser"
    Write-Output "Client: $client"
    Write-Output 'Plan: verify admin, refuse existing schema/accounts, create tms and scoped accounts, import optional dump, run Flyway, verify 56 tables/V12, save local configuration.'
    Write-Output 'No server mutation, config write or password prompt in PlanOnly.'
    exit 0
}
if(Test-Path -LiteralPath $configuration){throw 'Native configuration already exists; preserve it and use Start-Backend.ps1. Do not reinitialize.'}
if(Test-Path -LiteralPath (Join-Path $state 'pending.env')){throw 'A previous initialization has a pending checkpoint. Inspect native schema and var/mysql-native locally before resuming; do not delete/retry blindly.'}
if(!(Test-Path -LiteralPath $jar)){throw 'Build the backend first: cd Backend; rtk proxy .\mvnw.cmd -B -ntp -DskipTests package'}
if($ImportDumpPath){$ImportDumpPath=(Resolve-Path -LiteralPath $ImportDumpPath).Path;if([IO.Path]::GetExtension($ImportDumpPath) -ne '.sql'){throw 'Import must be an explicitly selected local .sql backup.'}}
function Invoke-NativeSql([string]$Sql,[string]$User,[string]$Password,[switch]$UseDatabase){
    $info=[Diagnostics.ProcessStartInfo]::new()
    $info.FileName='rtk'
    $info.Arguments='proxy "'+$client+'" --no-defaults --protocol=TCP --host=127.0.0.1 --port='+$Port+' --user='+$User+' --default-character-set=utf8mb4 --batch --raw --skip-column-names --connect-timeout=5'
    if($UseDatabase){$info.Arguments+=' --database=tms'}
    $info.UseShellExecute=$false;$info.CreateNoWindow=$true
    $info.RedirectStandardInput=$true;$info.RedirectStandardOutput=$true;$info.RedirectStandardError=$true
    $info.StandardOutputEncoding=[Text.UTF8Encoding]::new($false)
    $info.EnvironmentVariables['MYSQL_PWD']=$Password
    $process=[Diagnostics.Process]::Start($info)
    try {
        $output=$process.StandardOutput.ReadToEndAsync();$errors=$process.StandardError.ReadToEndAsync()
        # Windows PowerShell 5.1 / .NET Framework lacks StandardInputEncoding.
        # Write UTF-8 bytes directly, avoiding the console codepage for SQL dumps.
        $sqlBytes=[Text.Encoding]::UTF8.GetBytes($Sql)
        $process.StandardInput.BaseStream.Write($sqlBytes,0,$sqlBytes.Length)
        $process.StandardInput.BaseStream.Flush();$process.StandardInput.Close();$process.WaitForExit()
        $safeOutput=$output.GetAwaiter().GetResult();$errorText=$errors.GetAwaiter().GetResult()
        if($process.ExitCode -ne 0){$code=[regex]::Match($errorText,'ERROR [0-9]+ \([A-Z0-9]+\)').Value;throw "Native MySQL command failed ($code). No password or SQL payload was printed. Existing data was not reset."}
        return $safeOutput.Trim()
    } finally {$process.Dispose()}
}
function New-Secret {
    $bytes=New-Object byte[] 32;$random=[Security.Cryptography.RandomNumberGenerator]::Create()
    try {$random.GetBytes($bytes);return ([BitConverter]::ToString($bytes)).Replace('-','').ToLowerInvariant()} finally {$random.Dispose()}
}
$securePassword=Read-Host "Nhap mat khau MySQL $AdminUser tai 127.0.0.1:$Port (khong phai mat khau dang nhap web)" -AsSecureString
$pointer=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
$adminPassword=$null
try {
    $adminPassword=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    $server=Invoke-NativeSql 'SELECT VERSION(),@@port;' $AdminUser $adminPassword
    Write-Output "Authenticated native MySQL: $server"
    $existing=Invoke-NativeSql "SELECT COUNT(*) FROM information_schema.SCHEMATA WHERE SCHEMA_NAME='tms';" $AdminUser $adminPassword
    if($existing -ne '0'){throw 'Schema tms already exists on this server. Refusing to overwrite or merge existing data.'}
    $users=Invoke-NativeSql "SELECT COUNT(*) FROM mysql.user WHERE User IN ('tms_app','tms_migrator','tms_viewer');" $AdminUser $adminPassword
    if($users -ne '0'){throw 'A target MySQL account already exists. Refusing to change its password or privileges.'}
    $appSecret=New-Secret;$migrationSecret=New-Secret;$viewerSecret=New-Secret
    $bootstrap=@('TMS_BOOTSTRAP_ENABLED=true','TMS_BOOTSTRAP_USERNAME=admin.local',('TMS_BOOTSTRAP_PASSWORD='+(New-Secret)),'TMS_BOOTSTRAP_DISPLAY_NAME=Admin local')
    $legacyEnv=Join-Path $taskRoot '.env'
    if(Test-Path -LiteralPath $legacyEnv){
        $prior=@([IO.File]::ReadAllLines($legacyEnv) | Where-Object {$_ -match '^TMS_BOOTSTRAP_(USERNAME|PASSWORD|DISPLAY_NAME)='})
        if(($prior | Where-Object {$_ -match '^TMS_BOOTSTRAP_PASSWORD=.+'}) -and ($prior | Where-Object {$_ -match '^TMS_BOOTSTRAP_USERNAME=.+'})){$bootstrap=@('TMS_BOOTSTRAP_ENABLED=true')+$prior}
    }
    $lines=@('TMS_MYSQL_HOST=127.0.0.1',"TMS_MYSQL_PORT=$Port",'TMS_DB_NAME=tms',"TMS_MYSQL_CLIENT=$client",'TMS_DB_USER=tms_app',"TMS_DB_PASSWORD=$appSecret",'TMS_MIGRATION_USER=tms_migrator',"TMS_MIGRATION_PASSWORD=$migrationSecret",'TMS_VIEWER_USER=tms_viewer',"TMS_VIEWER_PASSWORD=$viewerSecret",'TMS_REDMINE_ENABLED=false')+$bootstrap
    [IO.Directory]::CreateDirectory($state) | Out-Null
    $pending=Join-Path $state 'pending.env'
    [IO.File]::WriteAllLines($pending,$lines,[Text.UTF8Encoding]::new($false))
    # Random hex secrets and fixed identifiers only; user-supplied password is never interpolated into SQL.
    $sql="CREATE DATABASE tms CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;`n"
    $sql+="CREATE USER 'tms_app'@'127.0.0.1' IDENTIFIED BY '$appSecret';`nGRANT SELECT,INSERT,UPDATE,DELETE ON tms.* TO 'tms_app'@'127.0.0.1';`n"
    $sql+="CREATE USER 'tms_migrator'@'127.0.0.1' IDENTIFIED BY '$migrationSecret';`nGRANT ALL PRIVILEGES ON tms.* TO 'tms_migrator'@'127.0.0.1';`n"
    $sql+="CREATE USER 'tms_viewer'@'127.0.0.1' IDENTIFIED BY '$viewerSecret';`nGRANT SELECT,SHOW VIEW ON tms.* TO 'tms_viewer'@'127.0.0.1';`n"
    Invoke-NativeSql $sql $AdminUser $adminPassword | Out-Null
    $adminPassword=$null
    if($ImportDumpPath){
        Write-Output 'Importing selected backup into the newly created empty native tms schema...'
        Invoke-NativeSql ([IO.File]::ReadAllText($ImportDumpPath)) 'tms_migrator' $migrationSecret -UseDatabase | Out-Null
    }
    $saved=@{}
    foreach($name in @('TMS_DB_URL','TMS_MIGRATION_USER','TMS_MIGRATION_PASSWORD')){$saved[$name]=[Environment]::GetEnvironmentVariable($name,'Process')}
    try {
        $env:TMS_DB_URL="jdbc:mysql://127.0.0.1:$Port/tms?connectionTimeZone=UTC&forceConnectionTimeZoneToSession=true&allowPublicKeyRetrieval=true&sslMode=DISABLED"
        $env:TMS_MIGRATION_USER='tms_migrator';$env:TMS_MIGRATION_PASSWORD=$migrationSecret
        $migration=Start-Process -FilePath rtk -ArgumentList @('proxy','java','-jar',('"'+$jar+'"'),'--tms-migrate') -Wait -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $state 'migration.log') -RedirectStandardError (Join-Path $state 'migration-error.log')
        if($migration.ExitCode -ne 0){throw 'Flyway failed. Preserve pending.env and native database; inspect migration.log. No automatic repair or reset.'}
    } finally {foreach($name in $saved.Keys){[Environment]::SetEnvironmentVariable($name,$saved[$name],'Process')}}
    $schema=Invoke-NativeSql "SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA='tms'; SELECT CONCAT(COUNT(*),':',MAX(CAST(version AS UNSIGNED))) FROM flyway_schema_history WHERE success=1;" 'tms_app' $appSecret -UseDatabase
    if((($schema -split '\r?\n') -join ',') -ne '56,12:12'){throw 'Unexpected schema count/version. Preserve checkpoint and inspect before starting app.'}
    Invoke-NativeSql 'SELECT COUNT(*) FROM projects;' 'tms_viewer' $viewerSecret -UseDatabase | Out-Null
    [IO.File]::WriteAllLines($configuration,$lines,[Text.UTF8Encoding]::new($false))
    Move-Item -LiteralPath $pending -Destination (Join-Path $state 'completed.env')
    Write-Output 'PASS: native tms created, Flyway V12 / 56 tables verified, .env.mysql.local saved. Root password was not saved.'
    Write-Output 'Next: Start-Backend.ps1; Check-System.ps1; Audit-LocalDatabase.cjs. Workbench uses 127.0.0.1 and the port above; Show-MySqlConnection.ps1 prints the local viewer password only when explicitly requested.'
} finally {
    $adminPassword=$null;$sql=$null
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
    $securePassword.Dispose()
}
