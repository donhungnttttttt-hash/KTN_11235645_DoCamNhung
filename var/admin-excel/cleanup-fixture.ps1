$ErrorActionPreference='Stop'
$taskRoot=(Resolve-Path '.').Path
foreach($port in @(8081,5174)) {
  $listener=Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue
  if(!$listener){continue}
  $fixturePid=$listener[0].OwningProcess
  $process=Get-CimInstance Win32_Process -Filter "ProcessId=$fixturePid"
  $known=($port -eq 8081 -and $process.Name -eq 'java.exe' -and $process.CommandLine -match 'tms-backend-0.1.0-SNAPSHOT.jar') -or ($port -eq 5174 -and $process.Name -eq 'node.exe' -and $process.CommandLine -match 'vite.excel-local.config.js')
  if(!$known){throw "Unexpected listener at $port; refusing cleanup"}
  Stop-Process -Id $fixturePid
  Write-Output "Stopped fixture listener $port / $fixturePid"
}
$ownedFiles=@('var/admin-excel/test-native.cjs','var/admin-excel/start-fixture.ps1','var/admin-excel/fixture-project.cjs','var/admin-excel/http-check.cjs')
foreach($relative in $ownedFiles) {
  $candidate=[IO.Path]::GetFullPath((Join-Path $taskRoot $relative))
  $allowed=[IO.Path]::GetFullPath((Join-Path $taskRoot 'var/admin-excel'))+[IO.Path]::DirectorySeparatorChar
  if(!$candidate.StartsWith($allowed,[StringComparison]::OrdinalIgnoreCase)){throw 'Cleanup path escaped task directory'}
  if(Test-Path -LiteralPath $candidate){Remove-Item -LiteralPath $candidate}
}
