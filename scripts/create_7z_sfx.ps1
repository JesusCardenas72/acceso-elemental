<#
Create a single self-extracting EXE using 7-Zip SFX module.

Requirements:
- `7z.exe` available in PATH or in "C:\Program Files\7-Zip\7z.exe".
- `7z.sfx` present in the 7-Zip installation folder (or same folder as `7z.exe`).

Usage:
  1. Run `scripts/create_portable.ps1` to prepare `portable_build`.
  2. Run this script from PowerShell: `.
     create_7z_sfx.ps1`

Output: `dist\AccesoElemental_Portable_7z.exe`
#>

Set-StrictMode -Version Latest

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$repoRoot = Resolve-Path (Join-Path $scriptDir "..")

$buildDir = Join-Path $repoRoot "portable_build"
if (-not (Test-Path $buildDir)) {
    Write-Error "portable_build not found. Run scripts/create_portable.ps1 first."
    exit 1
}

# Find 7z.exe
$possible = @(
    "7z.exe",
    "C:\\Program Files\\7-Zip\\7z.exe",
    "C:\\Program Files (x86)\\7-Zip\\7z.exe"
)

$sevenZip = $null
foreach ($p in $possible) {
    try {
        $path = Get-Command $p -ErrorAction Stop | Select-Object -ExpandProperty Source
        if ($path) { $sevenZip = $path; break }
    } catch {}
}

if (-not $sevenZip) {
    Write-Error "7z.exe not found. Please install 7-Zip and ensure 7z.exe is in PATH."
    exit 1
}

Write-Host "Using 7z: $sevenZip"

# Locate 7z.sfx in same folder as 7z.exe
$sfxCandidate = Join-Path (Split-Path $sevenZip) "7z.sfx"
if (-not (Test-Path $sfxCandidate)) {
    Write-Error "7z.sfx not found next to 7z.exe ($sfxCandidate). Please copy 7z.sfx from your 7-Zip installation."
    exit 1
}

$outDir = Join-Path $repoRoot "dist"
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }

 $archive = Join-Path $outDir "portable.7z"

Write-Host "Creating 7z archive..."
$archiveArg = '"' + $archive + '"'
$filesArg = '"' + (Join-Path $buildDir '*') + '"'
Start-Process -FilePath $sevenZip -ArgumentList @("a","-t7z",$archiveArg,$filesArg,"-mx9") -NoNewWindow -Wait
if (-not (Test-Path $archive)) { Write-Error "Archive creation failed"; exit 1 }

# Create config for SFX
$config = @'
;!@Install@!
Title="Acceso Elemental (Portable)"
BeginPrompt=""
ProgressDialog=1
RunProgram="%EXTRACT_DIR%\\run_app.bat"
Delete=2
;!@InstallEnd@!
'@

$configPath = Join-Path $outDir "config.txt"
Set-Content -Path $configPath -Value $config -Encoding ASCII

# Build final EXE by concatenating: 7z.sfx + config + archive
$finalExe = Join-Path $outDir "AccesoElemental_Portable_7z.exe"

Write-Host "Building SFX executable: $finalExe"

[byte[]]$sfxBytes = Get-Content -Path $sfxCandidate -Encoding Byte
[byte[]]$cfgBytes = Get-Content -Path $configPath -Encoding Byte
[byte[]]$arcBytes = Get-Content -Path $archive -Encoding Byte

[IO.File]::WriteAllBytes($finalExe, $sfxBytes + $cfgBytes + $arcBytes)

Write-Host "Created: $finalExe"
Write-Host "Double-clicking this EXE will extract to a temp folder and run the bundled `run_app.bat`."
