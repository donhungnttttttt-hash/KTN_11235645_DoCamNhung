$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$listener = @(Get-NetTCPConnection -State Listen -LocalAddress '127.0.0.1' -LocalPort 8080)
if ($listener.Count -ne 1) { throw 'Expected one loopback8080 listener; no process action performed' }
$process = Get-CimInstance Win32_Process -Filter ('ProcessId=' + $listener[0].OwningProcess)
$parent = Get-CimInstance Win32_Process -Filter ('ProcessId=' + $process.ParentProcessId)
$proof = [ordered]@{
  capturedAt = [DateTime]::UtcNow.ToString('o')
  mode = 'PROCESS_READ_ONLY_NO_STOP_OR_RESTART'
  port = 8080
  pid = $process.ProcessId
  parentPid = $process.ParentProcessId
  executableName = $process.Name
  workspaceMentioned = $process.CommandLine.Contains($repoRoot)
  parentWorkspaceMentioned = $null -ne $parent -and $parent.CommandLine.Contains($repoRoot)
  springApplicationMentioned = $process.CommandLine.Contains('vn.syp.tms.TmsApplication')
  packagedJar = $process.CommandLine.Contains('-jar')
  localProfileMentioned = $process.CommandLine.Contains('spring.profiles.active=local')
}
$json = $proof | ConvertTo-Json
[IO.File]::WriteAllText((Join-Path $PSScriptRoot 'main-process-readonly.json'), $json)
Write-Output $json
