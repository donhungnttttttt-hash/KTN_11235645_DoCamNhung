param([Parameter(Mandatory=$true)][string]$ArtifactDirectory, [string]$Label = (Get-Date -Format 'yyyyMMdd-HHmmss'))
$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$artifact = (Resolve-Path -LiteralPath $ArtifactDirectory).Path
$manifest = Get-Content -LiteralPath (Join-Path $artifact 'manifest.json') -Raw | ConvertFrom-Json
if (!($manifest.files | Where-Object { $_.path -eq 'tms-backend.jar' -and $_.sha256 -match '^[a-f0-9]{64}$' })) { throw 'Manifest must include the backend hash.' }
foreach ($entry in $manifest.files) {
    $target = [IO.Path]::GetFullPath((Join-Path $artifact $entry.path))
    if (!$target.StartsWith($artifact + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'Invalid manifest path.' }
    if ((Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash.ToLowerInvariant() -ne $entry.sha256) { throw 'Artifact checksum mismatch.' }
}
if (Get-NetTCPConnection -LocalPort 8180,3311 -State Listen -ErrorAction SilentlyContinue) { throw 'Local staging ports 8180/3311 must be free.' }
if ($Label -notmatch '^[a-z0-9-]{1,40}$') { throw 'Invalid staging label.' }
$composeProject = 'tms-s11-' + $Label
$existingVolumes = & rtk proxy docker volume ls --format '{{.Name}}'
if ($LASTEXITCODE -ne 0) { throw 'Cannot inspect Docker volumes.' }
$existingContainers = & rtk proxy docker ps -a --format '{{.Names}}'
if ($LASTEXITCODE -ne 0) { throw 'Cannot inspect Docker containers.' }
if ($existingVolumes -contains ($composeProject + '_mysql_data') -or $existingContainers -contains ($composeProject + '-mysql-1')) { throw 'Staging target already exists; do not reuse or stop it.' }
$state = Join-Path $taskRoot ('scratch/release-smoke-' + $Label)
if (Test-Path -LiteralPath $state) { throw 'Preserve prior staging evidence; use existing report or archive it intentionally before another drill.' }
[IO.Directory]::CreateDirectory($state) | Out-Null
function New-LocalSecret {
    $bytes = New-Object byte[] 32
    $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
    try { $rng.GetBytes($bytes); return ([BitConverter]::ToString($bytes)).Replace('-','').ToLowerInvariant() } finally { $rng.Dispose() }
}
$rootSecret = New-LocalSecret
$runtimeSecret = New-LocalSecret
$migrationSecret = New-LocalSecret
$envFile = Join-Path $state 'mysql.env'
[IO.File]::WriteAllLines($envFile, @("MYSQL_ROOT_PASSWORD=$rootSecret", "TMS_DB_PASSWORD=$runtimeSecret", "TMS_MIGRATION_PASSWORD=$migrationSecret", 'TMS_MYSQL_PORT=3311'), [Text.UTF8Encoding]::new($false))
$runtimeProcess = $null
Push-Location $taskRoot
try {
    & rtk proxy docker compose --env-file $envFile -p $composeProject up -d --wait mysql
    if ($LASTEXITCODE -ne 0) { throw 'Isolated MySQL startup failed.' }
    $env:TMS_DB_URL='jdbc:mysql://127.0.0.1:3311/tms?connectionTimeZone=UTC&forceConnectionTimeZoneToSession=true&allowPublicKeyRetrieval=true&sslMode=DISABLED'
    $env:TMS_MIGRATION_USER='tms_migrator'; $env:TMS_MIGRATION_PASSWORD=$migrationSecret
    $jar=Join-Path $artifact 'tms-backend.jar'
    $migrationProcess=Start-Process -FilePath 'rtk' -ArgumentList @('proxy','java','-jar',('"'+$jar+'"'),'--tms-migrate') -Wait -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $state 'migration.log') -RedirectStandardError (Join-Path $state 'migration-error.log')
    if ($migrationProcess.ExitCode -ne 0) { throw 'Separate migration job failed.' }
    # Runtime does not inherit the migration credentials.
    Remove-Item Env:TMS_MIGRATION_USER,Env:TMS_MIGRATION_PASSWORD
    $env:TMS_DB_USER='tms_app'; $env:TMS_DB_PASSWORD=$runtimeSecret
    $env:SPRING_PROFILES_ACTIVE='release'; $env:TMS_PORT='8180'; $env:TMS_BIND_ADDRESS='127.0.0.1'
    $env:TMS_COOKIE_SECURE='false'; $env:TMS_REDMINE_ENABLED='false'
    $env:DEBUG='false'; $env:TRACE='false'
    $env:TMS_ATTACHMENT_ROOT=Join-Path $state 'evidence'
    $env:TMS_BOOTSTRAP_ENABLED='true'; $env:TMS_BOOTSTRAP_USERNAME='release.check.admin'
    $env:TMS_BOOTSTRAP_PASSWORD=New-LocalSecret; $env:TMS_BOOTSTRAP_DISPLAY_NAME='Admin kiểm tra gói'
    $runtimeProcess=Start-Process -FilePath 'java' -ArgumentList @('-jar', ('"'+$jar+'"')) -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $state 'runtime.log') -RedirectStandardError (Join-Path $state 'runtime-error.log')
    $ready=$false
    for($attempt=0;$attempt -lt 60;$attempt++) {
        if($runtimeProcess.HasExited){throw 'Release runtime exited before readiness.'}
        try {$response=Invoke-RestMethod 'http://127.0.0.1:8180/actuator/health/readiness' -TimeoutSec 2; if($response.status -eq 'UP'){$ready=$true;break}} catch {}
        Start-Sleep -Seconds 1
    }
    if(!$ready){throw 'Release readiness timeout.'}
    $env:TMS_DEMO_ORIGIN='http://127.0.0.1:8180'
    & rtk proxy node scripts/demo/Smoke-Release.cjs
    if($LASTEXITCODE -ne 0){throw 'Release HTTP smoke failed.'}
    $resultPath=Join-Path $taskRoot 'scratch/release-smoke-result.json'
    $result=Get-Content -LiteralPath $resultPath -Raw | ConvertFrom-Json
    $result | Add-Member -NotePropertyName artifactVersion -NotePropertyValue $manifest.version
    $result | Add-Member -NotePropertyName backendSha256 -NotePropertyValue ((Get-FileHash -LiteralPath $jar -Algorithm SHA256).Hash.ToLowerInvariant())
    $result | Add-Member -NotePropertyName schemaVersion -NotePropertyValue $manifest.schemaVersion
    [IO.File]::WriteAllText($resultPath,($result | ConvertTo-Json -Depth 5),[Text.UTF8Encoding]::new($false))
    Write-Output 'PASS: isolated fresh MySQL, separate migration, DML-only runtime and real HTTP smoke.'
} finally {
    # Windows Oracle javapath may launch a child JVM. Stop only the child belonging
    # to this launcher and this exact artifact before stopping the launcher itself.
    if($runtimeProcess) {
        $ownedChildren = Get-CimInstance Win32_Process -Filter "ParentProcessId = $($runtimeProcess.Id)" |
            Where-Object { $_.Name -eq 'java.exe' -and $_.CommandLine -and $_.CommandLine.Contains($jar) }
        foreach($child in $ownedChildren) { Stop-Process -Id $child.ProcessId -ErrorAction SilentlyContinue }
    }
    if($runtimeProcess -and !$runtimeProcess.HasExited){Stop-Process -Id $runtimeProcess.Id}
    & rtk proxy docker compose --env-file $envFile -p $composeProject stop mysql
    Pop-Location
}
