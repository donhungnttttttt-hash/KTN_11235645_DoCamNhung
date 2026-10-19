$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$artifactRoot=[IO.Path]::GetFullPath($PSScriptRoot)
$sourceRoot=Join-Path $artifactRoot 'extracted\KL'
$textRoot=Join-Path $artifactRoot 'text'
$mediaRoot=Join-Path $artifactRoot 'media'
[IO.Directory]::CreateDirectory($textRoot)|Out-Null
[IO.Directory]::CreateDirectory($mediaRoot)|Out-Null
$fileRecords=@()
$docIndex=0
Get-ChildItem -LiteralPath $sourceRoot -Filter '*.docx' -File | ForEach-Object {
 $docIndex++
 $sourceFile=$_
 $documentKey='D'+$docIndex
 $package=[IO.Compression.ZipFile]::OpenRead($sourceFile.FullName)
 try {
  $xmlEntry=$package.GetEntry('word/document.xml')
  if(-not $xmlEntry){throw ('No document.xml in '+$sourceFile.Name)}
  $reader=New-Object IO.StreamReader($xmlEntry.Open())
  try {$xmlText=$reader.ReadToEnd()}finally{$reader.Dispose()}
  $xml=New-Object Xml.XmlDocument
  $xml.XmlResolver=$null
  $xml.LoadXml($xmlText)
  $ns=New-Object Xml.XmlNamespaceManager($xml.NameTable)
  $ns.AddNamespace('w','http://schemas.openxmlformats.org/wordprocessingml/2006/main')
  $ns.AddNamespace('a','http://schemas.openxmlformats.org/drawingml/2006/main')
  $ns.AddNamespace('r','http://schemas.openxmlformats.org/officeDocument/2006/relationships')
  $ns.AddNamespace('wp','http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing')
  $paragraphs=@()
  $paragraphNumber=0
  foreach($paragraph in $xml.SelectNodes('//w:body//w:p',$ns)) {
   $paragraphNumber++
   $parts=@($paragraph.SelectNodes('.//w:t | .//w:tab | .//w:br',$ns)|ForEach-Object {if($_.LocalName -eq 't'){$_.InnerText}else{' '}})
   $text=$parts -join ''
   $styleNode=$paragraph.SelectSingleNode('w:pPr/w:pStyle',$ns)
   $style=if($styleNode){$styleNode.GetAttribute('val',$ns.LookupNamespace('w'))}else{''}
   $tableNode=$paragraph.SelectSingleNode('ancestor::w:tbl[1]',$ns)
   $pictures=@($paragraph.SelectNodes('.//wp:docPr',$ns)|ForEach-Object {[pscustomobject]@{name=$_.GetAttribute('name');description=$_.GetAttribute('descr')}})
   $blips=@($paragraph.SelectNodes('.//a:blip',$ns)|ForEach-Object {$_.GetAttribute('embed',$ns.LookupNamespace('r'))})
   $paragraphs+= [pscustomobject]@{id=('{0}-P{1:D4}' -f $documentKey,$paragraphNumber);style=$style;inTable=($null -ne $tableNode);text=$text;pictureProperties=$pictures;imageRelationshipIds=$blips}
  }
  $tables=@()
  $tableNumber=0
  foreach($table in $xml.SelectNodes('//w:body/w:tbl',$ns)) {
   $tableNumber++
   $rows=@()
   foreach($row in $table.SelectNodes('w:tr',$ns)) {
    $cells=@($row.SelectNodes('w:tc',$ns)|ForEach-Object {(@($_.SelectNodes('.//w:p',$ns)|ForEach-Object {(@($_.SelectNodes('.//w:t',$ns)|ForEach-Object {$_.InnerText}) -join '')}) -join ' / ')})
    $rows+=,[object]$cells
   }
   $tables+= [pscustomobject]@{id=('{0}-T{1:D3}' -f $documentKey,$tableNumber);rows=$rows}
  }
  $relations=@()
  $relsEntry=$package.GetEntry('word/_rels/document.xml.rels')
  if($relsEntry){$reader=New-Object IO.StreamReader($relsEntry.Open());try{$relsText=$reader.ReadToEnd()}finally{$reader.Dispose()};$rels=New-Object Xml.XmlDocument;$rels.XmlResolver=$null;$rels.LoadXml($relsText);$relations=@($rels.DocumentElement.ChildNodes|ForEach-Object {[pscustomobject]@{id=$_.Id;type=$_.Type;target=$_.Target;mode=$_.TargetMode}})}
  $images=@($package.Entries|Where-Object {$_.FullName.StartsWith('word/media/') -and $_.Length -gt 0})
  $outMedia=Join-Path $mediaRoot $documentKey
  [IO.Directory]::CreateDirectory($outMedia)|Out-Null
  foreach($entry in $images){$mediaFile=Join-Path $outMedia ([IO.Path]::GetFileName($entry.FullName));if(-not [IO.File]::Exists($mediaFile)){[IO.Compression.ZipFileExtensions]::ExtractToFile($entry,$mediaFile,$false)}}
  $record=[pscustomobject]@{id=$documentKey;file=$sourceFile.Name;sha256=(Get-FileHash -LiteralPath $sourceFile.FullName -Algorithm SHA256).Hash;paragraphs=$paragraphs;tables=$tables;relationships=$relations;mediaCount=$images.Count;media=@($images|ForEach-Object {[pscustomobject]@{name=$_.FullName;bytes=$_.Length}})}
  $record|ConvertTo-Json -Depth 18|Set-Content -LiteralPath (Join-Path $textRoot ($documentKey+'.json')) -Encoding UTF8
  @($paragraphs|ForEach-Object {if($_.text -or $_.imageRelationshipIds.Count){'['+$_.id+']['+$_.style+'] '+$_.text+ $(if($_.imageRelationshipIds.Count){' [IMAGE '+($_.imageRelationshipIds -join ',')+']'}else{''})}})|Set-Content -LiteralPath (Join-Path $textRoot ($documentKey+'.txt')) -Encoding UTF8
  $fileRecords+=[pscustomobject]@{id=$documentKey;file=$sourceFile.Name;sha256=$record.sha256;paragraphs=$paragraphs.Count;tables=$tables.Count;images=$images.Count;characters=($paragraphs.text -join '').Length}
 }finally{$package.Dispose()}
}
$fileRecords|ConvertTo-Json -Depth 8|Set-Content -LiteralPath (Join-Path $artifactRoot 'document-index.json') -Encoding UTF8
$fileRecords|Format-Table -AutoSize
