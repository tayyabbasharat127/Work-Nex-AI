$ErrorActionPreference = 'Stop'

$Root = (Resolve-Path '.').Path
$MarkdownPath = Join-Path $Root 'WorkNex-AI-User-Manual.md'
$OutputName = if ($args.Count -gt 0) { $args[0] } else { 'WorkNex-AI-User-Manual.docx' }
$OutputPath = Join-Path $Root $OutputName
$BuildDir = Join-Path $Root ('.docx-build-' + [DateTime]::Now.Ticks)

function Escape-Xml([string]$Text) {
  if ($null -eq $Text) { return '' }
  return [System.Security.SecurityElement]::Escape($Text)
}

function Text-Runs([string]$Text) {
  $parts = [regex]::Split($Text, '(\*\*[^*]+\*\*)')
  $runs = New-Object System.Collections.Generic.List[string]
  foreach ($part in $parts) {
    if ([string]::IsNullOrWhiteSpace($part)) { continue }
    if ($part.StartsWith('**') -and $part.EndsWith('**')) {
      $value = Escape-Xml($part.Substring(2, $part.Length - 4))
      $runs.Add("<w:r><w:rPr><w:b/></w:rPr><w:t xml:space=""preserve"">$value</w:t></w:r>")
    } else {
      $value = Escape-Xml($part)
      $runs.Add("<w:r><w:t xml:space=""preserve"">$value</w:t></w:r>")
    }
  }
  return ($runs -join '')
}

function Paragraph([string]$Text, [string]$Style = '') {
  $styleXml = ''
  if ($Style) { $styleXml = "<w:pPr><w:pStyle w:val=""$Style""/></w:pPr>" }
  return "<w:p>$styleXml$(Text-Runs $Text)</w:p>"
}

function Image-Paragraph([string]$RelId, [int]$WidthPx, [int]$HeightPx) {
  $maxCx = 5669280 # 6.2 inches in EMUs
  $cx = [int64]($WidthPx * 9525)
  $cy = [int64]($HeightPx * 9525)
  if ($cx -gt $maxCx) {
    $scale = $maxCx / $cx
    $cx = [int64]$maxCx
    $cy = [int64]($cy * $scale)
  }

  return @"
<w:p>
  <w:pPr><w:jc w:val="center"/></w:pPr>
  <w:r>
    <w:drawing>
      <wp:inline distT="0" distB="0" distL="0" distR="0">
        <wp:extent cx="$cx" cy="$cy"/>
        <wp:effectExtent l="0" t="0" r="0" b="0"/>
        <wp:docPr id="$($RelId.Replace('rId',''))" name="Screenshot $RelId"/>
        <wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr>
        <a:graphic>
          <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
            <pic:pic>
              <pic:nvPicPr>
                <pic:cNvPr id="0" name="Screenshot"/>
                <pic:cNvPicPr/>
              </pic:nvPicPr>
              <pic:blipFill>
                <a:blip r:embed="$RelId"/>
                <a:stretch><a:fillRect/></a:stretch>
              </pic:blipFill>
              <pic:spPr>
                <a:xfrm><a:off x="0" y="0"/><a:ext cx="$cx" cy="$cy"/></a:xfrm>
                <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
              </pic:spPr>
            </pic:pic>
          </a:graphicData>
        </a:graphic>
      </wp:inline>
    </w:drawing>
  </w:r>
</w:p>
"@
}

if (!(Test-Path $MarkdownPath)) {
  throw "Markdown file not found: $MarkdownPath"
}

New-Item -ItemType Directory -Force -Path $BuildDir, (Join-Path $BuildDir '_rels'), (Join-Path $BuildDir 'word'), (Join-Path $BuildDir 'word\_rels'), (Join-Path $BuildDir 'word\media') | Out-Null

$body = New-Object System.Collections.Generic.List[string]
$relationships = New-Object System.Collections.Generic.List[string]
$contentTypes = New-Object System.Collections.Generic.List[string]
$contentTypes.Add('<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>')
$contentTypes.Add('<Default Extension="xml" ContentType="application/xml"/>')
$contentTypes.Add('<Default Extension="png" ContentType="image/png"/>')
$contentTypes.Add('<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>')
$contentTypes.Add('<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>')

$paragraphBuffer = New-Object System.Collections.Generic.List[string]
$imageIndex = 1

