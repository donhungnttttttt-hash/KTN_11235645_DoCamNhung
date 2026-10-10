$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $taskRoot '.env'
if (!(Test-Path -LiteralPath $envFile)) { throw 'Run scripts/Initialize-Local.ps1 first.' }
$existing = [IO.File]::ReadAllText($envFile)
if ($existing -match '(?m)^TMS_BOOTSTRAP_') {
    Write-Host 'Bootstrap configuration already exists; preserving it. Database accounts are never reset.'
    exit 0
}
$secret = 'Admin@123456'
$content = "`nTMS_BOOTSTRAP_ENABLED=true`nTMS_BOOTSTRAP_USERNAME=admin.local`nTMS_BOOTSTRAP_PASSWORD=$secret`nTMS_BOOTSTRAP_DISPLAY_NAME=Admin local`n"
[IO.File]::AppendAllText($envFile, $content, (New-Object Text.UTF8Encoding $false))
Write-Host 'Generated local admin bootstrap configuration in .env (not tracked). Restart the backend to create the first account.'
Write-Host 'Use scripts/Show-LocalLogin.ps1 to view the local login credentials.'
