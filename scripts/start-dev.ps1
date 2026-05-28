param(
  [switch]$SkipAI,
  [switch]$SkipFrontend,
  [switch]$SkipBackend,
  [switch]$NoNewWindow
)

$ErrorActionPreference = "Continue"
$Root = Split-Path -Parent $PSScriptRoot

function Get-PackageScript {
  param([string]$PackageJson, [string]$Preferred, [string]$Fallback)
  if (-not (Test-Path $PackageJson)) { return $Fallback }
  $pkg = Get-Content $PackageJson -Raw | ConvertFrom-Json
  if ($pkg.scripts.PSObject.Properties.Name -contains $Preferred) { return $Preferred }
  return $Fallback
}

function Start-ServiceCommand {
  param(
    [string]$Name,
    [string]$WorkingDirectory,
    [string]$Command
  )

  Write-Host "START $Name :: $Command" -ForegroundColor Cyan
  if ($NoNewWindow) {
    Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", "Set-Location '$WorkingDirectory'; $Command" -NoNewWindow | Out-Null
  } else {
    Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", "Set-Location '$WorkingDirectory'; $Command" | Out-Null
  }
}

$backendDir = Join-Path $Root "worknex-backend"
$frontendDir = Join-Path $Root "frontend"
$aiDir = Join-Path $Root "ai-service"

if (-not $SkipBackend) {
  $backendScript = Get-PackageScript (Join-Path $backendDir "package.json") "dev" "start"
  Start-ServiceCommand "Backend" $backendDir "npm.cmd run $backendScript"
} else {
  Write-Host "SKIPPED Backend" -ForegroundColor Yellow
}

if (-not $SkipFrontend) {
  Start-ServiceCommand "Frontend" $frontendDir "npm.cmd run dev"
} else {
  Write-Host "SKIPPED Frontend" -ForegroundColor Yellow
}

if (-not $SkipAI) {
  $depScript = Join-Path $aiDir "scripts/check_dependencies.py"
  $aiDepsOk = $true
  if (Test-Path $depScript) {
    Push-Location $aiDir
    try {
      & python scripts/check_dependencies.py
      if ($LASTEXITCODE -ne 0) { $aiDepsOk = $false }
    } finally {
      Pop-Location
    }
  }

  if (-not $aiDepsOk) {
    Write-Host "FAIL AI dependencies missing." -ForegroundColor Red
    Write-Host "Install with:" -ForegroundColor Yellow
    Write-Host "  cd ai-service"
    Write-Host "  python -m pip install -r requirements.txt"
    Write-Host "Backend/frontend start was not blocked by this AI dependency failure." -ForegroundColor Yellow
  } else {
    if (Test-Path (Join-Path $aiDir "run.py")) {
      Start-ServiceCommand "AI" $aiDir "python run.py"
    } else {
      Start-ServiceCommand "AI" $aiDir "python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
    }
  }
} else {
  Write-Host "SKIPPED AI" -ForegroundColor Yellow
}

Write-Host "Service start commands dispatched." -ForegroundColor Green
