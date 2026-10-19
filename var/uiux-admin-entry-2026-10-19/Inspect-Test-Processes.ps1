$ErrorActionPreference = 'Stop'
Get-CimInstance Win32_Process | Where-Object { $_.Name -match 'node|vitest' -and $_.CommandLine -match 'vitest|npm-cli.js.*test' } | Select-Object ProcessId,ParentProcessId,Name,CreationDate,CommandLine | Format-List
