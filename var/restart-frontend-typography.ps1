param([switch]$Restart)
$ErrorActionPreference='Stop'
$workspacePath='D:\DCN\KTN_11235645_DoCamNhung'
$listeners=Get-NetTCPConnection -LocalPort 5173 -State Listen
$viteProcessIds=@($listeners.OwningProcess | Select-Object -Unique)
if($viteProcessIds.Count -ne 1){throw 'Expected exactly one frontend listener.'}
$viteProcess=Get-CimInstance Win32_Process -Filter ('ProcessId='+$viteProcessIds[0])
if(-not $viteProcess.CommandLine.Contains($workspacePath) -or -not $viteProcess.CommandLine.Contains('vite')){throw 'Port 5173 does not belong to this repository Vite process.'}
$viteProcess | Select-Object ProcessId,ExecutablePath,CommandLine
if($Restart){
  $nodeBinary=$viteProcess.ExecutablePath
  Stop-Process -Id $viteProcess.ProcessId
  $frontendPath=Join-Path $workspacePath 'Frontend'
  $viteEntry=Join-Path $frontendPath 'node_modules\vite\bin\vite.js'
  $started=Start-Process -FilePath $nodeBinary -ArgumentList @(('"'+$viteEntry+'"'),'--host','127.0.0.1','--port','5173','--strictPort') -WorkingDirectory $frontendPath -WindowStyle Hidden -RedirectStandardOutput (Join-Path $workspacePath 'var\typography-frontend.log') -RedirectStandardError (Join-Path $workspacePath 'var\typography-frontend.err.log') -PassThru
  Write-Output ('Frontend restarted, PID '+$started.Id)
}
