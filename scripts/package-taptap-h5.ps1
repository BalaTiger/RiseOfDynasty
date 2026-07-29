$ErrorActionPreference = "Stop"

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$sourceRoot = Join-Path $projectRoot "out"
$releaseRoot = Join-Path $projectRoot "release"
$stagingRoot = Join-Path $releaseRoot "taptap-h5"
$archivePath = Join-Path $releaseRoot "RiseOfDynasty-0.1.0-TapTap-H5.zip"
$packageDirectoryName = "RiseOfDynasty"

Push-Location $projectRoot
try {
  Remove-Item Env:DESKTOP_BUILD -ErrorAction SilentlyContinue
  $env:TAPTAP_BUILD = "true"
  $env:NEXT_PUBLIC_BASE_PATH = "."
  Remove-Item Env:NEXT_PUBLIC_DISABLE_MUSIC -ErrorAction SilentlyContinue
  & npm.cmd run build:h5:local
  if ($LASTEXITCODE -ne 0) {
    throw "TapTap H5 build failed with exit code $LASTEXITCODE."
  }
}
finally {
  Pop-Location
}

if (-not (Test-Path -LiteralPath (Join-Path $sourceRoot "index.html"))) {
  throw "TapTap build did not produce out/index.html."
}

foreach ($target in @($stagingRoot, $archivePath)) {
  if (Test-Path -LiteralPath $target) {
    $resolved = (Resolve-Path -LiteralPath $target).Path
    if (-not $resolved.StartsWith($releaseRoot, [StringComparison]::OrdinalIgnoreCase)) {
      throw "Refusing to remove path outside release directory: $resolved"
    }
    Remove-Item -LiteralPath $resolved -Recurse -Force
  }
}

New-Item -ItemType Directory -Path $stagingRoot | Out-Null

$excludedDirectories = @(
  "character-portrait-layers"
)
$excludedFiles = @()

Get-ChildItem -LiteralPath $sourceRoot -Force | ForEach-Object {
  if ($_.PSIsContainer -and $excludedDirectories -contains $_.Name) {
    return
  }
  if (-not $_.PSIsContainer -and $excludedFiles -contains $_.Name) {
    return
  }
  Copy-Item -LiteralPath $_.FullName -Destination $stagingRoot -Recurse -Force
}

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [System.IO.Compression.ZipFile]::Open(
  $archivePath,
  [System.IO.Compression.ZipArchiveMode]::Create
)
try {
  Get-ChildItem -LiteralPath $stagingRoot -Recurse -File | ForEach-Object {
    $relativePath = $_.FullName.Substring($stagingRoot.Length).TrimStart("\", "/")
    $entryName = "$packageDirectoryName/$($relativePath.Replace('\', '/'))"
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
      $archive,
      $_.FullName,
      $entryName,
      [System.IO.Compression.CompressionLevel]::Optimal
    ) | Out-Null
  }
}
finally {
  $archive.Dispose()
}

if (-not (Test-Path -LiteralPath (Join-Path $stagingRoot "index.html"))) {
  throw "TapTap staging package does not contain root index.html."
}

$archiveSize = (Get-Item -LiteralPath $archivePath).Length
$limit = 300MB
if ($archiveSize -ge $limit) {
  throw "TapTap package is $([math]::Round($archiveSize / 1MB, 2)) MB, exceeding the 300 MB limit."
}

Write-Output "Created: $archivePath"
Write-Output "Size: $([math]::Round($archiveSize / 1MB, 2)) MB"
Write-Output "Entry page: $packageDirectoryName/index.html"
