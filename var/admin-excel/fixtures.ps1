$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.IO.Compression
$taskPath=(Resolve-Path 'var/admin-excel').Path
function New-Workbook([string]$Name,[string]$Title,[bool]$Valid) {
  $stream=[IO.File]::Create((Join-Path $taskPath $Name))
  $zip=[IO.Compression.ZipArchive]::new($stream,[IO.Compression.ZipArchiveMode]::Create)
  try {
    $rows=@(@('ID','Đối tượng test','Các bước test','Kết quả mong đợi'),@('1',$Title,'Mở trang đăng nhập',$(if($Valid){'Hiển thị form đăng nhập'}else{''})))
    $xml='<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>'
    for($r=0;$r -lt $rows.Count;$r++) {
      $xml+='<row r="'+($r+1)+'">'
      for($col=0;$col -lt 4;$col++) { $cell=[string][char](65+$col)+($r+1); $value=[Security.SecurityElement]::Escape($rows[$r][$col]);$xml+='<c r="'+$cell+'" t="inlineStr"><is><t>'+$value+'</t></is></c>' }
      $xml+='</row>'
    }
    $xml+='</sheetData></worksheet>'
    $parts=@{
      '[Content_Types].xml'='<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>'
      '_rels/.rels'='<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'
      'xl/workbook.xml'='<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="TestCases" sheetId="1" r:id="rId1"/></sheets></workbook>'
      'xl/_rels/workbook.xml.rels'='<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>'
      'xl/worksheets/sheet1.xml'=$xml
    }
    foreach($entry in $parts.GetEnumerator()) { $writer=[IO.StreamWriter]::new($zip.CreateEntry($entry.Key).Open(),[Text.UTF8Encoding]::new($false)); try {$writer.Write($entry.Value)}finally{$writer.Dispose()} }
  } finally {$zip.Dispose();$stream.Dispose()}
}
New-Workbook 'import-a.xlsx' 'Đăng nhập A' $true
New-Workbook 'import-b.xlsx' 'Đăng nhập B' $true
New-Workbook 'import-invalid.xlsx' 'File cần sửa' $false
Write-Output 'Created three synthetic workbooks.'
