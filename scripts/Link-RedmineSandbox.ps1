param([Parameter(Mandatory=$true)][ValidateRange(1,2147483647)][int]$ProjectId)
$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$statePath = Join-Path $taskRoot '.env.redmine-state.local'
if (!(Test-Path -LiteralPath $statePath)) { throw 'Run Seed-RedmineSandbox.ps1 first.' }
$redmineState = @{}
foreach ($line in [IO.File]::ReadAllLines($statePath)) {
    if ($line -match '^([A-Z0-9_]+)=(.*)$') { $redmineState[$Matches[1]] = $Matches[2] }
}
if ($redmineState.TMS_REDMINE_BASE_URL -ne 'http://127.0.0.1:3080') { throw 'This helper only accepts the isolated local sandbox on port 3080.' }
$mappingPath = Join-Path $taskRoot 'var/redmine/tms-mapping.json'
$projectMappings = @{}
if (Test-Path -LiteralPath $mappingPath) {
    $existing = Get-Content -Raw -Encoding UTF8 -LiteralPath $mappingPath | ConvertFrom-Json
    foreach ($entry in $existing.PSObject.Properties) { $projectMappings[$entry.Name] = $entry.Value }
}
$projectMappings[[string]$ProjectId] = @{
    externalProjectId = [long]$redmineState.TMS_REDMINE_SANDBOX_PROJECT_ID
    trackerId = [long]$redmineState.TMS_REDMINE_SANDBOX_TRACKER_ID
    correlationFieldId = [long]$redmineState.TMS_REDMINE_SANDBOX_CORRELATION_FIELD_ID
    statuses = $redmineState.TMS_REDMINE_SANDBOX_STATUSES | ConvertFrom-Json
    priorities = $redmineState.TMS_REDMINE_SANDBOX_PRIORITIES | ConvertFrom-Json
}
[IO.File]::WriteAllText($mappingPath, ($projectMappings | ConvertTo-Json -Depth 8), [Text.UTF8Encoding]::new($false))
$lines = @([IO.File]::ReadAllLines($statePath) | Where-Object { $_ -notmatch '^TMS_REDMINE_MAPPING_FILE=' })
$lines += "TMS_REDMINE_MAPPING_FILE=$mappingPath"
[IO.File]::WriteAllLines($statePath, $lines, [Text.UTF8Encoding]::new($false))
Write-Output "Local Redmine mapping saved for TMS project $ProjectId. Restart the backend to load it. No ticket was sent."
