$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $taskRoot '.env'
if (!(Test-Path -LiteralPath $envFile)) { throw 'Run scripts/Initialize-Local.ps1 first.' }
$existing = [IO.File]::ReadAllText($envFile)
if ($existing -match '(?m)^TMS_BOOTSTRAP_') {
    Write-Host 'Bootstrap configuration already exists; preserving it. Database accounts are never reset.'
    exit 0
}
$bytes=New-Object byte[] 32
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
$secret=[Convert]::ToBase64String($bytes)
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
$secondSecret=[Convert]::ToBase64String($bytes)
$content = "`nTMS_BOOTSTRAP_ENABLED=true`nTMS_BOOTSTRAP_USERNAME=admin`nTMS_BOOTSTRAP_PASSWORD=$secret`nTMS_BOOTSTRAP_DISPLAY_NAME=admin`nTMS_BOOTSTRAP_SECOND_USERNAME=admin2`nTMS_BOOTSTRAP_SECOND_DISPLAY_NAME=admin2`nTMS_BOOTSTRAP_SECOND_PASSWORD=$secondSecret`n"
[IO.File]::AppendAllText($envFile, $content, (New-Object Text.UTF8Encoding $false))
Write-Host 'Prepared two private bootstrap accounts for an empty core database. Existing/demo databases require offline UUID mapping; see docs/database/unified-user-access-cutover.md.'
Write-Host 'Use scripts/Show-LocalLogin.ps1 to view the local login credentials.'
