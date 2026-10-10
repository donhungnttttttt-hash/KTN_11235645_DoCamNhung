$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$configFile = Join-Path $taskRoot '.env.redmine.local'
$composeFile = Join-Path $taskRoot 'compose.redmine.yaml'
if (!(Test-Path -LiteralPath $configFile)) { throw 'Run Initialize-RedmineSandbox.ps1 first.' }
$tlsDirectory = Join-Path $taskRoot 'var/redmine/tls'
[IO.Directory]::CreateDirectory($tlsDirectory) | Out-Null
$seedDirectory = Join-Path $taskRoot 'infra/redmine'
& docker run --rm --entrypoint ruby --mount "type=bind,source=$tlsDirectory,target=/tls" --mount "type=bind,source=$seedDirectory,target=/seed,readonly" redmine:7.0.1-alpine /seed/create-tls.rb
if ($LASTEXITCODE -ne 0) { throw 'Could not prepare sandbox TLS material.' }
& docker compose --env-file $configFile -f $composeFile up -d --wait database
if ($LASTEXITCODE -ne 0) { throw 'Sandbox database did not become ready.' }
& docker compose --env-file $configFile -f $composeFile up -d --wait redmine
exit $LASTEXITCODE
