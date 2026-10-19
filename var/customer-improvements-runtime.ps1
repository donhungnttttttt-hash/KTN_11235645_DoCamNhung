param([switch]$Restart)
$ErrorActionPreference = 'Stop'
$taskRoot = 'D:\DCN\KTN_11235645_DoCamNhung'
$owners = @(Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique)
foreach ($owner in $owners) {
    $proc = Get-CimInstance Win32_Process -Filter ('ProcessId=' + $owner)
    $isTms = $proc.Name -eq 'java.exe' -and ($proc.CommandLine -match 'vn.syp.tms.TmsApplication|tms-backend' -or $proc.CommandLine.Contains('D:\DCN\KTN_11235645_DoCamNhung\Backend\var\runtime\tms-'))
    if (!$isTms -and $proc.CommandLine -match '@"?([^" ]+\.argfile)') {
        $argFile = $Matches[1]
        if (Test-Path -LiteralPath $argFile) {
            $argText = [IO.File]::ReadAllText($argFile)
            $isTms = $argText -match 'KTN_11235645_DoCamNhung' -and $argText -match 'vn.syp.tms.TmsApplication|Backend.target.classes'
        }
    }
    if (!$isTms) { Write-Output ($proc.CommandLine.Substring(0,[Math]::Min(240,$proc.CommandLine.Length)) -replace '(?i)(password|secret|token)=\S+','$1=[redacted]') }
    [pscustomobject]@{ PID=$owner; Name=$proc.Name; IsTms=$isTms } | ConvertTo-Json -Compress
    if ($Restart) {
        if (!$isTms) { throw 'Port 8080 is not the verified TMS Java process.' }
        Stop-Process -Id $owner
        Wait-Process -Id $owner -Timeout 15 -ErrorAction SilentlyContinue
    }
}
if ($Restart) {
    Start-Process -FilePath 'powershell.exe' -WindowStyle Hidden -WorkingDirectory $taskRoot -ArgumentList @('-NoProfile','-File', (Join-Path $taskRoot 'scripts/Start-Backend.ps1')) -RedirectStandardOutput (Join-Path $taskRoot 'var/customer-improvements-backend.log') -RedirectStandardError (Join-Path $taskRoot 'var/customer-improvements-backend-error.log') | Out-Null
    Write-Output 'Started TMS backend; readiness remains to be checked.'
}
