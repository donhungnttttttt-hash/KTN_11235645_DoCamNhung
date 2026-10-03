param(
    [ValidateRange(1, 65535)]
    [int]$BackendPort = 8080
)

$ErrorActionPreference = 'Stop'
$baseUrl = "http://127.0.0.1:$BackendPort"
try {
    $health = Invoke-RestMethod -Uri "$baseUrl/actuator/health/readiness" -TimeoutSec 10
    if ($health.status -ne 'UP') { throw 'Backend is not ready.' }
    $status = Invoke-RestMethod -Uri "$baseUrl/api/v1/system/status" -TimeoutSec 10
    if ($status.status -ne 'UP' -or !$status.database -or !$status.migrationVersion) {
        throw 'Invalid diagnostic response.'
    }
    Write-Output "Backend: UP ($baseUrl)"
    Write-Output "Database: $($status.database)"
    Write-Output "Flyway: V$($status.migrationVersion) ($($status.appliedMigrations) applied migration(s))"
    Write-Output 'PASS: local system is ready. Read-only check; no data was written.'
    exit 0
} catch {
    Write-Output "FAIL: cannot confirm system readiness at $baseUrl."
    if ($_.Exception.Response) {
        Write-Output "HTTP status: $([int]$_.Exception.Response.StatusCode)"
    }
    Write-Output 'Check the backend terminal and native MySQL service/port; start scripts/Start-Backend.ps1. The old container path needs -LegacyDocker explicitly.'
    exit 1
}
