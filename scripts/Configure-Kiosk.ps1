[CmdletBinding()]
param(
    [ValidateSet('Validate', 'Install', 'Remove')]
    [string]$Action = 'Validate',
    [string]$AppPath = (Join-Path $PSScriptRoot '..\release\win-unpacked\GravityExplorer.exe')
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$taskName = 'GravityExplorer-Kiosk-' + $identity.User.Value

if ($Action -eq 'Remove') {
    $existing = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
    if ($existing) {
        Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
    }
    Write-Output 'Automatic startup removed for this Windows account. Any running app stays open.'
    return
}

$resolvedApp = (Resolve-Path -LiteralPath $AppPath).ProviderPath
if ([IO.Path]::GetFileName($resolvedApp) -ne 'GravityExplorer.exe') {
    throw 'Select GravityExplorer.exe from the complete unpacked application folder, not the portable launcher.'
}
$appDirectory = Split-Path -Parent $resolvedApp
if (-not (Test-Path -LiteralPath (Join-Path $appDirectory 'resources\app.asar') -PathType Leaf)) {
    throw 'Application files are incomplete. Copy the entire win-unpacked folder before installing startup.'
}

Import-Module ScheduledTasks
$taskAction = New-ScheduledTaskAction -Execute $resolvedApp -Argument '--kiosk' -WorkingDirectory $appDirectory
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $identity.Name
$principal = New-ScheduledTaskPrincipal -UserId $identity.User.Value -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew `
    -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) `
    -ExecutionTimeLimit ([TimeSpan]::Zero) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
$task = New-ScheduledTask -Action $taskAction -Trigger $trigger -Principal $principal -Settings $settings `
    -Description 'GravityExplorer school exhibit: full-screen offline app at sign-in; retry failed process up to three times.'

if ($Action -eq 'Validate') {
    Write-Output "Validated app: $resolvedApp"
    Write-Output "Account: $($identity.Name); task: $taskName"
    Write-Output 'Plan: sign-in launch, kiosk mode, no execution time limit, three failure retries at one-minute intervals.'
    Write-Output 'No task was registered and no app was launched. Use -Action Install on the exhibit PC to enable startup.'
    return
}

Register-ScheduledTask -TaskName $taskName -InputObject $task -Force | Out-Null
Write-Output "Installed startup task for $($identity.Name). It will run at the next sign-in."
Write-Output 'Close any existing GravityExplorer instance before testing startup from Windows Task Scheduler.'
