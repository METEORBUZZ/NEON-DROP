$ErrorActionPreference = 'Stop'

$scriptPath = $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptPath
$serverDir = Join-Path $projectRoot 'server'

if (-not (Test-Path $serverDir)) {
  Write-Error "Server directory not found: $serverDir"
  exit 1
}

$port = 4000
$listener = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1

if ($listener) {
  Write-Host "Server is already running on port $port."
  exit 0
}

Set-Location $serverDir
npm start
