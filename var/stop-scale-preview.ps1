$ErrorActionPreference='Stop'
$taskRoot='D:\DCN\KTN_11235645_DoCamNhung'
foreach($port in @(18080,15173)) {
 $owners=@(Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique)
 foreach($owner in $owners) {
  $proc=Get-CimInstance Win32_Process -Filter ('ProcessId='+$owner)
  $expected=if($port -eq 18080){$proc.Name -eq 'java.exe' -and $proc.CommandLine.Contains('tms-scale-v22.jar')}else{$proc.Name -eq 'node.exe' -and $proc.CommandLine.Contains('vite.scale.config.mjs')}
  if(!$expected){throw "Refusing to stop unrecognized listener on $port"}
  Stop-Process -Id $owner
  Write-Output "Stopped owned preview on port $port (PID $owner)"
 }
}
$previewConfig=Join-Path $taskRoot 'Frontend\var\vite.scale.config.mjs'
if(Test-Path -LiteralPath $previewConfig){Remove-Item -LiteralPath $previewConfig}
