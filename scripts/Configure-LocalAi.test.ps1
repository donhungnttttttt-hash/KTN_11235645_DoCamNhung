# No User/Machine environment, database or real vault writes. All side effects mocked.
$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$module = Join-Path $PSScriptRoot 'local-ai/LocalAi.ps1'
$script:passed = 0
function Check([string]$Name, [scriptblock]$Body) {
    & $Body
    $script:passed++
    Write-Output "PASS $Name"
}
function Equal($Actual, $Expected) { if ($Actual -cne $Expected) { throw 'Assertion failed (values withheld).' } }
function Reject([scriptblock]$Body) {
    $rejected = $false
    try { & $Body | Out-Null } catch { $rejected = $true }
    if (!$rejected) { throw 'Expected rejection.' }
}
if (!(Test-Path -LiteralPath $module)) { throw 'RED: local AI environment loader/setup module is missing.' }
. $module
# Retain real filesystem validators for a disposable test directory only.
$pathValidator = ${function:Assert-TmsAiVaultPath}
$vaultValidator = ${function:Assert-TmsAiVaultReady}
$vaultProtector = ${function:Protect-TmsAiVault}
# Override I/O seams before executing any tested functions.
$script:settings = @{ Process = @{}; User = @{}; Machine = @{} }
$script:writes = @()
function Get-TmsAiVariable([string]$Name, [string]$Scope) { return $script:settings[$Scope][$Name] }
function Set-TmsAiVariable([string]$Name, [string]$Value, [string]$Scope) {
    if ($script:failWrite -eq $Name) { $script:failWrite = $null; throw 'Mock registry failure.' }
    $script:writes += "$Scope/$Name"
    if ([string]::IsNullOrEmpty($Value)) { $script:settings[$Scope].Remove($Name) }
    else { $script:settings[$Scope][$Name] = $Value }
}
$script:protected = 0
function Assert-TmsAiVaultPath([string]$Path, [string]$RepositoryPath) {
    if ($Path.StartsWith($RepositoryPath, [StringComparison]::OrdinalIgnoreCase)) { throw 'Vault inside repository.' }
    return $Path
}
function Assert-TmsAiVaultReady([string]$Path, [bool]$HasIdentity, [bool]$HasKey) {}
function Protect-TmsAiVault([string]$Path, [bool]$HasKey) { $script:protected++ }
function Read-TmsAiConfig([string]$Path) { return $script:configLines }
function Resolve-TmsAiOwner([string]$Username, [string]$RepositoryPath) {
    if ($Username -cne 'admin.local') { throw 'Owner not found or disabled.' }
    return 'cc166570-78be-4d67-b514-5cada01f3738'
}
function Reset-Mocks {
    $script:settings = @{ Process = @{}; User = @{}; Machine = @{} }
    $script:writes = @()
    $script:protected = 0
    $script:configLines = @()
    $script:failWrite = $null
}
function Configure { Invoke-TmsLocalAiSetup -OwnerUsername 'admin.local' -RepositoryPath $taskRoot -DefaultVaultPath 'C:\Users\test\.tms-ai' }
Check 'stale parent loads saved AI User settings without exposing secrets' {
    Reset-Mocks
    $script:settings.User.TMS_CHATGPT_VAULT_KEY = 'saved-test-secret'
    $script:settings.User.TMS_CHATGPT_LOCAL_ENABLED = 'true'
    $output = @(Import-TmsLocalAiEnvironment)
    Equal $output.Count 0
    Equal $script:settings.Process.TMS_CHATGPT_VAULT_KEY 'saved-test-secret'
}
Check 'process override wins and non-allowlisted User settings stay untouched' {
    Reset-Mocks
    $script:settings.Process.TMS_OLLAMA_ENABLED = 'false'
    $script:settings.User.TMS_OLLAMA_ENABLED = 'true'
    $script:settings.User.AWS_SECRET_ACCESS_KEY = 'unrelated-secret'
    $script:settings.User.SERVER_ADDRESS = '0.0.0.0'
    Import-TmsLocalAiEnvironment
    Equal $script:settings.Process.TMS_OLLAMA_ENABLED 'false'
    Equal $script:settings.Process.AWS_SECRET_ACCESS_KEY $null
    Equal $script:settings.Process.SERVER_ADDRESS $null
}
Check 'native file API configuration survives restart without registry copies or output' {
    Reset-Mocks
    $script:configLines = @('TMS_OPENAI_ENABLED=true', 'OPENAI_API_KEY=fake-api-secret', 'TMS_OPENAI_MODEL=existing-model', 'SERVER_ADDRESS=0.0.0.0')
    $output = @(Import-TmsLocalAiEnvironment -ConfigFile 'mock.env')
    Equal $script:settings.Process.OPENAI_API_KEY 'fake-api-secret'
    Equal $script:settings.Process.TMS_OPENAI_ENABLED 'true'
    Equal $script:settings.Process.TMS_OPENAI_MODEL 'existing-model'
    Equal $script:settings.User.OPENAI_API_KEY $null
    Equal $script:settings.Process.SERVER_ADDRESS $null
    Equal $output.Count 0
}
Check 'AI loader precedence is Process then User then selected file' {
    Reset-Mocks
    $script:settings.Process.OPENAI_API_KEY = 'process-secret'
    $script:settings.User.OPENAI_API_KEY = 'user-secret'
    $script:settings.User.TMS_OPENAI_MODEL = 'user-model'
    $script:configLines = @('OPENAI_API_KEY=file-secret', 'TMS_OPENAI_MODEL=file-model')
    Import-TmsLocalAiEnvironment -ConfigFile 'mock.env'
    Equal $script:settings.Process.OPENAI_API_KEY 'process-secret'
    Equal $script:settings.Process.TMS_OPENAI_MODEL 'user-model'
}
Check 'fresh setup resolves immutable owner and creates stable valid credentials' {
    Reset-Mocks
    $output = @(Configure)
    Equal $script:settings.User.TMS_CHATGPT_OWNER_ID 'cc166570-78be-4d67-b514-5cada01f3738'
    Equal $script:settings.User.TMS_BIND_ADDRESS '127.0.0.1'
    Equal $script:settings.User.TMS_CHATGPT_LOCAL_ENABLED 'true'
    Equal ([Convert]::FromBase64String($script:settings.User.TMS_CHATGPT_VAULT_KEY).Length) 32
    if ($script:settings.User.TMS_CHATGPT_HOST_ID -notmatch '^urn:uuid:[0-9a-f-]{36}$') { throw 'Invalid host UUID.' }
    if (($output -join '') -match [regex]::Escape($script:settings.User.TMS_CHATGPT_VAULT_KEY)) { throw 'Secret leaked.' }
    Equal $script:settings.User.SERVER_ADDRESS $null
    Equal $script:settings.User.TMS_OLLAMA_ENABLED $null
    Equal $script:settings.User.TMS_OPENAI_ENABLED $null
    Equal $script:protected 1
}
Check 'repeat setup preserves owner host vault and key exactly' {
    Reset-Mocks
    Configure | Out-Null
    $before = @{} + $script:settings.User
    Configure | Out-Null
    foreach ($name in $before.Keys) { Equal $script:settings.User[$name] $before[$name] }
}
Check 'setup preserves existing complete native-file ChatGPT credentials' {
    Reset-Mocks
    Configure | Out-Null
    $before = @{} + $script:settings.User
    Reset-Mocks
    $script:configLines = @($before.Keys | ForEach-Object { "$_=$($before[$_])" })
    Configure | Out-Null
    foreach ($name in @('TMS_CHATGPT_OWNER_ID', 'TMS_CHATGPT_HOST_ID', 'TMS_CHATGPT_VAULT_PATH', 'TMS_CHATGPT_VAULT_KEY')) {
        Equal $script:settings.User[$name] $before[$name]
    }
}
Check 'setup rejects native-file owner conflict without registry mutation' {
    Reset-Mocks
    $script:configLines = @('TMS_CHATGPT_OWNER_ID=another-owner')
    Reject { Configure }
    Equal $script:writes.Count 0
}
Check 'setup rejects native-file app binding conflict without masking it in User settings' {
    Reset-Mocks
    $script:configLines = @('TMS_BIND_ADDRESS=0.0.0.0')
    Reject { Configure }
    Equal $script:writes.Count 0
}
Check 'registry failure restores original touched values and leaves enablement absent' {
    Reset-Mocks
    $script:settings.User.TMS_CHATGPT_OWNER_ID = 'cc166570-78be-4d67-b514-5cada01f3738'
    $script:failWrite = 'TMS_CHATGPT_VAULT_KEY'
    Reject { Configure }
    Equal $script:settings.User.TMS_CHATGPT_OWNER_ID 'cc166570-78be-4d67-b514-5cada01f3738'
    Equal $script:settings.User.TMS_CHATGPT_HOST_ID $null
    Equal $script:settings.User.TMS_CHATGPT_VAULT_PATH $null
    Equal $script:settings.User.TMS_CHATGPT_LOCAL_ENABLED $null
}
Check 'PlanOnly validates but has no environment or vault mutations' {
    Reset-Mocks
    Invoke-TmsLocalAiSetup -OwnerUsername 'admin.local' -RepositoryPath $taskRoot -DefaultVaultPath 'C:\Users\test\.tms-ai' -PlanOnly | Out-Null
    Equal $script:writes.Count 0
    Equal $script:protected 0
}
Check 'different pre-existing owner is rejected before mutation' {
    Reset-Mocks
    $script:settings.User.TMS_CHATGPT_OWNER_ID = 'another-owner'
    Reject { Configure }
    Equal $script:writes.Count 0
    Equal $script:protected 0
}
Check 'conflicting Process and User vault key rejects before mutation' {
    Reset-Mocks
    $script:settings.User.TMS_CHATGPT_VAULT_KEY = [Convert]::ToBase64String((New-Object byte[] 32))
    $script:settings.Process.TMS_CHATGPT_VAULT_KEY = [Convert]::ToBase64String((New-Object byte[] 33))
    Reject { Configure }
    Equal $script:writes.Count 0
}
Check 'invalid pre-existing key is preserved and rejected' {
    Reset-Mocks
    $script:settings.User.TMS_CHATGPT_VAULT_KEY = 'not-base64'
    Reject { Configure }
    Equal $script:settings.User.TMS_CHATGPT_VAULT_KEY 'not-base64'
    Equal $script:writes.Count 0
}
Check 'invalid pre-existing host is rejected without replacement' {
    Reset-Mocks
    $script:settings.User.TMS_CHATGPT_HOST_ID = 'unstable-host'
    Reject { Configure }
    Equal $script:writes.Count 0
}
Check 'explicit replacement vault is rejected' {
    Reset-Mocks
    $script:settings.User.TMS_CHATGPT_VAULT_PATH = 'C:\Users\test\existing'
    Reject { Invoke-TmsLocalAiSetup -OwnerUsername 'admin.local' -RepositoryPath $taskRoot -VaultPath 'C:\Users\test\replacement' -DefaultVaultPath 'C:\Users\test\.tms-ai' }
    Equal $script:writes.Count 0
}
Check 'unknown or disabled owner fails before mutation' {
    Reset-Mocks
    Reject { Invoke-TmsLocalAiSetup -OwnerUsername 'missing' -RepositoryPath $taskRoot -DefaultVaultPath 'C:\Users\test\.tms-ai' }
    Equal $script:writes.Count 0
}
foreach ($scope in @('Process', 'User', 'Machine')) {
    Check "conflicting generic Spring bind in $scope fails closed" {
        Reset-Mocks
        $script:settings[$scope].SERVER_ADDRESS = '0.0.0.0'
        Reject { Configure }
        Equal $script:writes.Count 0
    }
}
Check 'existing app-specific non-loopback bind fails closed' {
    Reset-Mocks
    $script:settings.User.TMS_BIND_ADDRESS = '0.0.0.0'
    Reject { Configure }
    Equal $script:writes.Count 0
}
Check 'Spring JSON binding override fails closed' {
    Reset-Mocks
    $script:settings.Process.SPRING_APPLICATION_JSON = '{"server":{"address":"0.0.0.0"}}'
    Reject { Configure }
    Equal $script:writes.Count 0
}
Check 'missing secret for an existing host is rejected rather than replaced' {
    Reset-Mocks
    $script:settings.User.TMS_CHATGPT_HOST_ID = 'urn:uuid:11111111-1111-1111-1111-111111111111'
    $script:settings.User.TMS_CHATGPT_OWNER_ID = 'cc166570-78be-4d67-b514-5cada01f3738'
    $script:settings.User.TMS_CHATGPT_VAULT_PATH = 'C:\Users\test\existing'
    Reject { Configure }
    Equal $script:writes.Count 0
}
# Use actual validators with a GUID test directory; never an operational vault.
$testDirectory = Join-Path ([IO.Path]::GetTempPath()) ('tms-local-ai-test-' + [Guid]::NewGuid().ToString())
try {
    Check 'real path validator rejects repo case variation relative UNC and drive roots' {
        foreach ($path in @($taskRoot, (Join-Path $taskRoot.ToUpperInvariant() 'vault'), 'relative-vault', '\\server\vault', 'C:\')) {
            Reject { & $pathValidator $path $taskRoot }
        }
        Equal (& $pathValidator $testDirectory $taskRoot) $testDirectory.TrimEnd('\')
    }
    Check 'real ACL helper creates owner-only disposable directory' {
        & $vaultProtector $testDirectory $true
        & $vaultValidator $testDirectory $true $true
        Equal (Test-Path -LiteralPath $testDirectory) $true
    }
    Check 'existing ciphertext rejects incomplete identity and keeps bytes unchanged' {
        $fakeCiphertext = Join-Path $testDirectory 'chatgpt.enc'
        [IO.File]::WriteAllText($fakeCiphertext, 'synthetic-ciphertext-only')
        Reject { & $vaultValidator $testDirectory $false $false }
        Equal ([IO.File]::ReadAllText($fakeCiphertext)) 'synthetic-ciphertext-only'
    }
    Check 'existing permissive vault ACL is rejected without modification' {
        $acl = [Security.AccessControl.DirectorySecurity]::new()
        $identity = [Security.Principal.WindowsIdentity]::GetCurrent().User
        $acl.SetOwner($identity)
        $acl.SetAccessRuleProtection($true, $false)
        $acl.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new($identity, 'FullControl', 'ContainerInherit,ObjectInherit', 'None', 'Allow'))
        $other = [Security.Principal.SecurityIdentifier]::new('S-1-1-0')
        $rule = [Security.AccessControl.FileSystemAccessRule]::new($other, 'Read', 'Allow')
        $acl.AddAccessRule($rule)
        [IO.Directory]::SetAccessControl($testDirectory, $acl)
        $beforeAcl = (Get-Acl -LiteralPath $testDirectory).Sddl
        Reject { & $vaultValidator $testDirectory $true $true }
        Equal (Get-Acl -LiteralPath $testDirectory).Sddl $beforeAcl
    }
} finally {
    # Verify absolute temp target before recursive deletion; no computed repo paths.
    $resolved = [IO.Path]::GetFullPath($testDirectory)
    $tempRoot = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\') + '\'
    if (!$resolved.StartsWith($tempRoot, [StringComparison]::OrdinalIgnoreCase) -or
        [IO.Path]::GetFileName($resolved) -notmatch '^tms-local-ai-test-[0-9a-f-]{36}$') { throw 'Unsafe test cleanup path.' }
    if (Test-Path -LiteralPath $resolved) { Remove-Item -LiteralPath $resolved -Recurse -Force }
}
Write-Output "Local AI setup: $script:passed tests PASS; User environment/database/real vault untouched; coverage NOT_MEASURED."
