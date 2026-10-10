$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $taskRoot '.env'
if (Test-Path -LiteralPath $envFile) {
    Write-Host 'Local .env already exists; preserving credentials.'
    exit 0
}
function New-LocalSecret {
    $bytes = New-Object byte[] 32
    $random = [Security.Cryptography.RandomNumberGenerator]::Create()
    try { $random.GetBytes($bytes) } finally { $random.Dispose() }
    return ([BitConverter]::ToString($bytes)).Replace('-', '').ToLowerInvariant()
}
$content = "MYSQL_ROOT_PASSWORD=$(New-LocalSecret)`nTMS_DB_PASSWORD=$(New-LocalSecret)`nTMS_MIGRATION_PASSWORD=$(New-LocalSecret)`nTMS_MYSQL_PORT=3310`n"
[IO.File]::WriteAllText($envFile, $content, (New-Object Text.UTF8Encoding $false))
Write-Host 'Created local .env with generated passwords (not printed, not tracked).'
