$ErrorActionPreference = 'Stop'
$variables = @('TMS_CHATGPT_LOCAL_ENABLED','TMS_CHATGPT_OWNER_ID','TMS_CHATGPT_HOST_ID','TMS_CHATGPT_VAULT_PATH','TMS_CHATGPT_VAULT_KEY')
$comparison = @()
foreach ($name in $variables) {
    $processValue = [Environment]::GetEnvironmentVariable($name, 'Process')
    $userValue = [Environment]::GetEnvironmentVariable($name, 'User')
    $machineValue = [Environment]::GetEnvironmentVariable($name, 'Machine')
    $comparison += [pscustomobject]@{ Name = $name; ProcessPresent = (-not [string]::IsNullOrEmpty($processValue)); UserPresent = (-not [string]::IsNullOrEmpty($userValue)); MachinePresent = (-not [string]::IsNullOrEmpty($machineValue)); ProcessEqualsUser = ($processValue -ceq $userValue) }
}
$path = [Environment]::GetEnvironmentVariable('TMS_CHATGPT_VAULT_PATH', 'Process')
$file = Join-Path $path 'chatgpt.enc'
$identity = [Security.Principal.WindowsIdentity]::GetCurrent().User
$paths = @()
foreach ($candidate in @($path, $file)) {
    if (!(Test-Path -LiteralPath $candidate)) {
        $paths += [pscustomobject]@{ Path = $candidate; Exists = $false }
        continue
    }
    $item = Get-Item -LiteralPath $candidate -Force
    $acl = Get-Acl -LiteralPath $candidate
    $owner = $acl.GetOwner([Security.Principal.SecurityIdentifier])
    $others = @($acl.GetAccessRules($true, $true, [Security.Principal.SecurityIdentifier]) | Where-Object { $_.AccessControlType -eq 'Allow' -and $_.IdentityReference -ne $owner })
    $entry = [ordered]@{ Path = $candidate; Exists = $true; Directory = $item.PSIsContainer; ReparsePoint = [bool]($item.Attributes -band [IO.FileAttributes]::ReparsePoint); OwnerIsCurrentUser = ($owner -eq $identity); OwnerOnlyAllowEntries = ($others.Count -eq 0); OtherAllowEntryCount = $others.Count; InheritanceProtected = $acl.AreAccessRulesProtected; LastWriteTimeUtc = $item.LastWriteTimeUtc.ToString('o') }
    if (!$item.PSIsContainer) {
        $entry.Bytes = $item.Length
        $entry.Sha256 = (Get-FileHash -LiteralPath $candidate -Algorithm SHA256).Hash
    }
    $paths += [pscustomobject]$entry
}
$keyValid = $false
try {
    $rawKey = [Convert]::FromBase64String([Environment]::GetEnvironmentVariable('TMS_CHATGPT_VAULT_KEY', 'Process'))
    $keyValid = ($rawKey.Length -eq 32)
} catch { $keyValid = $false }
finally { if ($rawKey) { [Array]::Clear($rawKey, 0, $rawKey.Length) } }
$result = [ordered]@{ ConfigurationScopes = $comparison; KeyValidLength = $keyValid; Paths = $paths }
$output = $result | ConvertTo-Json -Depth 6
$output | Set-Content -LiteralPath 'D:\DCN\KTN_11235645_DoCamNhung\var\startup-diagnosis-2026-10-18\vault-metadata.json' -Encoding UTF8
$output
