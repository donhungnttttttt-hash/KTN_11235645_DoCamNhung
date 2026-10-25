# Called only after the migration job has validated every resolved migration.
# Counts are a connection/privilege sanity check, not a pinned schema version.
function Assert-NativeSchemaSummary {
    param([AllowEmptyString()][string]$Summary)
    $parts=@($Summary.Trim() -split '\r?\n')
    [long]$tableCount=0
    [long]$appliedMigrations=0
    [long]$failedMigrations=0
    if($parts.Count -ne 3 -or
       ![long]::TryParse($parts[0],[ref]$tableCount) -or $tableCount -lt 1 -or
       ![long]::TryParse($parts[1],[ref]$appliedMigrations) -or $appliedMigrations -lt 1 -or
       ![long]::TryParse($parts[2],[ref]$failedMigrations) -or $failedMigrations -ne 0) {
        throw 'Unexpected native schema summary. Preserve checkpoint and inspect before starting app.'
    }
    return [pscustomobject]@{TableCount=$tableCount;AppliedMigrations=$appliedMigrations}
}
