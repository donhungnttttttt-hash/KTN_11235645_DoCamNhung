$ErrorActionPreference = 'Stop'
$listeners = @(Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue)
foreach ($listener in $listeners) {
    $runtimeProcess = Get-CimInstance Win32_Process -Filter ('ProcessId=' + $listener.OwningProcess)
    [pscustomobject]@{
        Port = $listener.LocalPort
        Pid = $runtimeProcess.ProcessId
        ParentPid = $runtimeProcess.ParentProcessId
        Name = $runtimeProcess.Name
        IsTmsBackend = ($runtimeProcess.CommandLine -match 'vn\.syp\.tms\.TmsApplication|tms-backend[^ ]*\.jar')
    } | ConvertTo-Json -Compress
}
$settingNames = @('OPENAI_API_KEY', 'TMS_OPENAI_BASE_URL', 'TMS_OPENAI_MODEL')
foreach ($settingName in $settingNames) {
    [pscustomobject]@{ Setting = $settingName; ProcessOverride = -not [string]::IsNullOrEmpty([Environment]::GetEnvironmentVariable($settingName, 'Process')); UserOverride = -not [string]::IsNullOrEmpty([Environment]::GetEnvironmentVariable($settingName, 'User')) } | ConvertTo-Json -Compress
}
