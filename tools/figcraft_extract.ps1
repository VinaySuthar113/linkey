<#
  figcraft_extract.ps1
  List a FigCraft file's frames and export matching ones as PNGs.

  Examples
    .\figcraft_extract.ps1 -File ..\design\Linkey.figcraft -List
    .\figcraft_extract.ps1 -File ..\design\Linkey.figcraft -Filter "add|popup|modal|sheet" -Out ..\design\popups -Scale 2

  Notes
    - Frame ids come from `figcraft-cli info <file> --json`.
    - Export writes <Out>\<frame-name>.png (name is sanitised).
    - Filter is a case-insensitive regular expression matched against the frame name.
#>
param(
  [Parameter(Mandatory = $true)][string]$File,
  [string]$Filter = "",
  [string]$Out = "",
  [double]$Scale = 2,
  [switch]$List
)

$ErrorActionPreference = "Stop"
$cli = "C:\Program Files\FigCraft\figcraft-cli.exe"

if (-not (Test-Path -LiteralPath $File)) {
  throw "File not found: $File"
}
$File = (Resolve-Path -LiteralPath $File).Path

# --- read the frame list -----------------------------------------------------
$json = & $cli info $File --json 2>$null | Out-String
if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($json)) {
  throw "figcraft-cli info failed for $File"
}
$info = $json | ConvertFrom-Json

Write-Host ("File : {0}" -f $info.name)
Write-Host ("Pages: {0}   Nodes: {1}   Images: {2}" -f $info.pages.Count, $info.nodes, $info.images)
if ($info.missingFonts -and $info.missingFonts.Count -gt 0) {
  Write-Host ("Missing fonts: {0}" -f ($info.missingFonts -join ", ")) -ForegroundColor Yellow
}
if ($info.notes -and $info.notes.Count -gt 0) {
  Write-Host "Import notes:" -ForegroundColor Yellow
  $info.notes | ForEach-Object { Write-Host ("  - {0}" -f $_) }
}

$frames = foreach ($p in $info.pages) {
  foreach ($f in $p.frames) {
    [pscustomobject]@{
      Page   = $p.name
      PageId = $p.id
      Id     = $f.id
      Name   = $f.name
      Type   = $f.type
      Width  = $f.width
      Height = $f.height
    }
  }
}

if ($List -or [string]::IsNullOrWhiteSpace($Filter)) {
  Write-Host ""
  Write-Host "Frames:"
  $frames | ForEach-Object {
    Write-Host ("  [{0,6}] {1,-28} {2,8:N0} x {3,-8:N0} {4}" -f $_.Id, $_.Page, $_.Width, $_.Height, $_.Name)
  }
}

if ([string]::IsNullOrWhiteSpace($Filter)) { return }
if ([string]::IsNullOrWhiteSpace($Out)) { throw "-Out is required when -Filter is given." }

# --- export matches ----------------------------------------------------------
$matches = $frames | Where-Object { $_.Name -match $Filter }
if (-not $matches) {
  Write-Host ""
  Write-Host ("No frames match '{0}'." -f $Filter) -ForegroundColor Yellow
  return
}

New-Item -ItemType Directory -Force -Path $Out | Out-Null
$Out = (Resolve-Path -LiteralPath $Out).Path

Write-Host ""
Write-Host ("Exporting {0} frame(s) at {1}x to {2}" -f @($matches).Count, $Scale, $Out)

foreach ($m in $matches) {
  $safe = ($m.Name -replace '[\\/:*?"<>|]', "-") -replace '\s+', " "
  $target = Join-Path $Out ("{0} [{1}].png" -f $safe, $m.Id)
  & $cli export $File -o $target --node $m.Id --scale $Scale 2>$null | Out-Null
  if ($LASTEXITCODE -eq 0 -and (Test-Path -LiteralPath $target)) {
    $kb = [math]::Round((Get-Item -LiteralPath $target).Length / 1KB)
    Write-Host ("  ok  [{0,6}] {1}  ({2} KB)" -f $m.Id, $m.Name, $kb)
  } else {
    Write-Host ("  FAIL[{0,6}] {1}" -f $m.Id, $m.Name) -ForegroundColor Red
  }
}
