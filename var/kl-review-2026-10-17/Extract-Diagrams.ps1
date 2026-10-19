$ErrorActionPreference='Stop'
$records=@()
Get-ChildItem -LiteralPath (Join-Path $PSScriptRoot 'extracted\KL\diagrams') -Filter '*.drawio' -File | ForEach-Object {
 $diagramFile=$_
 $xml=New-Object Xml.XmlDocument
 $xml.XmlResolver=$null
 $xml.Load($diagramFile.FullName)
 $cells=@($xml.SelectNodes('//mxCell')|ForEach-Object {
  $cell=$_
  $value=[Net.WebUtility]::HtmlDecode($cell.GetAttribute('value'))
  $text=[regex]::Replace($value,'<br\s*/?>',' / ')
  $text=[regex]::Replace($text,'<[^>]+>','')
  $geometry=$cell.SelectSingleNode('mxGeometry')
  [pscustomobject]@{id=$cell.GetAttribute('id');label=$text;vertex=$cell.GetAttribute('vertex');edge=$cell.GetAttribute('edge');parent=$cell.GetAttribute('parent');source=$cell.GetAttribute('source');target=$cell.GetAttribute('target');style=$cell.GetAttribute('style');x=$(if($geometry){$geometry.GetAttribute('x')}else{''});y=$(if($geometry){$geometry.GetAttribute('y')}else{''});width=$(if($geometry){$geometry.GetAttribute('width')}else{''});height=$(if($geometry){$geometry.GetAttribute('height')}else{''})}
 })
 $model=$xml.SelectSingleNode('//mxGraphModel')
 $records+=[pscustomobject]@{file=$diagramFile.Name;title=$xml.SelectSingleNode('//diagram').GetAttribute('name');pageWidth=$model.GetAttribute('pageWidth');pageHeight=$model.GetAttribute('pageHeight');cells=$cells}
}
$records|ConvertTo-Json -Depth 12|Set-Content -LiteralPath (Join-Path $PSScriptRoot 'diagrams.json') -Encoding UTF8
Write-Output ('Parsed '+$records.Count+' diagrams')
