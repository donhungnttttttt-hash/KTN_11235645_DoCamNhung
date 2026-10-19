$ErrorActionPreference = 'Stop'
$config = 'D:\DCN\KTN_11235645_DoCamNhung\.env.mysql.local'
$vaultDirectory = 'C:\Users\admin\.tms-ai'
$backup = Join-Path $vaultDirectory 'tms-config-before-caheo-2026-10-18.env'
$identity = [Security.Principal.WindowsIdentity]::GetCurrent().User
if (!(Test-Path -LiteralPath $vaultDirectory) -or (Test-Path -LiteralPath $backup)) { throw 'Expected existing protected directory and a new backup path.' }
foreach ($target in @($vaultDirectory,$config)) {
    $item = Get-Item -LiteralPath $target -Force
    if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Refusing a reparse point.' }
    if ((Get-Acl -LiteralPath $target).GetOwner([Security.Principal.SecurityIdentifier]) -ne $identity) { throw 'Existing owner does not match the current local user.' }
}
New-Item -ItemType File -Path $backup | Out-Null
foreach ($target in @($config,$backup)) {
    $acl = [Security.AccessControl.FileSecurity]::new()
    $acl.SetOwner($identity)
    $acl.SetAccessRuleProtection($true,$false)
    $acl.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new($identity,'FullControl','Allow'))
    Set-Acl -LiteralPath $target -AclObject $acl
}
Write-Output 'Local configuration and empty backup are owner-only. No secret was printed or changed.'
