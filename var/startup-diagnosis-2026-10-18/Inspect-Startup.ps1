$ErrorActionPreference = 'Stop'
$repoPath = 'D:\DCN\KTN_11235645_DoCamNhung'
$localConfigPath = Join-Path $repoPath '.env.mysql.local'
$config = @{}
if (Test-Path -LiteralPath $localConfigPath) {
    foreach ($line in Get-Content -LiteralPath $localConfigPath -Encoding UTF8) {
        if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$') {
            $config[$matches[1]] = $matches[2].Trim()
        }
    }
}
$safeConfig = [ordered]@{ FileExists = (Test-Path -LiteralPath $localConfigPath) }
foreach ($name in @('TMS_MYSQL_HOST','TMS_MYSQL_PORT','TMS_DB_NAME')) {
    $safeConfig[$name] = $config[$name]
}
foreach ($name in @('TMS_DB_URL','TMS_DB_USER','TMS_DB_PASSWORD','TMS_MIGRATION_USER','TMS_MIGRATION_PASSWORD')) {
    $safeConfig[$name + '_Present'] = (-not [string]::IsNullOrWhiteSpace($config[$name]))
}
$envSummary = @()
foreach ($item in Get-ChildItem Env:) {
    if ($item.Name -match '^(TMS_|SPRING_|JAVA_HOME$|JAVA_TOOL_OPTIONS$|JDK_JAVA_OPTIONS$|MAVEN_OPTS$|MAVEN_ARGS$)') {
        $safeValue = if ($item.Name -match '^(TMS_MYSQL_HOST|TMS_MYSQL_PORT|TMS_DB_NAME|TMS_PORT|SPRING_PROFILES_ACTIVE|JAVA_HOME|TMS_LOCAL_CONFIG_FILE)$') { $item.Value } else { '[set; value hidden]' }
        $envSummary += [pscustomobject]@{ Name = $item.Name; Value = $safeValue }
    }
}
$listeners = @()
foreach ($connection in Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue) {
    if ($connection.LocalPort -in @(3306,3307,8080)) {
        $owner = Get-Process -Id $connection.OwningProcess -ErrorAction SilentlyContinue
        $listeners += [pscustomobject]@{ Address = $connection.LocalAddress; Port = $connection.LocalPort; ProcessId = $connection.OwningProcess; ProcessName = $owner.ProcessName }
    }
}
$services = Get-CimInstance Win32_Service -Filter "Name LIKE '%mysql%'" | Select-Object Name,State,StartMode,ProcessId
$result = [ordered]@{ LocalConfig = $safeConfig; Environment = $envSummary; Listeners = $listeners; MySqlServices = @($services) }
$result | ConvertTo-Json -Depth 6
