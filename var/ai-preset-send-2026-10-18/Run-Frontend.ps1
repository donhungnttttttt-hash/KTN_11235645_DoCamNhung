$ErrorActionPreference='Continue'
$taskRoot='D:\DCN\KTN_11235645_DoCamNhung'
$artifactDirectory=Join-Path $taskRoot 'var\ai-preset-send-2026-10-18'
Push-Location (Join-Path $taskRoot 'Frontend')
try {
    & rtk proxy npm run test:coverage -- src/app/features/ai --maxWorkers=2 --coverage.include=src/app/features/ai/AiChat.jsx --coverage.reportsDirectory=../var/ai-preset-send-2026-10-18/coverage *> (Join-Path $artifactDirectory 'ai-tests.log')
    $testExit=$LASTEXITCODE
    & rtk proxy npm run build *> (Join-Path $artifactDirectory 'build.log')
    $buildExit=$LASTEXITCODE
    [IO.File]::WriteAllText((Join-Path $artifactDirectory 'exits.json'),('{"testExit":'+$testExit+',"buildExit":'+$buildExit+'}'))
    Write-Output ('Frontend tests exit='+$testExit+'; build exit='+$buildExit)
} finally {Pop-Location}
if($testExit -ne 0 -or $buildExit -ne 0){exit 1}
