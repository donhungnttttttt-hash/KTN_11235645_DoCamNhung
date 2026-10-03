param([string]$Tests = '')
$ErrorActionPreference = 'Stop'
$previousDebug = [Environment]::GetEnvironmentVariable('DEBUG', 'Process')
$previousTrace = [Environment]::GetEnvironmentVariable('TRACE', 'Process')
$testExitCode = 1
Push-Location (Join-Path $PSScriptRoot '../Backend')
try {
    # Keep unrelated inherited DEBUG/TRACE values out of test logs and timings.
    $env:DEBUG = 'false'
    $env:TRACE = 'false'
    $testArgs = @('-B', '-ntp', 'verify')
    if ($Tests) { $testArgs += "-Dtest=$Tests" }
    Get-Command rtk -ErrorAction Stop | Out-Null
    # Windows PowerShell 5.1 wraps redirected native stderr as ErrorRecord, even
    # for warnings on a successful process. Preserve the native exit code.
    $ErrorActionPreference = 'Continue'
    & rtk proxy .\mvnw.cmd @testArgs
    $testExitCode = $LASTEXITCODE
    $ErrorActionPreference = 'Stop'
} finally {
    Pop-Location
    [Environment]::SetEnvironmentVariable('DEBUG', $previousDebug, 'Process')
    [Environment]::SetEnvironmentVariable('TRACE', $previousTrace, 'Process')
}
exit $testExitCode
