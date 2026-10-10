param([switch]$ShowPassword)
$root=Split-Path -Parent $PSScriptRoot
$file=Join-Path $root '.env.mysql.local'
if(!(Test-Path -LiteralPath $file)){throw 'Run Initialize-NativeMySql.ps1 first; native connection has not been provisioned.'}
$settings=@{};foreach($line in [IO.File]::ReadAllLines($file)){if($line -match '^([A-Z_]+)=(.*)$'){$settings[$Matches[1]]=$Matches[2]}}
Write-Output 'Connection name: TMS - MySQL Windows'
Write-Output 'Connection method: Standard (TCP/IP)'
foreach($key in @('TMS_MYSQL_HOST','TMS_MYSQL_PORT','TMS_DB_NAME','TMS_VIEWER_USER')){Write-Output "$key=$($settings[$key])"}
if($ShowPassword){Write-Output ('Password: '+$settings['TMS_VIEWER_PASSWORD'])}else{Write-Output 'Use -ShowPassword in your own terminal to view the viewer password; do not share the output.'}
