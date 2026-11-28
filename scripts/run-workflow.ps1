$ErrorActionPreference = "Stop"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$root = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $root "workflow.env"

if (-not (Test-Path -LiteralPath $envFile)) {
  Write-Host "Missing workflow.env" -ForegroundColor Red
  Write-Host "Copy workflow.env.example to workflow.env and fill in DIFY_API_BASE / DIFY_API_KEY."
  Write-Host "In Dify open the workflow app, then API Access -> create an API key (app-...)."
  exit 1
}

$conf = @{}
Get-Content -LiteralPath $envFile -Encoding UTF8 | ForEach-Object {
  $line = $_.Trim()
  if ($line -eq "" -or $line.StartsWith("#")) { return }
  $i = $line.IndexOf("=")
  if ($i -lt 1) { return }
  $conf[$line.Substring(0, $i).Trim()] = $line.Substring($i + 1).Trim().Trim('"').Trim("'")
}

$base = $conf["DIFY_API_BASE"]
$key = $conf["DIFY_API_KEY"]

if (-not $base -or -not $key -or $key -match "替换|your|xxx") {
  Write-Host "workflow.env is not configured: set DIFY_API_BASE and DIFY_API_KEY." -ForegroundColor Red
  exit 1
}

$base = $base.TrimEnd("/")
if ($base.EndsWith("/v1")) { $uri = "$base/workflows/run" } else { $uri = "$base/v1/workflows/run" }

Write-Host "Dify workflow: $uri"
Write-Host "Running, this can take several minutes..."
Write-Host ""

$payload = @{ inputs = @{}; response_mode = "streaming"; user = "footballcoin-local" } | ConvertTo-Json -Depth 5
$headers = @{ Authorization = "Bearer $key" }

try {
  $resp = Invoke-WebRequest -Uri $uri -Method Post -Headers $headers `
    -Body ([Text.Encoding]::UTF8.GetBytes($payload)) `
    -ContentType "application/json; charset=utf-8" -TimeoutSec 3600 -UseBasicParsing
} catch {
  $msg = $_.Exception.Message
  if ($_.Exception.Response) {
    try {
      $stream = $_.Exception.Response.GetResponseStream()
      $reader = New-Object IO.StreamReader($stream)
      $msg = $reader.ReadToEnd()
      $reader.Close()
    } catch { }
  }
  Write-Host "Request failed: $msg" -ForegroundColor Red
  exit 1
}

$text = $resp.Content
if ($text -is [byte[]]) { $text = [Text.Encoding]::UTF8.GetString($text) }

$status = ""
$finished = $null
$err = ""
foreach ($line in ($text -split "`r?`n")) {
  if (-not $line.StartsWith("data:")) { continue }
  $json = $line.Substring(5).Trim()
  if ($json -eq "" -or $json -eq "[DONE]") { continue }
  try { $evt = $json | ConvertFrom-Json } catch { continue }
  if ($evt.event -eq "workflow_finished") {
    $status = $evt.data.status
    $finished = $evt.data
  } elseif ($evt.event -eq "error") {
    $err = "$($evt.message) $($evt.code)"
  }
}

if ($err) {
  Write-Host "Workflow error: $err" -ForegroundColor Red
  exit 1
}

if (-not $finished) {
  Write-Host "No workflow_finished event in the response." -ForegroundColor Red
  exit 1
}

if ($status -ne "succeeded") {
  Write-Host ("Workflow status: " + $status) -ForegroundColor Red
  if ($finished.error) { Write-Host ("Error: " + $finished.error) -ForegroundColor Red }
  exit 1
}

Write-Host ("Workflow status: " + $status) -ForegroundColor Green
if ($null -ne $finished.elapsed_time) { Write-Host ("Elapsed: " + $finished.elapsed_time + " s") }
if ($null -ne $finished.total_tokens) { Write-Host ("Tokens: " + $finished.total_tokens) }
if ($finished.outputs) {
  $keys = @($finished.outputs.PSObject.Properties | ForEach-Object { $_.Name })
  Write-Host ("Outputs: " + ($keys -join ", "))
  if ($null -ne $finished.outputs.matchCount) { Write-Host ("Matches: " + $finished.outputs.matchCount) }
}

if ($conf["SYNC_LOCAL"] -eq "0") {
  Write-Host ""
  Write-Host "SYNC_LOCAL=0, skip local data refresh."
  exit 0
}

Write-Host ""
Write-Host "Pulling latest data from GitHub..."
Set-Location $root
git pull --ff-only
if ($LASTEXITCODE -ne 0) { Write-Host "git pull failed." -ForegroundColor Red; exit 1 }

Write-Host "Rebuilding index..."
node scripts\build-index.mjs
if ($LASTEXITCODE -ne 0) { Write-Host "build-index failed." -ForegroundColor Red; exit 1 }

Write-Host "Copying data to web\public\data..."
node scripts\sync-data.mjs
if ($LASTEXITCODE -ne 0) { Write-Host "sync-data failed." -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "Local data refreshed. Run npm run dev in web to preview." -ForegroundColor Green
exit 0
