. "$PSScriptRoot\common.ps1"

Assert-Administrator
Assert-ServicePrerequisites
Ensure-WinSWWrapper -WrapperPath $script:GoServerServiceExe -ServiceLabel $script:GoServerServiceName
Ensure-WinSWWrapper -WrapperPath $script:CaddyServiceExe -ServiceLabel $script:CaddyServiceName
Ensure-WinSWConfig -TemplatePath $script:GoServerServiceTemplate -ConfigPath $script:GoServerServiceConfig -ServiceLabel $script:GoServerServiceName
Ensure-WinSWConfig -TemplatePath $script:CaddyServiceTemplate -ConfigPath $script:CaddyServiceConfig -ServiceLabel $script:CaddyServiceName
Invoke-DeployBuilds
Assert-BuildArtifacts

Ensure-ServiceInstalled -Name $script:GoServerServiceName -WrapperPath $script:GoServerServiceExe
Ensure-ServiceInstalled -Name $script:CaddyServiceName -WrapperPath $script:CaddyServiceExe

Start-Or-RestartService -Name $script:GoServerServiceName
Start-Or-RestartService -Name $script:CaddyServiceName

Wait-ForHealthChecks
Write-HealthChecks
Write-CloudflareReminder
