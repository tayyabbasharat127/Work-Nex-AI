param(
  [switch]$LiveMode
)

$ErrorActionPreference = "Continue"
$Root = Split-Path -Parent $PSScriptRoot
$Results = New-Object System.Collections.Generic.List[object]
$RequiredFailure = $false
$AiFailure = $false

function Add-Result {
  param(
    [string]$Component,
    [string]$Check,
    [string]$Status,
    [string]$Notes = ""
  )
  $script:Results.Add([pscustomobject]@{
    Component = $Component
    Check = $Check
    Status = $Status
    Notes = $Notes
  }) | Out-Null
  if ($Status -eq "FAIL") {
    if ($Component -eq "AI") { $script:AiFailure = $true } else { $script:RequiredFailure = $true }
  }
}

function Test-CommandAvailable {
  param([string]$Name)
  $cmd = Get-Command $Name -ErrorAction SilentlyContinue
  if ($cmd) {
    Add-Result "Environment" $Name "PASS" $cmd.Source
    return $true
  }
  Add-Result "Environment" $Name "FAIL" "Command not found on PATH"
  return $false
}

function Invoke-CheckCommand {
  param(
    [string]$Component,
    [string]$Check,
    [string]$FilePath,
    [string[]]$Arguments,
    [string]$WorkingDirectory,
    [switch]$AiOnly
  )

  Push-Location $WorkingDirectory
  try {
    $output = & $FilePath @Arguments 2>&1
    $code = $LASTEXITCODE
    if ($code -eq 0) {
      Add-Result $Component $Check "PASS" "exit 0"
    } else {
      Add-Result $Component $Check "FAIL" ("exit {0}: {1}" -f $code, (($output | Select-Object -Last 3) -join " "))
    }
  } catch {
    Add-Result $Component $Check "FAIL" $_.Exception.Message
  } finally {
    Pop-Location
  }
}

function Test-HttpOptional {
  param(
    [string]$Component,
    [string]$Check,
    [string]$Url
  )

  try {
    $response = Invoke-WebRequest -Uri $Url -TimeoutSec 5 -UseBasicParsing
    if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 400) {
      Add-Result $Component $Check "PASS" ("HTTP {0}" -f $response.StatusCode)
    } else {
      Add-Result $Component $Check "FAIL" ("HTTP {0}" -f $response.StatusCode)
    }
  } catch {
    if ($LiveMode) {
      Add-Result $Component $Check "FAIL" $_.Exception.Message
    } else {
      Add-Result $Component $Check "SKIPPED" "Service is not running"
    }
  }
}

function Test-EnvFile {
  param(
    [string]$Component,
    [string]$Check,
    [string[]]$Paths,
    [switch]$Optional
  )
  foreach ($path in $Paths) {
    if (Test-Path (Join-Path $Root $path)) {
      Add-Result $Component $Check "PASS" $path
      return
    }
  }
  if ($Optional) {
    Add-Result $Component $Check "WARN" ("Optional file missing: {0}" -f ($Paths -join " or "))
  } else {
    Add-Result $Component $Check "WARN" ("Missing: {0}" -f ($Paths -join " or "))
  }
}

Write-Host "WorkNex project health check" -ForegroundColor Cyan
Write-Host "Root: $Root"
Write-Host ""

$nodeOk = Test-CommandAvailable "node"
$npmOk = Test-CommandAvailable "npm.cmd"
if (-not $npmOk) { $npmOk = Test-CommandAvailable "npm" }
$pythonOk = Test-CommandAvailable "python"

Test-EnvFile "Environment" "backend env file" @("worknex-backend/.env")
Test-EnvFile "Environment" "frontend env file" @("frontend/.env.local", "frontend/.env")
Test-EnvFile "Environment" "ai env file" @("ai-service/.env") -Optional

$backendEnv = Join-Path $Root "worknex-backend/.env"
if (Test-Path $backendEnv) {
  $databaseLine = Select-String -Path $backendEnv -Pattern "^\s*DATABASE_URL\s*=" -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($databaseLine) {
    Add-Result "Environment" "DATABASE_URL configured" "PASS" "Found in worknex-backend/.env"
  } else {
    Add-Result "Environment" "DATABASE_URL configured" "WARN" "DATABASE_URL not found in worknex-backend/.env"
  }
} else {
  Add-Result "Environment" "DATABASE_URL configured" "WARN" "Cannot inspect missing backend .env"
}

