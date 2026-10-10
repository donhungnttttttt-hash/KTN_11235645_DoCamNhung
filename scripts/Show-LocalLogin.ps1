# Explicit local developer command; never print database passwords.
$ErrorActionPreference = 'Stop'
$envFile = Join-Path (Split-Path -Parent $PSScriptRoot) '.env'
if(Test-Path -LiteralPath (Join-Path (Split-Path -Parent $PSScriptRoot) '.env.mysql.local')){$envFile=Join-Path (Split-Path -Parent $PSScriptRoot) '.env.mysql.local'}
if (!(Test-Path -LiteralPath $envFile)) { throw 'Local .env not found.' }
Write-Host 'Local bootstrap credentials (valid only if bootstrap created this account):'
foreach ($line in [IO.File]::ReadAllLines($envFile)) {
    if ($line -match '^TMS_BOOTSTRAP_(USERNAME|PASSWORD)=(.+)$') {
        Write-Host "$($Matches[1]): $($Matches[2])"
    }
}
