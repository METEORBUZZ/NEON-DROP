$ErrorActionPreference = 'Stop'

$rootScript = Join-Path $PSScriptRoot '..\start-server.ps1'

if (-not (Test-Path $rootScript)) {
  Write-Error "Could not find launcher script at $rootScript"
  exit 1
}

& $rootScript
