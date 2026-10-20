param([string]$Tests)
$ErrorActionPreference = 'Continue'
Push-Location (Join-Path $PSScriptRoot '../../../Backend')
try {
    & rtk proxy .\mvnw.cmd -B -ntp test "-Dtest=$Tests"
    $testExitCode = $LASTEXITCODE
} finally { Pop-Location }
exit $testExitCode
