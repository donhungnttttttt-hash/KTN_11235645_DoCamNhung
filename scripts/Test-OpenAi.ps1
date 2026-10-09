param([string]$LocalConfig = (Join-Path $PSScriptRoot '../.env.mysql.local'))
$ErrorActionPreference = 'Stop'
$variables = @('TMS_OPENAI_LIVE_TEST', 'TMS_OPENAI_TEST_CONFIG_FILE', 'DEBUG', 'TRACE')
$previous = @{}
foreach ($name in $variables) { $previous[$name] = [Environment]::GetEnvironmentVariable($name, 'Process') }
$testExitCode = 1
Push-Location (Join-Path $PSScriptRoot '../Backend')
try {
    # Only the path enters the child environment. The key is never echoed or passed on the command line.
    $env:TMS_OPENAI_TEST_CONFIG_FILE = (Resolve-Path -LiteralPath $LocalConfig).Path
    $env:TMS_OPENAI_LIVE_TEST = 'true'
    $env:DEBUG = 'false'
    $env:TRACE = 'false'
    Write-Host 'Sending one small generic OpenAI request. This may use API credit; no project data or database access.'
    $ErrorActionPreference = 'Continue'
    & rtk proxy .\mvnw.cmd -B -ntp '-Dtest=OpenAiLiveConnectionTest' test
    $testExitCode = $LASTEXITCODE
    $ErrorActionPreference = 'Stop'
} finally {
    Pop-Location
    foreach ($name in $variables) { [Environment]::SetEnvironmentVariable($name, $previous[$name], 'Process') }
}
exit $testExitCode
