$ErrorActionPreference = 'Continue'
$env:DEBUG = 'false'
$env:TRACE = 'false'
$env:TMS_OPENAI_LIVE_TEST = 'false'
$env:TMS_AI_CHAT_LIVE_TEST = 'false'
Push-Location 'D:\DCN\KTN_11235645_DoCamNhung\Backend'
try {
    & rtk proxy .\mvnw.cmd -B -ntp '-Dtest=vn.syp.tms.ai.*Test,!vn.syp.tms.ai.OpenAiLiveConnectionTest,!vn.syp.tms.ai.AiChatLiveConnectionTest' verify
    $regressionExit = $LASTEXITCODE
    [IO.File]::WriteAllText('D:\DCN\KTN_11235645_DoCamNhung\var\caheo-chat-2026-10-18\regression-exit.json', '{"exitCode":' + $regressionExit + '}')
} finally { Pop-Location }
exit $regressionExit
