<#
Creates a portable build folder containing the contents of Portable\win-unpacked
and generates a template SED file for IExpress to create a single EXE.

Usage (run in PowerShell on Windows):
  .\create_portable.ps1

Prereqs: Windows with IExpress (built-in). Run PowerShell with write access to workspace.
#>

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$repoRoot = Resolve-Path (Join-Path $scriptDir "..")

$source = Join-Path $repoRoot "Portable\win-unpacked"
if (-not (Test-Path $source)) {
    Write-Error "Source folder not found: $source"
    exit 1
}

$build = Join-Path $repoRoot "portable_build"
if (Test-Path $build) { Remove-Item -Recurse -Force $build }
New-Item -ItemType Directory -Path $build | Out-Null

Write-Host "Copying files from $source to $build..."
Copy-Item -Recurse -Path (Join-Path $source '*') -Destination $build

$exeName = "Acceso Elemental · CPM Marcos Redondo.exe"
$runBatPath = Join-Path $build "run_app.bat"

$bat = @"
@echo off
pushd %~dp0
start "" "%~dp0\$exeName" %*
popd
"@

Set-Content -Path $runBatPath -Value $bat -Encoding ASCII

Write-Host "Created wrapper: $runBatPath"

$sedPath = Join-Path $repoRoot "portable_package.sed"
$outputExe = Join-Path $repoRoot "dist\AccesoElemental_Portable.exe"

if (-not (Test-Path (Split-Path $outputExe))) { New-Item -ItemType Directory -Path (Split-Path $outputExe) | Out-Null }

$sed = @"
[Version]
Class=IEXPRESS
SEDVersion=3

[Options]
PackagePurpose=InstallApp
ShowInstallProgramWindow=1
HideExtractAnimation=0
UseLongFileName=1
InsideCompressed=0
CAB_FixedSize=0
RebootMode=I
InstallPrompt=
DisplayLicense=
FinishMessage=
TargetName=$outputExe
FriendlyName=Acceso Elemental (Portable)
AppLaunched=run_app.bat
PostInstallCmd=

[SourceFiles]
SourceFiles0=Files

[SourceFiles0]
; IExpress will include all files placed in the 'Files' section when the GUI or engine runs.
.
"@

Set-Content -Path $sedPath -Value $sed -Encoding ASCII

Write-Host "Wrote SED template: $sedPath"

Write-Host "Portable build ready at: $build"
Write-Host "Next step: run IExpress and use the SED template or open IExpress GUI and point to these files."
Write-Host "Manual command to run IExpress with the SED (may require admin):"
Write-Host "  iexpress /N $sedPath"

Write-Host "If you prefer, open IExpress GUI (run 'iexpress.exe'), choose 'Create new Self Extraction Directive file', then use the 'Files' section to add all files from: $build and set the install program to run_app.bat."
