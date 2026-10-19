param([ValidateSet('unit','native','frontend')][string]$Mode)
$ErrorActionPreference='Continue'
$taskRoot='D:\DCN\KTN_11235645_DoCamNhung'
$artifactDirectory=Join-Path $taskRoot 'var\ai-chat-scope-2026-10-18'
$env:DEBUG='false';$env:TRACE='false'
$env:TMS_OPENAI_LIVE_TEST='false';$env:TMS_AI_CHAT_LIVE_TEST='false';$env:TMS_AI_PORTFOLIO_LIVE_TEST='false'
Push-Location $taskRoot
try {
    if($Mode -eq 'unit') {
        Set-Location (Join-Path $taskRoot 'Backend')
        & rtk proxy .\mvnw.cmd -B -ntp '-Dtest=vn.syp.tms.ai.*Test,!vn.syp.tms.ai.*LiveConnectionTest' verify *> (Join-Path $artifactDirectory 'unit.log')
    } elseif($Mode -eq 'native') {
        & rtk proxy node scripts/Test-FileWorkQaNative.cjs tms_docstest_bab5ba2349be portfolio-integration NativeAiPortfolioTest *> (Join-Path $artifactDirectory 'native.log')
    } else {
        Set-Location (Join-Path $taskRoot 'Frontend')
        & rtk proxy npm run test:coverage -- --maxWorkers=2 --coverage.reportsDirectory=../var/ai-chat-scope-2026-10-18/frontend-coverage *> (Join-Path $artifactDirectory 'frontend.log')
    }
    $checkExit=$LASTEXITCODE
    [IO.File]::WriteAllText((Join-Path $artifactDirectory ($Mode+'-exit.json')),('{"exitCode":'+$checkExit+'}'))
    if($Mode -ne 'frontend' -and (Test-Path (Join-Path $taskRoot 'Backend\target\site\jacoco\jacoco.xml'))) {
        Copy-Item -LiteralPath (Join-Path $taskRoot 'Backend\target\site\jacoco\jacoco.xml') -Destination (Join-Path $artifactDirectory ($Mode+'-coverage.xml'))
    }
    Write-Output ($Mode+' exit='+$checkExit)
} finally {Pop-Location}
exit $checkExit
