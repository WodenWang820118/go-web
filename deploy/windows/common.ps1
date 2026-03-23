Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$script:WorkspaceRoot = 'C:\software-dev\gx.go'
$script:DeployRoot = Join-Path $script:WorkspaceRoot 'deploy\windows'
$script:GoWebIndex = Join-Path $script:WorkspaceRoot 'dist\apps\go-web\browser\index.html'
$script:GoServerEntry = Join-Path $script:WorkspaceRoot 'dist\go-server\main.js'
$script:GoServerServiceName = 'gx-go-server'
$script:CaddyServiceName = 'gx-go-caddy'
$script:GoServerServiceExe = Join-Path $script:DeployRoot 'gx-go-server.exe'
$script:CaddyServiceExe = Join-Path $script:DeployRoot 'gx-go-caddy.exe'
$script:GoServerServiceTemplate = Join-Path $script:DeployRoot 'go-server-service.xml'
$script:CaddyServiceTemplate = Join-Path $script:DeployRoot 'caddy-service.xml'
$script:GoServerServiceConfig = Join-Path $script:DeployRoot 'gx-go-server.xml'
$script:CaddyServiceConfig = Join-Path $script:DeployRoot 'gx-go-caddy.xml'
$script:WinSWSourceExe = Join-Path $script:DeployRoot 'WinSW-x64.exe'
$script:NodeExe = 'C:\nvm4w\nodejs\node.exe'
$script:CaddyExe = 'C:\Services\caddy\caddy.exe'
$script:CaddyConfig = Join-Path $script:DeployRoot 'Caddyfile'
$script:HealthCheckUrls = @(
  'http://127.0.0.1:3000/api/health',
  'http://127.0.0.1/',
  'http://127.0.0.1/api/health'
)

function Write-Step {
  param([string] $Message)

  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Assert-Administrator {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object Security.Principal.WindowsPrincipal $identity

  if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw 'Run this script from an elevated PowerShell session (Run as administrator).'
  }
}

function Assert-PathExists {
  param(
    [string] $Path,
    [string] $Description
  )

  if (-not (Test-Path -LiteralPath $Path)) {
    throw "Missing $Description at $Path."
  }
}

function Invoke-NxCommand {
  param([string[]] $Arguments)

  Push-Location $script:WorkspaceRoot
  try {
    & npm exec -- nx @Arguments
    if ($LASTEXITCODE -ne 0) {
      throw "Nx command failed: npm exec -- nx $($Arguments -join ' ')"
    }
  } finally {
    Pop-Location
  }
}

function Invoke-DeployBuilds {
  Write-Step 'Building go-web (production)'
  Invoke-NxCommand @('build', 'go-web', '--configuration=production')

  Write-Step 'Building go-server'
  Invoke-NxCommand @('build', 'go-server')
}

function Assert-BuildArtifacts {
  Assert-PathExists $script:GoWebIndex 'Angular production index.html'
  Assert-PathExists $script:GoServerEntry 'go-server entrypoint'
}

function Assert-ServicePrerequisites {
  Assert-PathExists $script:NodeExe 'Node.js executable'
  Assert-PathExists $script:CaddyExe 'Caddy executable'
  Assert-PathExists $script:CaddyConfig 'Caddyfile'
}

function Ensure-WinSWWrapper {
  param(
    [string] $WrapperPath,
    [string] $ServiceLabel
  )

  if (Test-Path -LiteralPath $WrapperPath) {
    return
  }

  Assert-PathExists $script:WinSWSourceExe 'WinSW-x64.exe'
  Write-Step "Creating WinSW wrapper for $ServiceLabel"
  Copy-Item -LiteralPath $script:WinSWSourceExe -Destination $WrapperPath
}

function Ensure-WinSWConfig {
  param(
    [string] $TemplatePath,
    [string] $ConfigPath,
    [string] $ServiceLabel
  )

  Assert-PathExists $TemplatePath "WinSW config template for $ServiceLabel"

  Write-Step "Preparing WinSW config for $ServiceLabel"
  Copy-Item -LiteralPath $TemplatePath -Destination $ConfigPath -Force
}

function Get-ServiceObject {
  param([string] $Name)

  return Get-Service -Name $Name -ErrorAction SilentlyContinue
}

function Ensure-ServiceInstalled {
  param(
    [string] $Name,
    [string] $WrapperPath
  )

  if (Get-ServiceObject -Name $Name) {
    Write-Step "$Name is already installed"
    Write-Step "Refreshing $Name configuration"
    & $WrapperPath refresh
    if ($LASTEXITCODE -ne 0) {
      throw "Failed to refresh $Name via $WrapperPath."
    }
    return
  }

  Write-Step "Installing $Name"
  & $WrapperPath install
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to install $Name via $WrapperPath."
  }
}

function Assert-ServiceInstalled {
  param([string] $Name)

  if (-not (Get-ServiceObject -Name $Name)) {
    throw "$Name is not installed. Run .\install-services.ps1 first."
  }
}

function Start-Or-RestartService {
  param([string] $Name)

  $service = Get-Service -Name $Name -ErrorAction Stop

  if ($service.Status -eq 'Running') {
    Write-Step "Restarting $Name"
    Restart-Service -Name $Name -Force
  } else {
    Write-Step "Starting $Name"
    Start-Service -Name $Name
  }

  (Get-Service -Name $Name -ErrorAction Stop).WaitForStatus(
    [System.ServiceProcess.ServiceControllerStatus]::Running,
    (New-TimeSpan -Seconds 30)
  )
}

function Stop-ServiceIfInstalled {
  param([string] $Name)

  $service = Get-ServiceObject -Name $Name
  if (-not $service) {
    return
  }

  if ($service.Status -ne 'Stopped') {
    Write-Step "Stopping $Name"
    Stop-Service -Name $Name -Force
    (Get-Service -Name $Name -ErrorAction Stop).WaitForStatus(
      [System.ServiceProcess.ServiceControllerStatus]::Stopped,
      (New-TimeSpan -Seconds 30)
    )
  }
}

function Uninstall-ServiceIfInstalled {
  param(
    [string] $Name,
    [string] $WrapperPath
  )

  $service = Get-ServiceObject -Name $Name
  if (-not $service) {
    Write-Step "$Name is not installed"
    return
  }

  Assert-PathExists $WrapperPath "WinSW wrapper for $Name"
  Stop-ServiceIfInstalled -Name $Name

  Write-Step "Uninstalling $Name"
  & $WrapperPath uninstall
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to uninstall $Name via $WrapperPath."
  }
}

function Wait-ForUrl {
  param(
    [string] $Url,
    [int] $TimeoutSeconds = 30
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)

  while ((Get-Date) -lt $deadline) {
    try {
      $null = Invoke-WebRequest -Uri $Url -TimeoutSec 5
      return
    } catch {
      Start-Sleep -Seconds 1
    }
  }

  throw "Timed out waiting for $Url."
}

function Wait-ForHealthChecks {
  foreach ($url in $script:HealthCheckUrls) {
    Write-Step "Waiting for $url"
    Wait-ForUrl -Url $url
  }
}

function Write-HealthChecks {
  Write-Host ''
  Write-Host 'Local health checks:' -ForegroundColor Green
  foreach ($url in $script:HealthCheckUrls) {
    Write-Host "  $url"
  }
}

function Write-CloudflareReminder {
  Write-Host ''
  Write-Host 'Cloudflare Tunnel is installed separately.' -ForegroundColor Yellow
  Write-Host 'Run the dashboard-provided command on this laptop as administrator:'
  Write-Host '  cloudflared.exe service install <TUNNEL_TOKEN>'
}
