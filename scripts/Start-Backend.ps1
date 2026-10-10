param([switch]$DebugLogging, [switch]$LegacyDocker)
$ErrorActionPreference = 'Stop'
# An unrelated inherited DEBUG=release also enables Spring Boot debug mode.
# Keep SQL/framework diagnostics opt-in; never trace request bodies/credentials.
$env:DEBUG = $DebugLogging.IsPresent.ToString().ToLowerInvariant()
$env:TRACE = 'false'
$taskRoot = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $taskRoot '.env.mysql.local'
if($LegacyDocker){$envFile=Join-Path $taskRoot '.env'}
if (!(Test-Path -LiteralPath $envFile)) { throw 'Native configuration missing. Run scripts/Initialize-NativeMySql.ps1; use -LegacyDocker only for the previous container database.' }
$env:TMS_MYSQL_HOST='127.0.0.1';$env:TMS_DB_NAME='tms'
$env:TMS_DB_USER='tms_app';$env:TMS_MIGRATION_USER='tms_migrator'
$env:TMS_REDMINE_ENABLED='false'
foreach ($line in [IO.File]::ReadAllLines($envFile)) {
    if ($line -match '^(TMS_MYSQL_HOST|TMS_DB_NAME|TMS_DB_USER|TMS_MIGRATION_USER|TMS_DB_PASSWORD|TMS_MIGRATION_PASSWORD|TMS_MYSQL_PORT|TMS_BOOTSTRAP_ENABLED|TMS_BOOTSTRAP_USERNAME|TMS_BOOTSTRAP_PASSWORD|TMS_BOOTSTRAP_DISPLAY_NAME|TMS_SESSION_TIMEOUT)=(.+)$') {
        [Environment]::SetEnvironmentVariable($Matches[1], $Matches[2], 'Process')
    }
}
$env:SPRING_PROFILES_ACTIVE = 'local'
if($env:TMS_MYSQL_HOST -notin @('127.0.0.1','localhost') -or $env:TMS_MYSQL_PORT -notmatch '^\d+$' -or [int]$env:TMS_MYSQL_PORT -lt 1 -or [int]$env:TMS_MYSQL_PORT -gt 65535 -or $env:TMS_DB_NAME -notmatch '^[A-Za-z0-9_]+$'){throw 'Invalid local MySQL host, port or schema.'}
$env:TMS_DB_URL = "jdbc:mysql://$($env:TMS_MYSQL_HOST):$($env:TMS_MYSQL_PORT)/$($env:TMS_DB_NAME)?connectionTimeZone=UTC&forceConnectionTimeZoneToSession=true&allowPublicKeyRetrieval=true&sslMode=DISABLED"
Write-Output "Backend database target: $($env:TMS_MYSQL_HOST):$($env:TMS_MYSQL_PORT)/$($env:TMS_DB_NAME)"
$redmineState = Join-Path $taskRoot '.env.redmine-state.local'
if ($LegacyDocker -and (Test-Path -LiteralPath $redmineState)) {
    foreach ($line in [IO.File]::ReadAllLines($redmineState)) {
        if ($line -match '^(TMS_REDMINE_ENABLED|TMS_REDMINE_BASE_URL|TMS_REDMINE_API_KEY|TMS_REDMINE_MAPPING_FILE)=(.+)$') {
            [Environment]::SetEnvironmentVariable($Matches[1], $Matches[2], 'Process')
        }
    }
}
Push-Location (Join-Path $taskRoot 'Backend')
try {
    & rtk proxy .\mvnw.cmd -B -ntp spring-boot:run
    exit $LASTEXITCODE
} finally { Pop-Location }
