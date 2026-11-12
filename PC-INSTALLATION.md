# School PC installation

GravityExplorer is a Windows desktop application built with Electron and Three.js. Its visual interface uses web technology, but the packaged application loads local files directly. The exhibit needs no browser tab, web server, Python installation, Node installation or internet connection to run.

## First installation

1. Copy the **entire** `release/win-unpacked` folder to a permanent school-PC folder, for example `C:\GravityExplorer`. Keep all files together. The portable `GravityExplorer-1.4.0.exe` remains useful for demonstrations; the unpacked application is preferable for Task Scheduler because Windows can track its actual process directly.
2. Open `GravityExplorer.exe`, connect the Arduino and use teacher controls to select hardware mode and pair the correct device. Calibrate and complete the hardware acceptance checks in `GravityExplorer-Plan.md`.
3. Close the app with Ctrl+Shift+Q. Test full-screen launch from PowerShell:

```powershell
& 'C:\GravityExplorer\GravityExplorer.exe' --kiosk
```

The existing application prevents duplicate instances and attempts two renderer reloads after display crashes. A normal teacher exit remains possible with Ctrl+Shift+Q.

## Automatic launch and process recovery

Copy `scripts/Configure-Kiosk.ps1` to the school PC. Run it from Windows PowerShell **while signed in to the Windows account that will show the exhibit**. First validate the installation without changing Windows:

```powershell
.\Configure-Kiosk.ps1 -AppPath 'C:\GravityExplorer\GravityExplorer.exe'
```

Enable startup:

```powershell
.\Configure-Kiosk.ps1 -Action Install -AppPath 'C:\GravityExplorer\GravityExplorer.exe'
```

The task opens the application full screen at this account's sign-in, imposes no runtime limit and retries up to three times, one minute apart, if the application process exits with an error. A normal teacher exit does not trigger these failure retries. It does not automatically log into Windows, change power settings or launch immediately. School policies may require an IT administrator to register the task or approve the script. Use the same exhibit account; running as a different administrator registers startup for that administrator instead.

Remove automatic startup:

```powershell
.\Configure-Kiosk.ps1 -Action Remove
```

After moving the application, reinstall the task with the new path. For updates, close the application, replace the complete app folder, then validate and reinstall the task. Do not overwrite application files while it is running.

## Daily operation

- Configure the PC's plugged-in display and sleep settings for exhibit hours; the startup script does not keep a sleeping PC awake. Schedule Windows updates outside those hours.
- Use the intended exhibit account. Sign in after boot, and confirm the display shows Earth and teacher controls show a connected, calibrated scale before admitting visitors.
- A UPS can keep short power interruptions from stopping the PC. BIOS power restoration and Windows sign-in behavior need separate school IT configuration if unattended restart after a power cut is required.
- Test a full school day on the actual PC. Automatic process retries do not detect every frozen UI or hardware fault; this setup is not a guarantee of unattended continuous operation.

## Validation status and references

The application package and offline mapped Earth rendering passed desktop smoke tests. The setup script can be checked with its default validation action without registering a task. Startup, failure retries, reboot behavior, school power settings and physical hardware must be acceptance-tested on the exhibit PC.

Architecture: [Electron](https://www.electronjs.org/docs/latest/). Startup and recovery: [Microsoft sign-in triggers](https://learn.microsoft.com/en-us/powershell/module/scheduledtasks/new-scheduledtasktrigger) and [task settings](https://learn.microsoft.com/en-us/powershell/module/scheduledtasks/new-scheduledtasksettingsset).
