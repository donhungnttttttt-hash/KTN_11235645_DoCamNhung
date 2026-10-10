param([string]$Label = (Get-Date -Format 'yyyyMMdd-HHmmss'))
$ErrorActionPreference = 'Stop'
if ($Label -notmatch '^[A-Za-z0-9_-]{1,50}$') { throw 'Invalid artifact label.' }
$taskRoot = Split-Path -Parent $PSScriptRoot
$artifactRoot = Join-Path $taskRoot 'artifacts'
$destination = Join-Path $artifactRoot ('tms-' + $Label)
if (Test-Path -LiteralPath $destination) { throw 'Artifact already exists; choose a new label.' }
Push-Location (Join-Path $taskRoot 'Frontend')
try { & rtk proxy npm run build; if ($LASTEXITCODE -ne 0) { throw 'Frontend build failed.' } } finally { Pop-Location }
Push-Location (Join-Path $taskRoot 'Backend')
try { & rtk proxy .\mvnw.cmd -B -ntp -DskipTests package; if ($LASTEXITCODE -ne 0) { throw 'Backend package failed.' } } finally { Pop-Location }
[IO.Directory]::CreateDirectory($destination) | Out-Null
Copy-Item -LiteralPath (Join-Path $taskRoot 'Backend/target/tms-backend-0.1.0-SNAPSHOT.jar') -Destination (Join-Path $destination 'tms-backend.jar')
Copy-Item -LiteralPath (Join-Path $taskRoot 'Frontend/dist') -Destination (Join-Path $destination 'frontend') -Recurse
Copy-Item -LiteralPath (Join-Path $taskRoot 'docs') -Destination (Join-Path $destination 'docs') -Recurse
Copy-Item -LiteralPath (Join-Path $taskRoot 'infra/release') -Destination (Join-Path $destination 'config') -Recurse
$hashes = Get-ChildItem -LiteralPath $destination -File -Recurse | ForEach-Object {
    [ordered]@{ path = $_.FullName.Substring($destination.Length + 1).Replace('\','/'); sha256 = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant() }
}
$manifest = [ordered]@{ builtAtUtc = [DateTime]::UtcNow.ToString('o'); version = $Label; schemaVersion = 11; sourceHead = (& rtk proxy git -C $taskRoot rev-parse HEAD); dirty = [bool](& rtk proxy git -C $taskRoot status --porcelain); testsExecutedByThisScript = $false; files = @($hashes) }
[IO.File]::WriteAllText((Join-Path $destination 'manifest.json'), ($manifest | ConvertTo-Json -Depth 5), [Text.UTF8Encoding]::new($false))
Compress-Archive -Path (Join-Path $destination '*') -DestinationPath ($destination + '.zip')
Write-Output ('Artifact: {0}.zip' -f $destination)
Write-Output 'Package only: tests must be run separately. No .env, evidence, demo accounts or database backup included.'
