. "$PSScriptRoot\common.ps1"

Assert-Administrator
Assert-ServicePrerequisites
Invoke-DeployBuilds
Assert-BuildArtifacts

Assert-ServiceInstalled -Name $script:GoServerServiceName
Assert-ServiceInstalled -Name $script:CaddyServiceName

Start-Or-RestartService -Name $script:GoServerServiceName
Start-Or-RestartService -Name $script:CaddyServiceName

Wait-ForHealthChecks
Write-HealthChecks
