param(
    [Parameter(Mandatory = $true)][ValidateNotNullOrEmpty()][string]$OwnerUsername,
    [string]$VaultPath,
    [switch]$PlanOnly
)
$ErrorActionPreference = 'Stop'
if ($env:OS -ne 'Windows_NT') { throw 'This helper persists Windows User settings; use documented manual configuration on other systems.' }
. (Join-Path $PSScriptRoot 'local-ai/LocalAi.ps1')
$taskRoot = Split-Path -Parent $PSScriptRoot
$profilePath = [Environment]::GetFolderPath('UserProfile')
if (!$profilePath) { throw 'Windows user profile is unavailable.' }
Invoke-TmsLocalAiSetup -OwnerUsername $OwnerUsername -RepositoryPath $taskRoot -VaultPath $VaultPath `
    -DefaultVaultPath (Join-Path $profilePath '.tms-ai') -PlanOnly:$PlanOnly
