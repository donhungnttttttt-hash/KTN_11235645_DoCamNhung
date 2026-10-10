$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$config = @{}
foreach ($line in [IO.File]::ReadAllLines((Join-Path $taskRoot '.env.redmine-state.local'))) {
    if ($line -match '^([^=]+)=(.*)$') { $config[$Matches[1]]=$Matches[2] }
}
$base = $config.TMS_REDMINE_BASE_URL
if (([Uri]$base).Host -ne '127.0.0.1') { throw 'This script only tests the local sandbox.' }
$headers = @{ 'X-Redmine-API-Key'=$config.TMS_REDMINE_API_KEY }
$projectId = [int]$config.TMS_REDMINE_SANDBOX_PROJECT_ID
$trackerId = [int]$config.TMS_REDMINE_SANDBOX_TRACKER_ID
$fieldId = [int]$config.TMS_REDMINE_SANDBOX_CORRELATION_FIELD_ID
$statuses = $config.TMS_REDMINE_SANDBOX_STATUSES | ConvertFrom-Json
$priorities = $config.TMS_REDMINE_SANDBOX_PRIORITIES | ConvertFrom-Json
function Read-Sandbox($path) { Invoke-RestMethod -Uri "$base$path" -Headers $headers -TimeoutSec 10 }
function Send-Sandbox($method,$path,$body) {
    Invoke-RestMethod -Method $method -Uri "$base$path" -Headers $headers -TimeoutSec 10 -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes(($body | ConvertTo-Json -Depth 10 -Compress)))
}
$project = (Read-Sandbox "/projects/$projectId.json?include=trackers").project
if ($project.identifier -ne 'tms-sandbox' -or $project.is_public) { throw 'Unexpected sandbox project.' }
$remoteStatuses = (Read-Sandbox '/issue_statuses.json').issue_statuses
foreach ($status in $statuses.PSObject.Properties) {
    if (!($remoteStatuses | Where-Object id -eq $status.Value)) { throw "Missing mapped status $($status.Name)." }
}
$remotePriorities = (Read-Sandbox '/enumerations/issue_priorities.json').issue_priorities
foreach ($priority in $priorities.PSObject.Properties) {
    if (!($remotePriorities | Where-Object id -eq $priority.Value)) { throw "Missing mapped priority $($priority.Name)." }
}
$statePath = Join-Path $taskRoot 'var/redmine/api-smoke.json'
if (Test-Path -LiteralPath $statePath) { $smoke=Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json }
else { $smoke=[pscustomobject]@{ marker=[Guid]::NewGuid().ToString(); createAttempted=$false; issueId=$null } }
function Save-Smoke { [IO.File]::WriteAllText($statePath, ($smoke | ConvertTo-Json), (New-Object Text.UTF8Encoding $false)) }
Save-Smoke
$search="/issues.json?project_id=$projectId&status_id=*&cf_${fieldId}=$($smoke.marker)&limit=2"
$found=Read-Sandbox $search
if ($found.total_count -gt 1) { throw 'Duplicate marker in sandbox; inspect without creating another ticket.' }
if ($found.total_count -eq 0) {
    if ($smoke.createAttempted) { throw 'Previous CREATE outcome is unknown; reconcile before retrying.' }
    $smoke.createAttempted=$true; Save-Smoke
    $created=Send-Sandbox 'Post' '/issues.json' @{ issue=@{
        project_id=$projectId; tracker_id=$trackerId; status_id=$statuses.open; priority_id=$priorities.MEDIUM
        subject='[TMS S09 SMOKE] Kiểm chứng API nội bộ'
        description="Dữ liệu thử sandbox; không phải lỗi khách hàng.`nMã đối chiếu: $($smoke.marker)"
        is_private=$true; custom_fields=@(@{id=$fieldId;value=$smoke.marker})
    }}
    $smoke.issueId=$created.issue.id; Save-Smoke
} else { $smoke.issueId=$found.issues[0].id; Save-Smoke }
$remote=(Read-Sandbox "/issues/$($smoke.issueId).json?include=allowed_statuses").issue
if ($remote.project.id -ne $projectId -or ($remote.custom_fields | Where-Object id -eq $fieldId).value -ne $smoke.marker) { throw 'Returned issue does not match the sandbox marker/project.' }
$null=Send-Sandbox 'Put' "/issues/$($smoke.issueId).json" @{issue=@{status_id=$statuses.resolved;is_private=$true}}
$updated=(Read-Sandbox "/issues/$($smoke.issueId).json").issue
if ($updated.status.id -ne $statuses.resolved) { throw 'Sandbox workflow rejected the mapped resolved status.' }
if (!$updated.is_private) { throw 'Sandbox service role cannot preserve private issues; check the own-issue privacy permission.' }
$found=Read-Sandbox $search
if ($found.total_count -ne 1) { throw 'Expected exactly one issue for the stable marker.' }
$forbidden=$false
try { $null=Read-Sandbox '/users.json' } catch { $forbidden=([int]$_.Exception.Response.StatusCode -eq 403) }
if (!$forbidden) { throw 'Integration account unexpectedly has user administration access.' }
Write-Output "PASS: Redmine local project $projectId, 10 statuses, 3 priorities, private issue #$($smoke.issueId), CREATE/read/UPDATE/custom-field filter; stable marker finds exactly one ticket; user admin API denied."
