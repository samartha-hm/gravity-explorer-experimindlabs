# GravityExplorer by ExpermindLabs

Offline interactive school exhibit: two arcade-style buttons, human-rated scale, 10 celestial destinations across the solar system, and an edge-to-edge 3D attract screen.

## Run now

Open `release/GravityExplorer-1.5.0.exe` (or `release/win-unpacked/GravityExplorer.exe`) on Windows x64. First launch uses **practice mode**: click Start or press Space and a simulated 60 kg visitor automatically captures the first weight. No Arduino or internet needed. Settings persist, so subsequent launches can retain hardware mode.

The idle screen presents an edge-to-edge 3D animated solar system with the Sun, all eight orbiting planets, Saturn’s rings and an asteroid belt. Starting a visit brings Earth into focus for weighing. Once locked, the visitor embarks on a 10-world journey in exact astronomical sequence:

1. **Earth** (01 // Home Planet — Baseline measurement)
2. **The Moon** (02 // Natural Satellite — 1.62 m/s²)
3. **The Sun** (03 // Yellow Dwarf Star — 274.00 m/s², visible surface)
4. **Mercury** (04 // Rocky Planet — 3.70 m/s²)
5. **Venus** (05 // Rocky Planet — 8.87 m/s²)
6. **Mars** (06 // Rocky Planet — 3.71 m/s²)
7. **Jupiter** (07 // Gas Giant — 24.79 m/s²)
8. **Saturn** (08 // Gas Giant — 10.44 m/s² with sweeping 3D rings)
9. **Uranus** (09 // Ice Giant — 8.87 m/s² with 98° axial tilt)
10. **Neptune** (10 // Ice Giant — 11.15 m/s²)
11. **Mission Complete Debriefing** (10-World Comparison Grid)

Each destination pairs a detailed 3D celestial body with an oversized weight result, scientific surface gravity, and force in Newtons. Each world waits indefinitely until the visitor presses the physical **Next (D2)** or **Previous (D3)** button. Voiceover is removed for quiet fair operation. The idle attract screen fills the display edge-to-edge with no text clutter.

The portable app is unsigned. Use the copy built from this source through your school’s normal software approval process. The finalized component list, wiring, research and installation checks are in [GravityExplorer-Plan.md](GravityExplorer-Plan.md).

| Control | Action |
|---|---|
| Next button (D2) / Space / Enter / Right arrow | Start, next planet, finish |
| Previous button (D3) / Left arrow | Previous planet; return from results to Neptune |
| Mouse/touch main button | Same actions |
| Gear / Ctrl+Shift+S | Teacher controls |
| F11 | Desktop fullscreen |
| Ctrl+Shift+Q | Exit, including kiosk mode |

During weighing, extra button presses are ignored. Capture is automatic. Opening setup cancels unfinished weighing; a captured journey pauses until setup closes. New visitors must begin with a confirmed empty platform.

## Development

For permanent school-PC installation, full-screen startup and automatic process failure retries, follow [PC-INSTALLATION.md](PC-INSTALLATION.md). A Python server is not needed. The setup script validates by default; it changes startup only when run with `-Action Install`.

Use Node 22.12+ and npm (tested on Node 24):

```powershell
npm ci
npm run dev
```

Open the exact local URL printed by Vite. Chrome/Edge supports Web Serial; other browsers can run practice mode. The desktop app is the intended exhibit deployment.

```powershell
npm test
npm run build
npm run test:desktop
npm start
npm run package
```

First dependency installation and packaging need internet to download official build tools; the finished app runs offline. `test:desktop` loads production files in a hidden sandboxed Electron renderer, so build first. `package:dir` creates an unpacked Windows directory. `npm start -- --kiosk` starts fullscreen kiosk mode. Fonts and planetary maps are local. The station includes detailed 2K maps, Earth clouds and night lights, a solar-system overview and oversized weight readings. Design research is in [VISUAL-RESEARCH.md](VISUAL-RESEARCH.md); texture credits are in [ATTRIBUTION.md](public/textures/ATTRIBUTION.md).

## Hardware setup

**Production selection:** use the complete MDW 300L scale and Mega-based serial bridge described in [PRODUCTION-HARDWARE.md](PRODUCTION-HARDWARE.md). The HX711 instructions below document the currently implemented firmware; the selected production scale requires new integration firmware and hardware validation.

1. Assemble an approved human-rated platform, suitable full-bridge load-cell system, 5 V-compatible HX711 and Uno R3 using the finalized plan.
2. In Arduino IDE install **HX711 Arduino Library by Bogdan Necula / bogde 0.7.5** (not the similarly named Rob Tillaart library). Select Arduino Uno and upload `firmware/GravityExplorer/GravityExplorer.ino`. Close Serial Monitor before opening the app’s USB connection.
3. Next button NO → D2, common → GND. Previous button NO → D3, common → GND. Both use internal pull-ups. Upload the updated sketch to enable Previous. HX711 DT → D4, SCK → D5, compatible VCC → 5 V, GND → GND. Use 10 Hz operation. Cell wiring follows its datasheet. The lamp needs its own correctly rated supply/driver.
4. Teacher controls → Input source → Arduino + HX711 scale → Connect scale → select Uno.
5. Physically empty the platform, allow to settle, tick confirmation and record empty. Add a known 1–100 kg reference mass, wait at least 3 seconds, enter its value and calibrate. Never use a person’s estimated weight as reference.
6. Remove reference, verify zero and additional loads, then set actual platform capacity. The default 200 kg is provisional and cannot provide physical overload protection.

Calibration saves offset/factor in EEPROM with version/checksum. No automatic startup tare. Before CAL commits, the previous saved calibration remains available after restart. Power loss during the EEPROM write can invalidate calibration; repeat calibration before use.

## Troubleshooting

- No port: check USB data cable/driver, close other serial apps, and re-pair after COM-port changes.
- Waiting for firmware: upload this exact sketch; serial speed is 115200 baud.
- Calibration required: complete both steps. Moving reference: wait at least 3 seconds and check mechanical isolation.
- Step-off request: clear for at least 1.2 seconds, including after restart or a measurement fault.
- Unstable readings: inspect mounting, cables, cell wiring and reference masses; do not hide drift with automatic zeroing.
- USB removal: weighing is invalidated; retry occurs every 3 seconds. Captured journeys can finish. There is no automatic fallback to fictional data.
- Slow animation: choose Low graphics and Reduce motion; check graphics drivers. WebGL failure uses a simpler CSS planet.

## Protocol v1

115200 baud, UTF-8 newline-delimited JSON, maximum 512 characters/frame. Each device message contains version, boot identity and increasing sequence. New boots must introduce themselves with hello; periodic hello enables reconnection without resetting Uno.

```json
{"v":1,"boot":"uno-1","seq":0,"type":"hello","calibrated":true}
{"v":1,"boot":"uno-1","seq":1,"type":"measurement","kg":60.025,"valid":true}
{"v":1,"boot":"uno-1","seq":2,"type":"button"}
{"v":1,"boot":"uno-1","seq":3,"type":"ack","id":1,"ok":true,"message":"Empty platform recorded."}
{"v":1,"boot":"uno-1","seq":4,"type":"fault","message":"HX711 not responding"}
```

PC commands are ASCII lines with positive command IDs:

The updated two-button sketch includes `"action":"next"` or `"action":"previous"` on button frames. Legacy button frames without an action still mean Next. Re-upload the current firmware to use the D3 Previous switch.

```text
TARE 1
CAL 2 10.0
```

TARE records a pending zero and pauses valid readings; CAL requires a stable reference and pending zero, then saves both values. Acknowledgements include ID, success and message; app timeout is 5 seconds. Malformed, duplicate, old and incompatible frames cannot enter capture logic.

## Source map

| Path | Responsibility |
|---|---|
| `src/core.js` | Pure weighing/journey controller, parser, protocol |
| `src/data.js` | JPL gravity constants and calculations |
| `src/app.js` | Visitor UI, teacher panel, practice simulator |
| `src/scene.js` | Three.js models, textures, lighting, animation |
| `src/serial.js` | USB lifecycle, retry, acknowledgements |
| `src/style.css`, `src/station.css` | Responsive visual design and fair arcade kiosk styling |
| `public/textures/` | Offline CC BY 4.0 planetary maps and attribution |
| `electron/` | Desktop isolation and device permissions |
| `firmware/GravityExplorer/` | Uno sensor/button/calibration firmware |
| `tests/` | Science, capture, transport and desktop checks |

Visitor measurements are never stored. Preferences and approved device identity remain local. This educational exhibit is not a certified weighing instrument; physical calibration and installation acceptance are required before school use.

See [VALIDATION.md](VALIDATION.md) for completed software checks and outstanding installation checks. The compiled Uno HEX files are in `firmware/compiled`; using Arduino IDE to upload the source remains the recommended setup route.
