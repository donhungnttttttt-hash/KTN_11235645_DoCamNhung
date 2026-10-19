$listener=Get-NetTCPConnection -LocalPort 8080 -State Listen | Select-Object -First 1
$taskProcess=Get-CimInstance Win32_Process -Filter "ProcessId=$($listener.OwningProcess)"
[pscustomobject]@{PID=$taskProcess.ProcessId;Name=$taskProcess.Name;Workspace=$taskProcess.CommandLine.Contains('KTN_11235645_DoCamNhung');MainClass=$taskProcess.CommandLine.Contains('TmsApplication');Jar=[regex]::Match($taskProcess.CommandLine,'[^\s"]+\.jar').Value} | ConvertTo-Json -Compress
$argFile=[regex]::Match($taskProcess.CommandLine,'@([^\s"]+)').Groups[1].Value
if($argFile -and (Test-Path -LiteralPath $argFile)) {
  [pscustomobject]@{ArgFile=$argFile;WorkspaceInArguments=([IO.File]::ReadAllText($argFile)).Contains('KTN_11235645_DoCamNhung')} | ConvertTo-Json -Compress
}
