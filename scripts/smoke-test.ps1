$ErrorActionPreference = "Continue"
$Root = Split-Path -Parent $PSScriptRoot
$Rows = New-Object System.Collections.Generic.List[object]
$Failed = $false
$ApiBase = "http://localhost:5000/api/v1"

function Add-SmokeResult {
  param(
    [string]$Endpoint,
    [string]$Role,
    [string]$StatusCode,
    [string]$Status,
    [string]$Notes = ""
  )
  $script:Rows.Add([pscustomobject]@{
    Endpoint = $Endpoint
    Role = $Role
    StatusCode = $StatusCode
    Status = $Status
    Notes = $Notes
  }) | Out-Null
  if ($Status -eq "FAIL") { $script:Failed = $true }
}

function Invoke-SmokeRequest {
  param(
    [string]$Method,
    [string]$Url,
    [string]$Role,
    [hashtable]$Headers = @{},
    [object]$Body = $null,
    [string]$Name = $Url
  )
  try {
    $params = @{
      Uri = $Url
      Method = $Method
      TimeoutSec = 10
      UseBasicParsing = $true
      Headers = $Headers
    }
    if ($null -ne $Body) {
      $params.ContentType = "application/json"
      $params.Body = ($Body | ConvertTo-Json -Depth 8)
    }
    $response = Invoke-WebRequest @params
    $ok = $response.StatusCode -ge 200 -and $response.StatusCode -lt 400
    Add-SmokeResult $Name $Role $response.StatusCode ($(if ($ok) { "PASS" } else { "FAIL" })) "HTTP response"
    return $response
  } catch {
    $code = "ERR"
    if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
      $code = [int]$_.Exception.Response.StatusCode
    }
    Add-SmokeResult $Name $Role $code "FAIL" $_.Exception.Message
    return $null
  }
}

function Login-SeededUser {
  param([string]$Email, [string]$Role)
  $response = Invoke-SmokeRequest "POST" "$ApiBase/auth/login" $Role @{} @{ email = $Email; password = "NovaPay@2025" } "POST /api/v1/auth/login"
  if (-not $response) { return $null }
  try {
    $json = $response.Content | ConvertFrom-Json
    return $json.data.accessToken
  } catch {
    Add-SmokeResult "parse login token" $Role "ERR" "FAIL" $_.Exception.Message
    return $null
  }
}

Write-Host "WorkNex live smoke test" -ForegroundColor Cyan
Write-Host "This assumes backend, frontend, and AI services are already running."
Write-Host ""

Invoke-SmokeRequest "GET" "http://localhost:5000/health" "public" @{} $null "GET backend /health" | Out-Null
Invoke-SmokeRequest "GET" "http://localhost:3000" "public" @{} $null "GET frontend /" | Out-Null
Invoke-SmokeRequest "GET" "http://localhost:8000/health" "public" @{} $null "GET AI /health" | Out-Null

$adminToken = Login-SeededUser "sara.malik@novapay.pk" "ADMIN"
$managerToken = Login-SeededUser "ali.raza@novapay.pk" "MANAGER"
$employeeToken = Login-SeededUser "bilal.ahmed@novapay.pk" "EMPLOYEE"

if ($adminToken) {
  $h = @{ Authorization = "Bearer $adminToken" }
  Invoke-SmokeRequest "GET" "$ApiBase/users" "ADMIN" $h $null "GET /api/v1/users" | Out-Null
  Invoke-SmokeRequest "GET" "$ApiBase/analytics/dashboard" "ADMIN" $h $null "GET /api/v1/analytics/dashboard" | Out-Null
  Invoke-SmokeRequest "GET" "$ApiBase/reports" "ADMIN" $h $null "GET /api/v1/reports" | Out-Null
  Invoke-SmokeRequest "GET" "$ApiBase/settings/organization" "ADMIN" $h $null "GET /api/v1/settings/organization" | Out-Null
  Invoke-SmokeRequest "GET" "$ApiBase/reports/attendance" "ADMIN" $h $null "GET /api/v1/reports/attendance" | Out-Null
}

if ($managerToken) {
  $h = @{ Authorization = "Bearer $managerToken" }
  Invoke-SmokeRequest "GET" "$ApiBase/users" "MANAGER" $h $null "GET /api/v1/users" | Out-Null
  Invoke-SmokeRequest "GET" "$ApiBase/attendance" "MANAGER" $h $null "GET /api/v1/attendance" | Out-Null
  Invoke-SmokeRequest "GET" "$ApiBase/leave/pending" "MANAGER" $h $null "GET /api/v1/leave/pending" | Out-Null
}

if ($employeeToken) {
  $h = @{ Authorization = "Bearer $employeeToken" }
  Invoke-SmokeRequest "GET" "$ApiBase/users/me" "EMPLOYEE" $h $null "GET /api/v1/users/me" | Out-Null
  Invoke-SmokeRequest "GET" "$ApiBase/attendance/today" "EMPLOYEE" $h $null "GET /api/v1/attendance/today" | Out-Null
  Invoke-SmokeRequest "GET" "$ApiBase/leave/balances/me" "EMPLOYEE" $h $null "GET /api/v1/leave/balances/me" | Out-Null
  Invoke-SmokeRequest "GET" "$ApiBase/performance/me" "EMPLOYEE" $h $null "GET /api/v1/performance/me" | Out-Null
  Invoke-SmokeRequest "POST" "$ApiBase/ai/chat" "EMPLOYEE" $h @{ message = "What is the leave policy?" } "POST /api/v1/ai/chat" | Out-Null
  Invoke-SmokeRequest "POST" "$ApiBase/ai/predict-performance" "EMPLOYEE" $h @{} "POST /api/v1/ai/predict-performance" | Out-Null
}

Write-Host ""
$Rows | Format-Table -AutoSize

if ($Failed) {
  Write-Host "Smoke test finished: FAIL" -ForegroundColor Red
  exit 1
}

Write-Host "Smoke test finished: PASS" -ForegroundColor Green
exit 0
