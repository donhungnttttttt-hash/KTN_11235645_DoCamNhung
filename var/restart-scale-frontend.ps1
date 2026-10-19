$ErrorActionPreference='Stop'
$previewOwner=Get-NetTCPConnection -LocalPort 15173 -State Listen | Select-Object -ExpandProperty OwningProcess -Unique
$previewProc=Get-CimInstance Win32_Process -Filter ('ProcessId='+$previewOwner)
if($previewProc.Name -ne 'node.exe' -or !$previewProc.CommandLine.Contains('vite-scale.config.mjs')){throw 'Unexpected preview process'}
Stop-Process -Id $previewOwner
Start-Process -FilePath 'powershell.exe' -WindowStyle Hidden -WorkingDirectory 'D:\DCN\KTN_11235645_DoCamNhung' -ArgumentList @('-NoProfile','-File','D:\DCN\KTN_11235645_DoCamNhung\var\start-scale-frontend.ps1') -RedirectStandardOutput 'D:\DCN\KTN_11235645_DoCamNhung\var\scale-preview-frontend2.log' -RedirectStandardError 'D:\DCN\KTN_11235645_DoCamNhung\var\scale-preview-frontend2-error.log' | Out-Null
Write-Output 'Restarted isolated preview frontend with repository module resolution.'
