param(
    [Parameter(Mandatory = $true)][string]$Package,
    [ValidateRange(0,100)][double]$Minimum = 80,
    [string]$ReportPath = 'Backend/target/site/jacoco/jacoco.xml'
)
$ErrorActionPreference = 'Stop'
if (!(Test-Path -LiteralPath $ReportPath)) { throw 'JaCoCo report missing; run backend verify first.' }
[xml]$report = Get-Content -LiteralPath $ReportPath -Raw
$selected = @($report.report.package | Where-Object { $_.name -eq $Package -or $_.name.StartsWith($Package + '/') })
if (!$selected.Count) { throw 'Requested package was not present in the report.' }
$failed = $false
foreach ($metric in @('INSTRUCTION','BRANCH','LINE','METHOD')) {
    $covered = 0; $missed = 0
    foreach ($entry in $selected) {
        $counter = $entry.counter | Where-Object type -eq $metric
        $covered += [int]$counter.covered; $missed += [int]$counter.missed
    }
    $total = $covered + $missed
    $percentage = if ($total -eq 0) { 100.0 } else { 100.0 * $covered / $total }
    '{0}: {1:N2}% ({2}/{3})' -f $metric,$percentage,$covered,$total
    if ($percentage -lt $Minimum) { $failed = $true }
}
if ($failed) { Write-Output "FAIL: $Package is below $Minimum%."; exit 1 }
Write-Output "PASS: $Package meets $Minimum%. Report scope is this package, not the whole backend."