$backendDir = Join-Path $Root "worknex-backend"
if (Test-Path (Join-Path $backendDir "node_modules")) {
  Add-Result "Backend" "node_modules" "PASS" "Dependencies folder exists"
} else {
  Add-Result "Backend" "node_modules" "WARN" "Run: cd worknex-backend; npm install"
}

if ($nodeOk -and $npmOk) {
  Invoke-CheckCommand "Backend" "prisma validate" "npx.cmd" @("prisma", "validate") $backendDir
  Invoke-CheckCommand "Backend" "prisma generate" "npx.cmd" @("prisma", "generate") $backendDir
  Invoke-CheckCommand "Backend" "prisma migrate status" "npx.cmd" @("prisma", "migrate", "status") $backendDir

  $backendFiles = @(
    "src/app.js",
    "src/routes/index.js",
    "src/utils/rbac.js",
    "src/utils/tenant.js",
    "src/modules/auth/auth.service.js",
    "src/modules/attendance/attendance.service.js",
    "src/modules/leave/leave.service.js",
    "src/modules/reports/reports.service.js",
    "src/modules/settings/settings.service.js",
    "src/modules/ai/ai.service.js"
  )
  foreach ($file in $backendFiles) {
    $full = Join-Path $backendDir $file
    if (Test-Path $full) {
      Invoke-CheckCommand "Backend" "node --check $file" "node" @("--check", $file) $backendDir
    } else {
      Add-Result "Backend" "node --check $file" "SKIPPED" "File not found"
    }
  }
}

$frontendDir = Join-Path $Root "frontend"
if (Test-Path (Join-Path $frontendDir "node_modules")) {
  Add-Result "Frontend" "node_modules" "PASS" "Dependencies folder exists"
} else {
  Add-Result "Frontend" "node_modules" "WARN" "Run: cd frontend; npm install"
}

if ($nodeOk -and $npmOk) {
  Invoke-CheckCommand "Frontend" "npm run lint" "npm.cmd" @("run", "lint") $frontendDir
  Invoke-CheckCommand "Frontend" "npm run build" "npm.cmd" @("run", "build") $frontendDir
}

$aiDir = Join-Path $Root "ai-service"
if ($pythonOk) {
  Invoke-CheckCommand "AI" "python -m compileall ." "python" @("-m", "compileall", ".") $aiDir
  if (Test-Path (Join-Path $aiDir "scripts/check_dependencies.py")) {
    Invoke-CheckCommand "AI" "python scripts/check_dependencies.py" "python" @("scripts/check_dependencies.py") $aiDir
  } else {
    Add-Result "AI" "python scripts/check_dependencies.py" "SKIPPED" "File not found"
  }
  Invoke-CheckCommand "AI" "python training/train_performance_model.py" "python" @("training/train_performance_model.py") $aiDir
  Invoke-CheckCommand "AI" "python scripts/ingest_knowledge.py" "python" @("scripts/ingest_knowledge.py") $aiDir

  $depOutput = & python -c "import importlib.util; missing=[m for m in ['fastapi','uvicorn'] if importlib.util.find_spec(m) is None]; print(','.join(missing))" 2>$null
  if ($depOutput) {
    Add-Result "AI" "AI_RUNTIME dependencies" "FAIL" "Missing $depOutput. Install with: cd ai-service; python -m pip install -r requirements.txt"
  } else {
    Add-Result "AI" "AI_RUNTIME dependencies" "PASS" "fastapi and uvicorn available"
  }
}

Test-HttpOptional "Backend" "live /health" "http://localhost:5000/health"
Test-HttpOptional "Frontend" "live /" "http://localhost:3000"
Test-HttpOptional "AI" "live /health" "http://localhost:8000/health"

Write-Host ""
$Results | Format-Table -AutoSize

if ($RequiredFailure) {
  Write-Host "Health check finished: FAIL" -ForegroundColor Red
  exit 1
}
if ($AiFailure) {
  Write-Host "Health check finished: AI runtime/dependency failure only" -ForegroundColor Yellow
  exit 2
}
Write-Host "Health check finished: PASS" -ForegroundColor Green
exit 0
