$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$configFile = Join-Path $taskRoot '.env.redmine.local'
if (!(Test-Path -LiteralPath $configFile)) {
    function New-SandboxSecret {
        $bytes = New-Object byte[] 32
        $random = [Security.Cryptography.RandomNumberGenerator]::Create()
        try { $random.GetBytes($bytes) } finally { $random.Dispose() }
        return ([BitConverter]::ToString($bytes)).Replace('-', '').ToLowerInvariant()
    }
    $lines = @('RDM_PORT=3080')
    foreach ($key in @('RDM_ROOT_PASSWORD','RDM_DB_PASSWORD','RDM_ADMIN_PASSWORD','RDM_SERVICE_PASSWORD','RDM_SECRET_KEY')) {
        $lines += "$key=$(New-SandboxSecret)"
    }
    [IO.File]::WriteAllLines($configFile, $lines, (New-Object Text.UTF8Encoding $false))
    Write-Output 'Created ignored sandbox configuration with generated credentials (not printed).'
} else {
    Write-Output 'Sandbox configuration already exists; credentials preserved.'
}
Write-Output 'Start only the separate Redmine sandbox with compose.redmine.yaml, then run Seed-RedmineSandbox.ps1.'
