[CmdletBinding()]
param(
  [string]$Subscription,
  [string]$Location = 'centralindia',
  [string]$ResourceGroup = 'rg-pulse-chat',
  [ValidatePattern('^[a-z][a-z0-9-]{2,20}$')][string]$Prefix = 'kamand-chat',
  [string]$PublicWebUrl = 'https://kamandchat.highliftpages.com',
  [string]$ServerEnvFile = (Join-Path $PSScriptRoot '../server/.env')
)
$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$azCommand = Get-Command az -ErrorAction SilentlyContinue
$azPath = if ($azCommand) { $azCommand.Source } else { 'C:/Program Files/Microsoft SDKs/Azure/CLI2/wbin/az.cmd' }
if (-not (Test-Path -LiteralPath $azPath)) { throw 'Install Azure CLI and run az login first.' }
function Invoke-Azure {
  param([string[]]$Arguments)
  $result = & $azPath @Arguments
  if ($LASTEXITCODE -ne 0) { throw "Azure CLI failed: $($Arguments[0..1] -join ' ')" }
  return $result
}
function Invoke-Docker {
  param([string[]]$Arguments)
  & docker @Arguments
  if ($LASTEXITCODE -ne 0) { throw "Docker failed: $($Arguments[0])" }
}
# Read only runtime settings. SQL/admin credentials never enter an image or Azure.
$runtimeSettings = @{}
Get-Content -LiteralPath $ServerEnvFile | ForEach-Object {
  if ($_ -match '^\s*(SUPABASE_URL|SUPABASE_PUBLISHABLE_KEY|SUPABASE_ANON_KEY|GEMINI_API_KEY|GEMINI_MODEL)\s*=(.*)$') {
    $runtimeSettings[$Matches[1]] = $Matches[2].Trim().Trim('"').Trim("'")
  }
}
$supabaseKey = $runtimeSettings['SUPABASE_PUBLISHABLE_KEY']
if (-not $supabaseKey) { $supabaseKey = $runtimeSettings['SUPABASE_ANON_KEY'] }
if (-not $supabaseKey -or $runtimeSettings['SUPABASE_URL'] -notmatch '^https://') {
  throw 'Configure hosted HTTPS SUPABASE_URL and a publishable key in server/.env.'
}
if ($Subscription) { Invoke-Azure @('account', 'set', '--subscription', $Subscription) }
Invoke-Azure @('account', 'show', '--query', '{subscription:name,state:state}', '-o', 'json')
Invoke-Docker @('info', '--format', '{{.ServerVersion}}')
Invoke-Azure @('group', 'create', '--name', $ResourceGroup, '--location', $Location, '--output', 'none')
$infra = (Invoke-Azure @('deployment', 'group', 'create', '--resource-group', $ResourceGroup, '--name', "$Prefix-infra", '--template-file', (Join-Path $PSScriptRoot 'infra.bicep'), '--parameters', "location=$Location", "prefix=$Prefix", '--query', 'properties.outputs', '-o', 'json')) | ConvertFrom-Json
$registry = $infra.registryName.value
$registryHost = $infra.registryHost.value
$apiUrl = $infra.apiUrl.value
$webUrl = $infra.webUrl.value
$existingApps = (Invoke-Azure @('containerapp', 'list', '--resource-group', $ResourceGroup, '-o', 'json')) | ConvertFrom-Json
$webCustomDomains = @()
$existingWeb = $existingApps | Where-Object name -eq "$Prefix-web"
if ($existingWeb.properties.configuration.ingress.customDomains) {
  $webCustomDomains = @($existingWeb.properties.configuration.ingress.customDomains)
}
$imageTag = (Get-Date -AsUTC -Format 'yyyyMMddHHmmss')
Invoke-Azure @('acr', 'login', '--name', $registry, '--output', 'none')
Invoke-Docker @('build', '--platform', 'linux/amd64', '--tag', "$registryHost/pulse-api:$imageTag", (Join-Path $projectRoot 'server'))
Invoke-Docker @('build', '--platform', 'linux/amd64', '--build-arg', "NEXT_PUBLIC_API_URL=$apiUrl", '--tag', "$registryHost/pulse-web:$imageTag", (Join-Path $projectRoot 'client'))
Invoke-Docker @('push', "$registryHost/pulse-api:$imageTag")
Invoke-Docker @('push', "$registryHost/pulse-web:$imageTag")
$parameters = @{
  location = @{ value = $Location }; prefix = @{ value = $Prefix }
  environmentId = @{ value = $infra.environmentId.value }
  identityId = @{ value = $infra.identityId.value }
  registryHost = @{ value = $registryHost }; imageTag = @{ value = $imageTag }
  apiUrl = @{ value = $apiUrl }; webUrl = @{ value = $webUrl }
  clientOrigins = @{ value = (@($webUrl, $PublicWebUrl) | Where-Object { $_ } | Select-Object -Unique) -join ',' }
  authEmailRedirectUrl = @{ value = $(if ($PublicWebUrl) { $PublicWebUrl } else { $webUrl }) }
  webCustomDomains = @{ value = $webCustomDomains }
  supabaseUrl = @{ value = $runtimeSettings['SUPABASE_URL'] }
  supabaseKey = @{ value = $supabaseKey }
  geminiApiKey = @{ value = [string]$runtimeSettings['GEMINI_API_KEY'] }
  geminiModel = @{ value = $(if ($runtimeSettings['GEMINI_MODEL']) { $runtimeSettings['GEMINI_MODEL'] } else { 'gemini-3.8-flash' }) }
}
$parameterFile = Join-Path ([IO.Path]::GetTempPath()) "pulse-deploy-$([guid]::NewGuid()).json"
try {
  @{ parameters = $parameters } | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $parameterFile -Encoding utf8
  Invoke-Azure @('deployment', 'group', 'create', '--resource-group', $ResourceGroup, '--name', "$Prefix-apps", '--template-file', (Join-Path $PSScriptRoot 'apps.bicep'), '--parameters', "@$parameterFile", '--query', 'properties.outputs', '-o', 'json')
} finally {
  Remove-Item -LiteralPath $parameterFile -Force -ErrorAction SilentlyContinue
}
$verificationUrls = @("$apiUrl/health", "$apiUrl/ready", $webUrl)
if ($PublicWebUrl -and ($webCustomDomains.name -contains ([uri]$PublicWebUrl).Host)) {
  $verificationUrls += $PublicWebUrl
}

foreach ($url in $verificationUrls) {
  $healthy = $false
  for ($attempt = 0; $attempt -lt 12; $attempt++) {
    try {
      $response = Invoke-WebRequest -Uri $url -TimeoutSec 20
      if ($response.StatusCode -eq 200) { $healthy = $true; break }
    } catch { Start-Sleep -Seconds 5 }
  }
  if (-not $healthy) { throw "Deployment completed, but verification failed: $url" }
  Write-Host "Verified $url"
}
Write-Host "Website: $webUrl"
if ($PublicWebUrl) { Write-Host "Public domain (requires DNS and certificate binding): $PublicWebUrl" }
Write-Host "API: $apiUrl"