function Flush-Paragraph {
  if ($script:paragraphBuffer.Count -gt 0) {
    $script:body.Add((Paragraph (($script:paragraphBuffer -join ' ').Trim())))
    $script:paragraphBuffer.Clear()
  }
}

Add-Type -AssemblyName System.Drawing

foreach ($line in Get-Content -LiteralPath $MarkdownPath) {
  $trim = $line.Trim()

  if ($trim -eq '---') {
    Flush-Paragraph
    continue
  }

  if ($trim -eq '') {
    Flush-Paragraph
    continue
  }

  if ($trim -match '^# (.+)$') {
    Flush-Paragraph
    $body.Add((Paragraph $Matches[1] 'Title'))
    continue
  }

  if ($trim -match '^## (.+)$') {
    Flush-Paragraph
    $body.Add((Paragraph $Matches[1] 'Heading1'))
    continue
  }

  if ($trim -match '^!\[[^\]]*\]\(([^)]+)\)$') {
    Flush-Paragraph
    $relativeImage = $Matches[1].Replace('/', '\')
    $imagePath = Join-Path $Root $relativeImage
    if (Test-Path $imagePath) {
      $ext = [System.IO.Path]::GetExtension($imagePath)
      $targetName = "image$imageIndex$ext"
      $targetPath = Join-Path $BuildDir "word\media\$targetName"
      Copy-Item -LiteralPath $imagePath -Destination $targetPath -Force

      $img = [System.Drawing.Image]::FromFile($imagePath)
      $width = $img.Width
      $height = $img.Height
      $img.Dispose()

      $relId = "rId$imageIndex"
      $relationships.Add("<Relationship Id=""$relId"" Type=""http://schemas.openxmlformats.org/officeDocument/2006/relationships/image"" Target=""media/$targetName""/>")
      $body.Add((Image-Paragraph $relId $width $height))
      $imageIndex++
    } else {
      $body.Add((Paragraph "[Missing image: $($Matches[1])]" 'Normal'))
    }
    continue
  }

  if ($trim.StartsWith('*') -and $trim.EndsWith('*') -and $trim.Length -gt 2) {
    Flush-Paragraph
    $body.Add((Paragraph $trim.Trim('*') 'Normal'))
    continue
  }

  $paragraphBuffer.Add($trim)
}

Flush-Paragraph

$documentXml = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
  xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
  xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
  <w:body>
    $($body -join "`n")
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720" w:header="360" w:footer="360" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>
"@

$stylesXml = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:rPr><w:sz w:val="22"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:pPr><w:spacing w:after="240"/></w:pPr><w:rPr><w:b/><w:sz w:val="36"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:pPr><w:spacing w:before="360" w:after="160"/></w:pPr><w:rPr><w:b/><w:sz w:val="28"/></w:rPr></w:style>
</w:styles>
"@

$docRelsXml = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  $($relationships -join "`n")
</Relationships>
"@

$rootRelsXml = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>
"@

$contentTypesXml = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  $($contentTypes -join "`n")
</Types>
"@

Set-Content -LiteralPath (Join-Path $BuildDir '[Content_Types].xml') -Value $contentTypesXml -Encoding UTF8
Set-Content -LiteralPath (Join-Path $BuildDir '_rels\.rels') -Value $rootRelsXml -Encoding UTF8
Set-Content -LiteralPath (Join-Path $BuildDir 'word\document.xml') -Value $documentXml -Encoding UTF8
Set-Content -LiteralPath (Join-Path $BuildDir 'word\styles.xml') -Value $stylesXml -Encoding UTF8
Set-Content -LiteralPath (Join-Path $BuildDir 'word\_rels\document.xml.rels') -Value $docRelsXml -Encoding UTF8

if (Test-Path $OutputPath) {
  Remove-Item -LiteralPath $OutputPath -Force
}

$zipPath = Join-Path $Root 'WorkNex-AI-User-Manual.zip'
if (Test-Path $zipPath) {
  Remove-Item -LiteralPath $zipPath -Force
}

Compress-Archive -Path (Join-Path $BuildDir '*') -DestinationPath $zipPath -Force
Move-Item -LiteralPath $zipPath -Destination $OutputPath -Force

$resolvedBuild = (Resolve-Path $BuildDir).Path
if ($resolvedBuild.StartsWith($Root, [System.StringComparison]::OrdinalIgnoreCase)) {
  Remove-Item -LiteralPath $BuildDir -Recurse -Force
}

Write-Host "Created: $OutputPath"
