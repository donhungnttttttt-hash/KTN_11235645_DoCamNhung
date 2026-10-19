$ErrorActionPreference = 'Continue'
$env:DEBUG = 'false'
$env:TRACE = 'false'
$env:TMS_OPENAI_LIVE_TEST = 'true'
$env:TMS_OPENAI_TEST_CONFIG_FILE = 'D:\DCN\KTN_11235645_DoCamNhung\.env.mysql.local'
Push-Location 'D:\DCN\KTN_11235645_DoCamNhung\Backend'
try {
    & rtk proxy .\mvnw.cmd -B -ntp '-Dtest=OpenAiLiveConnectionTest' test
    $probeExitCode = $LASTEXITCODE
    [IO.File]::WriteAllText('D:\DCN\KTN_11235645_DoCamNhung\var\caheo-connection-2026-10-18\probe-exit.json', '{"exitCode":' + $probeExitCode + '}')
} finally { Pop-Location }
exit $probeExitCode
