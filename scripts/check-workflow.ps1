param(
    [string]$RepoPath = "C:\Users\radub\Documents\HealthAutomation",
    [string]$ExpectedRemote = "https://github.com/radubobirnac/Health-Automation.git",
    [string]$ExpectedBranch = "main"
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

$gitCmd = Get-GitCommand

function Get-GitOutput {
    param([string[]]$GitArgs)
    $output = & $gitCmd @GitArgs 2>&1
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

$remote = Get-GitOutput -GitArgs @("remote", "get-url", "origin")

if ($remote -ne $ExpectedRemote) {
    throw "Unexpected origin remote. Expected: $ExpectedRemote, Actual: $remote"
}

$branch = Get-GitOutput -GitArgs @("rev-parse", "--abbrev-ref", "HEAD")

if ($branch -ne $ExpectedBranch) {
    throw "Unexpected branch. Expected: $ExpectedBranch, Actual: $branch"
}

Write-Host "Workflow check passed."
Write-Host "Repo: $RepoPath"
Write-Host "Remote: $remote"
Write-Host "Branch: $branch"
Write-Host ""
Write-Host "Current status:"
& $gitCmd status --short --branch
