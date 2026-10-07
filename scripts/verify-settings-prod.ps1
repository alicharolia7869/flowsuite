$bypass = 'hOR1jwQZFibcojED24uqDYYSmHLFqT0I'
$base = 'https://flowsuite-one.vercel.app/api/v1'

Write-Host "--- TEST 1: OWNER LOGIN ---"
$loginBody = @{ email = 'owner@acme.com'; password = 'Password123!' } | ConvertTo-Json
$loginRes = Invoke-RestMethod -Uri "$base/auth/login" -Method POST -Headers @{ 'x-vercel-protection-bypass' = $bypass } -ContentType 'application/json' -Body $loginBody
$ownerToken = $loginRes.tokens.accessToken
Write-Host "1. Owner Login Success: User = $($loginRes.user.name), Org = $($loginRes.organization.name)"

Write-Host "`n--- TEST 2: GET /auth/me ---"
$meRes = Invoke-RestMethod -Uri "$base/auth/me" -Method GET -Headers @{ 'x-vercel-protection-bypass' = $bypass; 'Authorization' = "Bearer $ownerToken" }
Write-Host "2. GET /auth/me Success: User = $($meRes.user.email), Org = $($meRes.organizations[0].name), Plan = $($meRes.organizations[0].plan)"

Write-Host "`n--- TEST 3: GET /organizations/current ---"
$orgRes = Invoke-RestMethod -Uri "$base/organizations/current" -Method GET -Headers @{ 'x-vercel-protection-bypass' = $bypass; 'Authorization' = "Bearer $ownerToken"; 'x-organization-id' = 'org_acme_001' }
Write-Host "3. GET /organizations/current Success: Name = $($orgRes.organization.name), Members = $($orgRes.organization.memberCount), Status = $($orgRes.organization.status)"

Write-Host "`n--- TEST 4: PATCH /organizations/current (RENAME) ---"
$patchBody = @{ name = 'Acme Worldwide HQ' } | ConvertTo-Json
$patchRes = Invoke-RestMethod -Uri "$base/organizations/current" -Method PATCH -Headers @{ 'x-vercel-protection-bypass' = $bypass; 'Authorization' = "Bearer $ownerToken"; 'x-organization-id' = 'org_acme_001' } -ContentType 'application/json' -Body $patchBody
Write-Host "4. PATCH Success: Message = $($patchRes.message), New Name = $($patchRes.organization.name)"

Write-Host "`n--- TEST 5: VERIFY RENAME IN DATABASE ---"
$verifyRes = Invoke-RestMethod -Uri "$base/organizations/current" -Method GET -Headers @{ 'x-vercel-protection-bypass' = $bypass; 'Authorization' = "Bearer $ownerToken"; 'x-organization-id' = 'org_acme_001' }
Write-Host "5. Verified in DB: Current Name = $($verifyRes.organization.name)"

Write-Host "`n--- TEST 6: RBAC ENFORCEMENT (ADMIN ROLE CANNOT UPDATE) ---"
$adminBody = @{ email = 'admin@acme.com'; password = 'Password123!' } | ConvertTo-Json
$adminLogin = Invoke-RestMethod -Uri "$base/auth/login" -Method POST -Headers @{ 'x-vercel-protection-bypass' = $bypass } -ContentType 'application/json' -Body $adminBody
$adminToken = $adminLogin.tokens.accessToken
try {
  $null = Invoke-RestMethod -Uri "$base/organizations/current" -Method PATCH -Headers @{ 'x-vercel-protection-bypass' = $bypass; 'Authorization' = "Bearer $adminToken"; 'x-organization-id' = 'org_acme_001' } -ContentType 'application/json' -Body (@{ name = 'Unauthorized Hack' } | ConvertTo-Json)
  Write-Host "FAILURE: Admin was permitted to update organization settings!"
} catch {
  Write-Host "6. RBAC Check PASSED: Admin blocked with HTTP $([int]$_.Exception.Response.StatusCode) (Forbidden)"
}

Write-Host "`n--- TEST 7: UNAUTHENTICATED REQUEST REJECTION ---"
try {
  $null = Invoke-RestMethod -Uri "$base/organizations/current" -Method GET -Headers @{ 'x-vercel-protection-bypass' = $bypass }
  Write-Host "FAILURE: Unauthenticated user accessed settings endpoint!"
} catch {
  Write-Host "7. Auth Guard PASSED: Unauthenticated request rejected with HTTP $([int]$_.Exception.Response.StatusCode) (Unauthorized)"
}

Write-Host "`n--- TEST 9: VALIDATION REJECTION (NAME UNDER 2 CHARS) ---"
try {
  $null = Invoke-RestMethod -Uri "$base/organizations/current" -Method PATCH -Headers @{ 'x-vercel-protection-bypass' = $bypass; 'Authorization' = "Bearer $ownerToken"; 'x-organization-id' = 'org_acme_001' } -ContentType 'application/json' -Body (@{ name = 'A' } | ConvertTo-Json)
  Write-Host "FAILURE: Single-character name was accepted!"
} catch {
  Write-Host "9. Validation Check PASSED: Short name rejected with HTTP $([int]$_.Exception.Response.StatusCode) (Bad Request)"
}

Write-Host "`n--- TEST 8: RESTORE WORKSPACE NAME ---"
$restoreBody = @{ name = 'Acme Corp' } | ConvertTo-Json
$restoreRes = Invoke-RestMethod -Uri "$base/organizations/current" -Method PATCH -Headers @{ 'x-vercel-protection-bypass' = $bypass; 'Authorization' = "Bearer $ownerToken"; 'x-organization-id' = 'org_acme_001' } -ContentType 'application/json' -Body $restoreBody
Write-Host "8. Restored Workspace Name to: $($restoreRes.organization.name)"
