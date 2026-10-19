$ErrorActionPreference='Stop'
$repoRoot=(Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$journal=Join-Path $PSScriptRoot 'main-stopped.json'
if(Test-Path -LiteralPath $journal){throw 'Stop journal already exists; refusing repeat action'}
$listener=@(Get-NetTCPConnection -State Listen -LocalAddress '127.0.0.1' -LocalPort 8080)
if($listener.Count -ne 1){throw 'Expected exactly one loopback8080 process'}
$targetProcess=Get-CimInstance Win32_Process -Filter ('ProcessId='+$listener[0].OwningProcess)
$parentProcess=Get-CimInstance Win32_Process -Filter ('ProcessId='+$targetProcess.ParentProcessId)
if($targetProcess.Name -ne 'java.exe' -or !$targetProcess.CommandLine.Contains('vn.syp.tms.TmsApplication') -or !$targetProcess.CommandLine.Contains('spring.profiles.active=local') -or $null -eq $parentProcess -or !$parentProcess.CommandLine.Contains($repoRoot)){throw 'Main process identity differs from reviewed target; no stop performed'}
$unchangedPorts=@(5173,5174,8081)|ForEach-Object {Get-NetTCPConnection -State Listen -LocalPort $_ | Select-Object LocalPort,OwningProcess}
Stop-Process -Id $targetProcess.ProcessId
Wait-Process -Id $targetProcess.ProcessId -Timeout 15 -ErrorAction SilentlyContinue
if(@(Get-NetTCPConnection -State Listen -LocalPort 8080 -ErrorAction SilentlyContinue).Count -ne 0){throw '8080 still occupied; no further action'}
foreach($portEntry in $unchangedPorts){if(!(Get-NetTCPConnection -State Listen -LocalPort $portEntry.LocalPort | Where-Object OwningProcess -eq $portEntry.OwningProcess)){throw 'Unrelated listener changed; inspect before further action'}}
$proof=[ordered]@{stoppedAt=[DateTime]::UtcNow.ToString('o');approval='Explicit user authorization: upgrade main tms V30 to V33 and restart8080';stoppedPid=$targetProcess.ProcessId;parentPid=$targetProcess.ParentProcessId;port=8080;otherListenersUnchanged=$unchangedPorts;noOtherProcessStopped=$true}
$proof|ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $journal -Encoding UTF8
$proof|ConvertTo-Json -Depth 5
