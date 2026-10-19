$ErrorActionPreference = 'Stop'
$expectedFile = 'C:\Users\admin\.tms-ai\chatgpt.enc'
$configuredDirectory = [Environment]::GetEnvironmentVariable('TMS_CHATGPT_VAULT_PATH', 'Process')
$file = [IO.Path]::GetFullPath((Join-Path $configuredDirectory 'chatgpt.enc'))
if ($file -cne $expectedFile) { throw 'Configured vault file differs from the diagnosed path; no ACL changed.' }
$item = Get-Item -LiteralPath $file -Force
if ($item.PSIsContainer -or ($item.Attributes -band [IO.FileAttributes]::ReparsePoint)) { throw 'Expected a regular existing vault file.' }
$identity = [Security.Principal.WindowsIdentity]::GetCurrent().User
$prior = Get-Acl -LiteralPath $file
if ($prior.GetOwner([Security.Principal.SecurityIdentifier]) -ne $identity) { throw 'Current user is not the existing owner; no ACL changed.' }
$beforeHash = (Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash
$snapshot = [ordered]@{ File = $file; BeforeSha256 = $beforeHash; PriorSddl = $prior.Sddl }
$snapshot | ConvertTo-Json | Set-Content -LiteralPath 'D:\DCN\KTN_11235645_DoCamNhung\var\startup-diagnosis-2026-10-18\vault-acl-before.json' -Encoding UTF8
try {
    $replacement = [Security.AccessControl.FileSecurity]::new()
    $replacement.SetOwner($identity)
    $replacement.SetAccessRuleProtection($true, $false)
    $replacement.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new($identity, 'FullControl', 'Allow'))
    Set-Acl -LiteralPath $file -AclObject $replacement
    $after = Get-Acl -LiteralPath $file
    $other = @($after.GetAccessRules($true, $true, [Security.Principal.SecurityIdentifier]) | Where-Object { $_.AccessControlType -eq 'Allow' -and $_.IdentityReference -ne $identity })
    $afterHash = (Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash
    if ($other.Count -ne 0 -or !$after.AreAccessRulesProtected -or $afterHash -cne $beforeHash) {
        throw 'Permission or content-preservation validation failed.'
    }
    [pscustomobject]@{ OwnerOnly = $true; InheritanceProtected = $true; FileContentsUnchanged = ($afterHash -ceq $beforeHash); KeySettingsChanged = $false } | ConvertTo-Json
} catch {
    Set-Acl -LiteralPath $file -AclObject $prior
    throw
}
