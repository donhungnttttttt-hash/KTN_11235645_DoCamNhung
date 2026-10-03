param([string]$Label = 'manual')
$ErrorActionPreference = 'Stop'
if ($Label -notmatch '^[a-zA-Z0-9_-]{1,40}$') { throw 'Invalid backup label.' }
$taskRoot = Split-Path -Parent $PSScriptRoot
$backupDirectory = Join-Path $taskRoot 'scratch/backups'
[IO.Directory]::CreateDirectory($backupDirectory) | Out-Null
$backupPath = Join-Path $backupDirectory ((Get-Date -Format 'yyyyMMdd-HHmmss') + '-' + $Label + '.sql')
if (Test-Path -LiteralPath $backupPath) { throw 'Backup path already exists.' }
Push-Location $taskRoot
try {
    $dump = & rtk proxy docker compose exec -T mysql sh -c 'MYSQL_PWD=$MYSQL_ROOT_PASSWORD mysqldump --user=root --single-transaction --skip-lock-tables --no-tablespaces --hex-blob --set-gtid-purged=OFF --routines --triggers tms'
    if ($LASTEXITCODE -ne 0) { throw 'Database backup failed.' }
    [IO.File]::WriteAllLines($backupPath, $dump, [Text.UTF8Encoding]::new($false))
    Write-Output ('Backup saved: {0} ({1} bytes). This is a DB-only local checkpoint; full recovery also requires evidence files.' -f $backupPath, (Get-Item -LiteralPath $backupPath).Length)
} finally { Pop-Location }
