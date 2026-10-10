# Shared local setup/startup functions. Loading this file performs no I/O.
function Get-TmsAiVariable([string]$Name, [string]$Scope) {
    return [Environment]::GetEnvironmentVariable($Name, $Scope)
}
function Set-TmsAiVariable([string]$Name, [string]$Value, [string]$Scope) {
    [Environment]::SetEnvironmentVariable($Name, $Value, $Scope)
}
function Read-TmsAiConfig([string]$Path) { return [IO.File]::ReadAllLines($Path) }
function Get-TmsAiFileSettings([string]$ConfigFile, [string[]]$Names) {
    $values = @{}
    if ($ConfigFile) {
        foreach ($line in (Read-TmsAiConfig $ConfigFile)) {
            if ($line -match '^([A-Z_]+)=(.*)$' -and $Matches[1] -in $Names) {
                $values[$Matches[1]] = $Matches[2]
            }
        }
    }
    return $values
}
function Import-TmsLocalAiEnvironment([string]$ConfigFile) {
    # Process > Windows User > selected local file. Never writes User/Machine.
    $names = @('TMS_BIND_ADDRESS', 'TMS_CHATGPT_LOCAL_ENABLED', 'TMS_CHATGPT_OWNER_ID',
        'TMS_CHATGPT_HOST_ID', 'TMS_CHATGPT_VAULT_PATH', 'TMS_CHATGPT_VAULT_KEY',
        'TMS_OLLAMA_ENABLED', 'TMS_OLLAMA_URL', 'TMS_OPENAI_ENABLED', 'OPENAI_API_KEY',
        'TMS_OPENAI_MODEL', 'TMS_OPENAI_TIMEOUT_SECONDS', 'TMS_OPENAI_MAX_OUTPUT_TOKENS',
        'TMS_OPENAI_REQUEST_LIMIT', 'TMS_AI_DRAFT_RETENTION_DAYS', 'TMS_AI_PROJECT_DAILY_LIMIT',
        'TMS_AI_DRAFT_CLEANUP_CRON', 'TMS_AI_CHAT_USER_DAILY_LIMIT', 'TMS_AI_CHAT_CLEANUP_CRON')
    $fileValues = Get-TmsAiFileSettings $ConfigFile $names
    foreach ($name in $names) {
        if (![string]::IsNullOrEmpty((Get-TmsAiVariable $name 'Process'))) { continue }
        $value = Get-TmsAiVariable $name 'User'
        if ([string]::IsNullOrEmpty($value)) { $value = $fileValues[$name] }
        if (![string]::IsNullOrEmpty($value)) { Set-TmsAiVariable $name $value 'Process' }
    }
}
function Resolve-TmsAiOwner([string]$Username, [string]$RepositoryPath) {
    $resolver = Join-Path $PSScriptRoot 'resolve-owner.cjs'
    $result = & rtk proxy node $resolver $Username $RepositoryPath
    if ($LASTEXITCODE -ne 0 -or "$result" -notmatch '^[0-9a-fA-F-]{36}$') {
        throw 'Read-only owner lookup failed; no local AI setting was changed.'
    }
    return "$result"
}
function Assert-TmsAiVaultPath([string]$Path, [string]$RepositoryPath) {
    if ($Path -notmatch '^[A-Za-z]:[\\/]') { throw 'Vault needs an absolute local Windows drive path.' }
    $full = [IO.Path]::GetFullPath($Path).TrimEnd('\', '/')
    $root = [IO.Path]::GetFullPath($RepositoryPath).TrimEnd('\', '/')
    if ($full.Equals($root, [StringComparison]::OrdinalIgnoreCase) -or
        $full.StartsWith($root + '\', [StringComparison]::OrdinalIgnoreCase) -or
        $full -match '^[A-Za-z]:$') { throw 'Vault must be outside the repository and cannot be a drive root.' }
    # Reject junctions/symlinks at every existing ancestor; do not resolve through them.
    $cursor = $full
    while ($cursor) {
        if (Test-Path -LiteralPath $cursor) {
            $item = Get-Item -LiteralPath $cursor -Force
            if (!$item.PSIsContainer -or ($item.Attributes -band [IO.FileAttributes]::ReparsePoint)) {
                throw 'Vault path must use normal local directories without reparse points.'
            }
        }
        $cursor = [IO.Path]::GetDirectoryName($cursor)
    }
    return $full
}
function Assert-TmsAiVaultReady([string]$Path, [bool]$HasIdentity, [bool]$HasKey) {
    if (!(Test-Path -LiteralPath $Path)) { return }
    if (@(Get-ChildItem -LiteralPath $Path -Force).Count -gt 0 -and (!$HasIdentity -or !$HasKey)) {
        throw 'Existing vault data requires its original complete owner/host/path/key settings. No replacement key was generated.'
    }
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent().User
    $acl = Get-Acl -LiteralPath $Path
    if ($acl.GetOwner([Security.Principal.SecurityIdentifier]) -ne $identity -or
        @($acl.GetAccessRules($true, $true, [Security.Principal.SecurityIdentifier]) | Where-Object {
            $_.AccessControlType -eq 'Allow' -and $_.IdentityReference -ne $identity
        }).Count -gt 0) { throw 'Existing vault must already have owner-only ACL; inspect it without replacing credentials.' }
}
function Protect-TmsAiVault([string]$Path, [bool]$HasKey) {
    if (Test-Path -LiteralPath $Path) { return }
    [IO.Directory]::CreateDirectory($Path) | Out-Null
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent().User
    $acl = [Security.AccessControl.DirectorySecurity]::new()
    $acl.SetOwner($identity)
    $acl.SetAccessRuleProtection($true, $false)
    $rule = [Security.AccessControl.FileSystemAccessRule]::new($identity, 'FullControl', 'ContainerInherit,ObjectInherit', 'None', 'Allow')
    $acl.AddAccessRule($rule)
    [IO.Directory]::SetAccessControl($Path, $acl)
    Assert-TmsAiVaultReady $Path $true $true
}
function Get-TmsAiExisting([string]$Name, [hashtable]$FileValues) {
    $values = @()
    foreach ($scope in @('Process', 'User', 'Machine')) {
        $value = Get-TmsAiVariable $Name $scope
        if (![string]::IsNullOrEmpty($value)) { $values += $value }
    }
    if ($FileValues -and ![string]::IsNullOrEmpty($FileValues[$Name])) { $values += $FileValues[$Name] }
    $unique = @($values | Select-Object -Unique)
    if ($unique.Count -gt 1) { throw 'Conflicting local AI settings across Process/User/Machine/file scopes; review them without exposing credentials.' }
    if ($unique.Count -eq 1) { return $unique[0] }
    return $null
}
function Assert-TmsAiLoopbackSettings([hashtable]$FileValues) {
    if ($FileValues -and ![string]::IsNullOrEmpty($FileValues.TMS_BIND_ADDRESS) -and
        $FileValues.TMS_BIND_ADDRESS -cne '127.0.0.1') {
        throw 'Conflicting native-file TMS binding; review it instead of masking it with User settings.'
    }
    foreach ($scope in @('Process', 'User', 'Machine')) {
        foreach ($name in @('SERVER_ADDRESS', 'TMS_BIND_ADDRESS')) {
            $value = Get-TmsAiVariable $name $scope
            if (![string]::IsNullOrEmpty($value) -and $value -cne '127.0.0.1') {
                throw 'Conflicting Spring binding override; local ChatGPT requires 127.0.0.1. Review the existing override instead of changing global settings.'
            }
        }
        $jsonText = Get-TmsAiVariable 'SPRING_APPLICATION_JSON' $scope
        if (![string]::IsNullOrEmpty($jsonText)) {
            try { $json = ConvertFrom-Json $jsonText } catch { throw 'Invalid Spring JSON override; review existing configuration.' }
            $addresses = @($json.'server.address', $json.server.address) | Where-Object { $null -ne $_ }
            foreach ($address in $addresses) {
                if ($address -cne '127.0.0.1') { throw 'Conflicting Spring JSON binding override; local ChatGPT requires 127.0.0.1.' }
            }
        }
    }
}
function Invoke-TmsLocalAiSetup {
    param([string]$OwnerUsername, [string]$RepositoryPath, [string]$VaultPath,
        [string]$DefaultVaultPath, [switch]$PlanOnly)
    Assert-TmsAiLoopbackSettings
    $owner = Resolve-TmsAiOwner $OwnerUsername $RepositoryPath
    $fileSettings = Get-TmsAiFileSettings (Join-Path $RepositoryPath '.env.mysql.local') @(
        'TMS_CHATGPT_OWNER_ID', 'TMS_CHATGPT_HOST_ID', 'TMS_CHATGPT_VAULT_PATH', 'TMS_CHATGPT_VAULT_KEY', 'TMS_BIND_ADDRESS')
    Assert-TmsAiLoopbackSettings $fileSettings
    $existingOwner = Get-TmsAiExisting 'TMS_CHATGPT_OWNER_ID' $fileSettings
    $hostId = Get-TmsAiExisting 'TMS_CHATGPT_HOST_ID' $fileSettings
    $existingPath = Get-TmsAiExisting 'TMS_CHATGPT_VAULT_PATH' $fileSettings
    $key = Get-TmsAiExisting 'TMS_CHATGPT_VAULT_KEY' $fileSettings
    if ($existingOwner -and $existingOwner -cne $owner) { throw 'Configured TMS owner differs; preserve the current connection and review any owner change separately.' }
    if ($hostId -and $hostId -notmatch '^urn:uuid:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$') { throw 'Existing host UUID is invalid; it was not replaced.' }
    if ($VaultPath -and $existingPath -and $VaultPath -cne $existingPath) { throw 'Existing vault path differs; it was not replaced.' }
    if (!$key -and ($hostId -or $existingPath)) { throw 'Existing local AI identity lacks its original key; recover configuration instead of generating a replacement.' }
    if ($key) {
        try { $decoded = [Convert]::FromBase64String($key); if ($decoded.Length -ne 32) { throw 'Invalid size.' } }
        catch { throw 'Existing vault key is invalid; it was not replaced.' }
        finally { if ($decoded) { [Array]::Clear($decoded, 0, $decoded.Length) } }
    }
    $path = $existingPath
    if (!$path) { $path = $VaultPath }
    if (!$path) { $path = $DefaultVaultPath }
    $path = Assert-TmsAiVaultPath $path $RepositoryPath
    Assert-TmsAiVaultReady $path ([bool]($existingOwner -and $hostId -and $existingPath)) ([bool]$key)
    if ($PlanOnly) {
        Write-Output 'Local AI plan valid: exact enabled TMS owner, direct loopback binding, external owner-only vault. No environment/vault changes, OAuth, model download or inference.'
        return
    }
    if (!$hostId) { $hostId = 'urn:uuid:' + [Guid]::NewGuid().ToString() }
    if (!$key) {
        $bytes = New-Object byte[] 32
        $random = [Security.Cryptography.RandomNumberGenerator]::Create()
        try { $random.GetBytes($bytes); $key = [Convert]::ToBase64String($bytes) }
        finally { $random.Dispose(); [Array]::Clear($bytes, 0, $bytes.Length) }
    }
    Protect-TmsAiVault $path ([bool]$key)
    $settings = [ordered]@{ TMS_CHATGPT_OWNER_ID = $owner; TMS_CHATGPT_HOST_ID = $hostId;
        TMS_CHATGPT_VAULT_PATH = $(if ($existingPath) { $existingPath } else { $path });
        TMS_CHATGPT_VAULT_KEY = $key; TMS_BIND_ADDRESS = '127.0.0.1'; TMS_CHATGPT_LOCAL_ENABLED = 'true' }
    # Enable last. On failure, restore only touched User values, never existing vault contents.
    $previous = @{}; $written = @()
    try {
        foreach ($name in $settings.Keys) {
            $previous[$name] = Get-TmsAiVariable $name 'User'
            Set-TmsAiVariable $name $settings[$name] 'User'
            $written += $name
        }
    } catch {
        foreach ($name in $written) { Set-TmsAiVariable $name $previous[$name] 'User' }
        throw 'Local AI User settings could not be saved; touched settings restored. Inspect environment permissions; no credential was printed.'
    }
    Write-Output 'Local ChatGPT setup saved for the selected TMS owner. Restart the owned backend with Start-Backend.ps1; sign in as that owner and explicitly connect/probe in AI settings. Existing API/Ollama settings and credentials were preserved.'
}
