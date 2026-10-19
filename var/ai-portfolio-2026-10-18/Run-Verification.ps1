param([ValidateSet('unit','live')][string]$Mode='unit')
$ErrorActionPreference='Continue'
$env:DEBUG='false';$env:TRACE='false'
$env:TMS_OPENAI_LIVE_TEST='false';$env:TMS_AI_CHAT_LIVE_TEST='false';$env:TMS_AI_PORTFOLIO_LIVE_TEST='false'
$testSelector='vn.syp.tms.ai.*Test,!vn.syp.tms.ai.*LiveConnectionTest'
$phase='verify'
if($Mode -eq 'live') {
    $env:TMS_AI_PORTFOLIO_LIVE_TEST='true'
    $env:TMS_OPENAI_TEST_CONFIG_FILE='D:\DCN\KTN_11235645_DoCamNhung\.env.mysql.local'
    $testSelector='AiPortfolioLiveConnectionTest';$phase='test'
}
Push-Location 'D:\DCN\KTN_11235645_DoCamNhung\Backend'
try {
    & rtk proxy .\mvnw.cmd -B -ntp ('-Dtest='+$testSelector) $phase
    $verificationExit=$LASTEXITCODE
    [IO.File]::WriteAllText(('D:\DCN\KTN_11235645_DoCamNhung\var\ai-portfolio-2026-10-18\'+$Mode+'-exit.json'),'{"exitCode":'+$verificationExit+'}')
} finally {Pop-Location}
exit $verificationExit
