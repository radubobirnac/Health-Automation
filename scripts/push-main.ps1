param(
    [Parameter(Mandatory = $true)]
    [string]$Message,
    [string]$RepoPath = "C:\Users\radub\Documents\HealthAutomation",
    [switch]$SkipPull,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

function Get-GitCommand {
    $cmd = Get-Command git -ErrorAction SilentlyContinue
    if ($cmd) {
        return $cmd.Source
    }

    $candidates = @(
        "$env:ProgramFiles\Git\cmd\git.exe",
        "$env:ProgramFiles\Git\bin\git.exe",
        "$env:ProgramW6432\Git\cmd\git.exe",
        "$env:LocalAppData\Programs\Git\cmd\git.exe"
    )

    foreach ($candidate in $candidates) {
        if (Test-Path -LiteralPath $candidate) {
            return $candidate
        }
    }

    throw "git.exe not found. Install Git for Windows or add git to PATH."
}

$script:GitCmd = Get-GitCommand

function Invoke-Git {
    param([string[]]$GitArgs)
    & $script:GitCmd @GitArgs
    if ($LASTEXITCODE -ne 0) {
        throw "git $($GitArgs -join ' ') failed."
    }
}

function Get-GitOutput {
    param([string[]]$GitArgs)
    $output = & $script:GitCmd @GitArgs 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "git $($GitArgs -join ' ') failed: $output"
    }
    return ($output | Out-String).Trim()
}

if (-not (Test-Path -LiteralPath $RepoPath)) {
    throw "Repo path does not exist: $RepoPath"
}

Set-Location -LiteralPath $RepoPath

$insideRepo = Get-GitOutput -GitArgs @("rev-parse", "--is-inside-work-tree")
if ($insideRepo -ne "true") {
    throw "Not a git repository: $RepoPath"
}

$branch = Get-GitOutput -GitArgs @("rev-parse", "--abbrev-ref", "HEAD")

if ($branch -ne "main") {
    throw "This script only pushes from 'main'. Current branch: $branch"
}

if (-not $SkipPull) {
    if ($DryRun) {
        Write-Host "[DryRun] git pull origin main"
    } else {
        Invoke-Git @("pull", "origin", "main")
    }
}

$pending = Get-GitOutput -GitArgs @("status", "--porcelain")

if (-not $pending) {
    Write-Host "No local changes to commit."
    exit 0
}

if ($DryRun) {
    Write-Host "[DryRun] git add ."
    Write-Host "[DryRun] git commit -m `"$Message`""
    Write-Host "[DryRun] git push origin main"
    exit 0
}

Invoke-Git @("add", ".")
Invoke-Git @("commit", "-m", $Message)
Invoke-Git @("push", "origin", "main")

Write-Host "Push complete."
