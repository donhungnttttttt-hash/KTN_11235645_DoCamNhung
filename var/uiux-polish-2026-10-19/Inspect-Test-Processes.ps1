Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" | ForEach-Object {
  $kind = if ($_.CommandLine -match 'vitest') { 'vitest' } elseif ($_.CommandLine -match 'vite') { 'vite' } elseif ($_.CommandLine -match 'npm-cli') { 'npm' } else { 'other-node' }
  [pscustomobject]@{ Id=$_.ProcessId; Parent=$_.ParentProcessId; Created=$_.CreationDate; Kind=$kind }
} | ConvertTo-Json -Compress
