$ErrorActionPreference = "Continue"
$Root = Split-Path -Parent $PSScriptRoot
$ReportPath = Join-Path $Root "reports/full-module-test-report.json"

function Test-Service {
  param(
    [string]$Name,
    [string]$Url
  )

  try {
    $response = Invoke-WebRequest -Uri $Url -TimeoutSec 10 -UseBasicParsing
    if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 400) {
      Write-Host "PASS service $Name $Url HTTP $($response.StatusCode)" -ForegroundColor Green
      return $true
    }
    Write-Host "FAIL service $Name $Url HTTP $($response.StatusCode)" -ForegroundColor Red
    return $false
  } catch {
    Write-Host "FAIL service $Name $Url $($_.Exception.Message)" -ForegroundColor Red
    return $false
  }
}

Write-Host "WorkNex full module E2E test" -ForegroundColor Cyan
Write-Host "Root: $Root"
Write-Host ""

$backendOk = Test-Service "Backend" "http://localhost:5000/health"
$frontendOk = Test-Service "Frontend" "http://localhost:3000"
$aiOk = Test-Service "AI" "http://localhost:8000/health"

if (-not ($backendOk -and $frontendOk -and $aiOk)) {
  Write-Host ""
  Write-Host "Required services are not all reachable. Start services before running the full module test." -ForegroundColor Red
  exit 1
}

Write-Host ""
Push-Location $Root
try {
  node scripts/full-module-test.js
  $nodeExit = $LASTEXITCODE
} finally {
  Pop-Location
}

Write-Host ""
if (Test-Path $ReportPath) {
  try {
    $report = Get-Content $ReportPath -Raw | ConvertFrom-Json
    Write-Host "Final summary" -ForegroundColor Cyan
    $report.modules | Select-Object module, passed, failed, skipped, notes | Format-Table -AutoSize
    Write-Host "Overall: $($report.overall)"
    Write-Host "JSON report: $ReportPath"
    Write-Host "Markdown report: $(Join-Path $Root 'reports/full-module-test-report.md')"
  } catch {
    Write-Host "WARN could not parse report: $($_.Exception.Message)" -ForegroundColor Yellow
  }
} else {
  Write-Host "WARN report file was not created: $ReportPath" -ForegroundColor Yellow
}

exit $nodeExit
