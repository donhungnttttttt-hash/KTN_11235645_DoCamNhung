param([ValidateSet('pm','tester1','tester2','tester3','tester4')][string]$Role = 'pm')
$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$file = Join-Path $taskRoot '.env.demo.local'
if (!(Test-Path -LiteralPath $file)) { throw 'Run scripts/Seed-Demo.cjs first.' }
$accounts = Get-Content -LiteralPath $file -Encoding UTF8 -Raw | ConvertFrom-Json
$account = $accounts | Where-Object { $_.username -eq ('demo.pilot.' + $Role) }
if (!$account) { throw 'The requested demo account is not present.' }
Write-Output 'Local demo only. Do not copy this output to Git, shared logs or screenshots.'
Write-Output ('Username: ' + $account.username)
Write-Output ('Password: ' + $account.password)
