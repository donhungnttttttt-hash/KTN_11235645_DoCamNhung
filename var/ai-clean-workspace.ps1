$ErrorActionPreference='Stop'
$taskWorkspace=[IO.Path]::GetFullPath('D:\DCN\KTN_11235645_DoCamNhung\.superpowers\sdd\2026-10-09-role-ai')
$taskParent=[IO.Path]::GetFullPath('D:\DCN\KTN_11235645_DoCamNhung\.superpowers\sdd')
if ((Split-Path -Parent $taskWorkspace) -ne $taskParent -or (Split-Path -Leaf $taskWorkspace) -ne '2026-10-09-role-ai') { throw 'Unexpected task workspace' }
$item=Get-Item -LiteralPath $taskWorkspace
if($item.Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'Refusing linked workspace'}
Get-ChildItem -LiteralPath $taskWorkspace -Name
Remove-Item -LiteralPath $taskWorkspace -Recurse -Force
Write-Output 'Removed this completed plan workspace only; tracked plan/review and all sibling workspaces preserved.'
