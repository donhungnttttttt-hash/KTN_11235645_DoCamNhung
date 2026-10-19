param([switch]$Extract)
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$sourceArchive='C:\Users\admin\Downloads\KL.zip'
$reviewRoot=[IO.Path]::GetFullPath($PSScriptRoot)
$outputRoot=[IO.Path]::GetFullPath((Join-Path $reviewRoot 'extracted'))
$zipReader=[IO.Compression.ZipFile]::OpenRead($sourceArchive)
try {
 $inventory=@($zipReader.Entries | ForEach-Object { [pscustomobject]@{name=$_.FullName;bytes=$_.Length;compressedBytes=$_.CompressedLength} })
 $manifest=[pscustomobject]@{archive=$sourceArchive;sha256=(Get-FileHash -LiteralPath $sourceArchive -Algorithm SHA256).Hash;entries=$inventory}
 $manifest | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $reviewRoot 'archive-inventory.json') -Encoding UTF8
 $inventory | Format-Table -AutoSize
 if($Extract) {
  [IO.Directory]::CreateDirectory($outputRoot) | Out-Null
  foreach($entry in $zipReader.Entries) {
   $entryPath=$entry.FullName.Replace('/',[IO.Path]::DirectorySeparatorChar)
   if([IO.Path]::IsPathRooted($entryPath)){throw 'Rooted archive entry rejected'}
   $target=[IO.Path]::GetFullPath((Join-Path $outputRoot $entryPath))
   if(-not $target.StartsWith($outputRoot+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)){throw 'Archive entry escaped extraction directory'}
   if($entry.FullName.EndsWith('/') -or $entry.FullName.EndsWith('\')){[IO.Directory]::CreateDirectory($target)|Out-Null;continue}
   [IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($target)) | Out-Null
   if([IO.File]::Exists($target)){throw 'Existing extraction target; refusing overwrite'}
   [IO.Compression.ZipFileExtensions]::ExtractToFile($entry,$target,$false)
  }
  Write-Output ('Extracted to '+$outputRoot)
 }
} finally {$zipReader.Dispose()}
