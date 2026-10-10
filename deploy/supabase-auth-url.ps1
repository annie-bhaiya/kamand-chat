[CmdletBinding()]
param(
  [ValidatePattern('^[a-z]{20}$')][string]$ProjectRef = 'fjcixbnklgjrprmbqluz',
  [string]$SiteUrl = 'https://kamandchat.highliftpages.com'
)
$ErrorActionPreference = 'Stop'
$destination = [uri]$SiteUrl
if (-not $destination.IsAbsoluteUri -or $destination.Scheme -ne 'https' -or $destination.UserInfo -or $destination.Query -or $destination.Fragment) {
  throw 'SiteUrl must be an absolute HTTPS URL without credentials, a query, or a fragment.'
}
if (-not $env:SUPABASE_ACCESS_TOKEN) {
  throw 'Set SUPABASE_ACCESS_TOKEN to a Supabase management token with auth config read/write access. An anon, publishable, or service-role key cannot configure hosted Auth.'
}
$endpoint = "https://api.supabase.com/v1/projects/$ProjectRef/config/auth"
$headers = @{ Authorization = "Bearer $env:SUPABASE_ACCESS_TOKEN" }
function Read-AuthConfig {
  try { Invoke-RestMethod -Uri $endpoint -Headers $headers -Method Get }
  catch { throw 'Unable to read Supabase Auth configuration. Check the management token and project permissions.' }
}
$current = Read-AuthConfig
# Preserve the existing allowlist; only add the exact production destination.
$allowed = @([string]$current.uri_allow_list -split ',' | ForEach-Object { $_.Trim() } | Where-Object { $_ })
$allowed = @(@($allowed) + @($SiteUrl, "$($SiteUrl.TrimEnd('/'))/") | Select-Object -Unique)
$body = @{ site_url = $SiteUrl; uri_allow_list = $allowed -join ',' } | ConvertTo-Json
try {
  $null = Invoke-RestMethod -Uri $endpoint -Headers $headers -Method Patch -ContentType 'application/json' -Body $body
} catch { throw 'Unable to update Supabase Auth URLs. Check the management token permissions.' }
$verified = Read-AuthConfig
if ($verified.site_url -ne $SiteUrl -or (@([string]$verified.uri_allow_list -split ',') -notcontains $SiteUrl)) {
  throw 'Supabase Auth URL verification failed.'
}
Write-Host "Verified Supabase Site URL and allowed confirmation destination: $SiteUrl"
