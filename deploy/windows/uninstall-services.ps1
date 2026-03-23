. "$PSScriptRoot\common.ps1"

Assert-Administrator

Uninstall-ServiceIfInstalled -Name $script:CaddyServiceName -WrapperPath $script:CaddyServiceExe
Uninstall-ServiceIfInstalled -Name $script:GoServerServiceName -WrapperPath $script:GoServerServiceExe

Write-Host ''
Write-Host 'If this laptop also runs the Cloudflare Tunnel connector, remove it separately:' -ForegroundColor Yellow
Write-Host '  cloudflared.exe service uninstall'
