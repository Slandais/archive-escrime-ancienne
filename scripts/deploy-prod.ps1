Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$vercelProjectFile = Join-Path $repoRoot ".vercel\project.json"
$vercelArgs = @("--scope", "slandais-projects")
$vercelProjectName = "archive-escrime-medievale"

Push-Location $repoRoot
try {
    $shouldLink = $true
    if (Test-Path -LiteralPath $vercelProjectFile) {
        $projectConfig = Get-Content -LiteralPath $vercelProjectFile -Raw | ConvertFrom-Json
        $shouldLink = $projectConfig.projectName -ne $vercelProjectName
    }

    if ($shouldLink) {
        Write-Host "Association du depot au projet $vercelProjectName..."
        & npx.cmd vercel link --yes --project $vercelProjectName @vercelArgs
        if ($LASTEXITCODE -ne 0) {
            throw "Echec de 'vercel link'."
        }
    }

    Write-Host "Deploiement production depuis la racine du depot..."
    & npx.cmd vercel deploy --prod --yes @vercelArgs
    if ($LASTEXITCODE -ne 0) {
        throw "Echec de 'vercel deploy'."
    }
}
finally {
    Pop-Location
}
