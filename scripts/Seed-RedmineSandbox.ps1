$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$configFile = Join-Path $taskRoot '.env.redmine.local'
$composeFile = Join-Path $taskRoot 'compose.redmine.yaml'
if (!(Test-Path -LiteralPath $configFile)) { throw 'Run Initialize-RedmineSandbox.ps1 first.' }
$previousPreference = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
try {
    $seedOutput = & docker compose --env-file $configFile -f $composeFile exec -T redmine bundle exec rails runner /opt/tms-seed/seed.rb 2>&1
    $seedExitCode = $LASTEXITCODE
} finally { $ErrorActionPreference = $previousPreference }
if ($seedExitCode -ne 0) {
    # Raw output could contain sensitive values from a failed model validation.
    throw 'Sandbox seed failed. Inspect the local container with credentials redacted; no output was printed.'
}
$resultLine = $seedOutput | ForEach-Object { $_.ToString() } | Where-Object { $_.StartsWith('TMS_SEED_RESULT=') } | Select-Object -Last 1
if (!$resultLine) { throw 'Seed returned no structured result; credentials were not changed in the local state file.' }
$result = $resultLine.Substring('TMS_SEED_RESULT='.Length) | ConvertFrom-Json
$portLine = [IO.File]::ReadAllLines($configFile) | Where-Object { $_ -match '^RDM_PORT=' } | Select-Object -First 1
$port = if ($portLine) { $portLine.Split('=')[1] } else { '3080' }
$statePath = Join-Path $taskRoot '.env.redmine-state.local'
$state = @(
    'TMS_REDMINE_ENABLED=true',
    "TMS_REDMINE_BASE_URL=http://127.0.0.1:$port",
    "TMS_REDMINE_API_KEY=$($result.apiKey)",
    "TMS_REDMINE_SANDBOX_PROJECT_ID=$($result.projectId)",
    "TMS_REDMINE_SANDBOX_TRACKER_ID=$($result.trackerId)",
    "TMS_REDMINE_SANDBOX_CORRELATION_FIELD_ID=$($result.correlationFieldId)",
    "TMS_REDMINE_SANDBOX_STATUSES=$($result.statuses | ConvertTo-Json -Compress)",
    "TMS_REDMINE_SANDBOX_PRIORITIES=$($result.priorities | ConvertTo-Json -Compress)"
)
$mappingPath = Join-Path $taskRoot 'var/redmine/tms-mapping.json'
if (Test-Path -LiteralPath $mappingPath) { $state += "TMS_REDMINE_MAPPING_FILE=$mappingPath" }
[IO.File]::WriteAllLines($statePath, $state, (New-Object Text.UTF8Encoding $false))
Write-Output "Redmine $($result.version) sandbox ready; project $($result.projectId), tracker $($result.trackerId), 10 statuses. Credentials kept in ignored local state."
