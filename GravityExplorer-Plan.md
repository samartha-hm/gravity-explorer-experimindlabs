# Production hardware selection — 4 November 2026

The recommended product architecture is now **Adam Equipment MDW 300L → MAX3232E RS-232 interface → Arduino Mega 2560 Rev3 → USB → PC**. See [PRODUCTION-HARDWARE.md](PRODUCTION-HARDWARE.md) for the exact selection, wiring, purchasing request and required integration changes. This supersedes earlier HX711/Uno purchasing guidance. The existing HX711 firmware is not compatible with the new scale until a device adapter is implemented and validated.

# Current station controls — v1.4

The current installation uses two momentary buttons: Next NO → Uno D2, Previous NO → Uno D3; both commons → GND. Upload the latest sketch. Existing HX711 D4/D5 wiring is unchanged. Next starts, advances, opens all weights and finishes; Previous returns one planet or returns from results to Neptune. Mercury is the first destination. There are no automatic destination changes or narration. Idle mode shows a large solar system with only a Start control and disabled Previous. Earlier one-button design notes below are superseded by this section.

# GravityExplorer — finalized installation plan

School exhibit · English · offline Windows PC and existing monitor · one physical illuminated button.

## Visitor journey

1. Animated Earth with moving clouds and a blue atmospheric glow, and “Same you. New worlds.” invite exploration.
2. Press the button to start; captions explain how to stand on the platform. No approach sensor is needed.
3. If occupied at startup, first ask the visitor to step off. Confirm empty for 1.2 seconds.
4. Capture automatically after 1.8 seconds of stable measurements: spread ≤0.30 kg, half-window drift ≤0.15 kg, fresh continuous samples. Button presses cannot force capture.
5. Visit all eight planets in solar-system order. Show a rotating 3D planet, weight comparison, gravity ratio, short fact and force in newtons. The visitor can step off after capture.
6. Each planet advances after 7 seconds, or sooner with a button press. Teachers can choose 5/7/10 seconds.
7. Display all eight results. Button finishes, or results clear after 22 seconds. Return to welcome after confirming an empty platform. Unfinished weighing times out after 45 seconds.

Mouse, touch and Space/Enter offer equivalent controls. No touchscreen, student account or internet is required. A new visitor cannot overwrite a captured journey.

## Procurement and assembly

| Component | Quantity | Selection |
|---|---:|---|
| PC and monitor | Existing | Windows 10/11 x64; aim for 1920×1080, 8 GB RAM, USB and WebGL2. Test the actual PC. |
| Arduino Uno R3 | 1 | 5 V ATmega328P, enclosed, with a USB data cable. Firmware supplied. |
| HX711 module | 1 | Reputable 5 V-compatible board, 10 samples/sec configuration. |
| Load platform | 1 | Professionally fabricated, approved for people, rigid, low-profile, nonslip, protected edges and mechanical overload stops. Provisionally target 200 kg; supplier must confirm the assembly rating. |
| Load-cell system | 1 | Rated single-point full bridge suitable for the platform; alternatively matched full-bridge cells with the correct trimming junction box. Obtain mounting and wiring datasheets before purchase. |
| Illuminated momentary button | 1 | Normally open, large accessible actuator, separate pedestal mechanically isolated from platform. |
| Lamp supply/driver | 1 | Low voltage and rated for the selected lamp; independent of the Arduino switch circuit. |
| Enclosures and cable protection | As needed | Strain relief, protected wiring, retained USB cable and covered floor routes. |
| Known reference masses | Borrow/buy | A 10–20 kg reference is practical; obtain additional loads to verify accuracy across the intended range. |
| Speakers and UPS | Optional | Local English narration and power continuity. |

Do not assume a bathroom scale exposes its readings digitally. Four three-wire half-bridge cells need the correct bridge combinator, rather than arbitrary parallel connections. A commercial scale with documented RS-232/USB output is an alternative requiring a model-specific adapter; this release implements Arduino + HX711. Obtain local quotes after selecting the mechanical system; no speculative prices are included.

| Wiring | Uno R3 connection |
|---|---|
| Button NO / common | D2 / GND; internal pull-up enabled |
| HX711 DOUT / SCK | D4 / D5 |
| Compatible HX711 supply / return | 5 V / GND |
| PC | USB data cable, 115200 baud |
| Diagnostic switch LED | Built-in D13 LED follows button state |

Connect cell excitation to E+/E− and signal to A+/A− according to its datasheet; colors are not universal. Use the required junction box/combinator. Keep platform clear of wall contact, pedestal contact and cable tension. The button lamp has its own properly rated supply/driver; never power an arcade-button lamp directly from a GPIO. A technician must approve structural and electrical assembly before visitor use. Software capacity settings do not prevent physical overload.

## Delivered software

- **Electron desktop:** portable Windows app, offline production files, sandboxed renderer, Node disabled, restricted navigation, explicit USB chooser, narrow fullscreen IPC.
- **Vite + JavaScript modules:** UI, pure weighing state controller and separate transport; no runtime server/cloud dependency.
- **Three.js animation:** shaded sphere models, bundled 2K planetary maps with procedural fallbacks, Saturn rings, directional/rim lighting, slow rotation, subtle bobbing and smooth scale transitions. Shared geometry, cached textures, limited pixel ratio and 32 fps ceiling limit GPU load.
- **USB Web Serial:** versioned frames, ordered sequence numbers, boot identity, calibrated handshake, bounded parser, acknowledged commands and reconnect attempts every 3 seconds. Faults never switch to simulated data.
- **Arduino:** HX711 readiness polling, 40 ms switch debounce, bounded command input, two-stage calibration, EEPROM version/checksum, periodic hello and sensor faults. No startup auto-tare.
- **Practice simulator:** clearly labelled fictional measurements; adjustable mass, manual step on/off and automatic demonstration.
- **Teacher controls:** Ctrl+Shift+S / gear; connection, diagnostics, calibration, capacity, timing, reduced motion, low graphics, optional local English narration, fullscreen and reset.

Visitor measurements remain in memory and clear at session end. Only preferences and explicitly approved device identity persist locally. No names, accounts, cloud analytics or history database. Teacher controls are an operational panel, not a password-protected security boundary. Opening the panel cancels unfinished weighing and pauses a captured journey.

## Science and visual accuracy

Mass stays constant; weight is force: `W = mass × gravity`, in newtons. The large kg number is explicitly an **Earth-scale equivalent**: `mass × planetGravity / 9.80`. This theoretical comparison omits latitude, altitude, rotation and local Earth-gravity corrections.

| Planet | Equatorial gravity, m/s² | 60 kg visitor: equivalent kg |
|---|---:|---:|
| Mercury | 3.70 | 22.7 |
| Venus | 8.87 | 54.3 |
| Earth | 9.80 | 60.0 |
| Mars | 3.71 | 22.7 |
| Jupiter | 24.79 | 151.8 |
| Saturn | 10.44 | 63.9 |
| Uranus | 8.87 | 54.3 |
| Neptune | 11.15 | 68.3 |

Use this consistent JPL dataset; do not mix reference levels from other tables. Gas/ice giants use atmospheric reference levels and have no solid standing surface. Planet sizes, spacing, terrain art, lighting and rotation speeds are illustrative, not an orbital/topographic simulation.

Locally bundled 2K maps from Solar System Scope / INOVE (CC BY 4.0) distinguish the eight planets. Earth has an independent cloud layer, atmospheric glow and night-side city lights. Original procedural illustrations provide a loading/error fallback. No runtime downloads are needed. Fine orbit guides, instrument labels, planetary profiles and gravity comparison bars enrich the exhibit. See VISUAL-RESEARCH.md and public/textures/ATTRIBUTION.md for research and credits. Low graphics, reduced motion and a simple CSS fallback are supplied. Optional narration uses installed English voices only; captions always carry essential instructions.

Large numbers, keyboard operation, focus indicators and polite announcements support accessibility. Reachable button height, viewing height, queue space and an accessible platform are installation requirements. Staff can demonstrate practice mode when standing is unsuitable.

## Deployment and acceptance

1. Review practice mode with teachers. Set display scaling, fullscreen, timing and optional volume.
2. Approve and assemble the rated platform, sensor and button. Upload supplied firmware; warm up according to the chosen hardware guidance and check zero drift.
3. Select hardware mode and pair Uno. Physically empty platform, wait for stability, record empty. Add accurately known reference mass, wait at least 3 seconds, enter its value and calibrate. Offset/factor save together after successful calibration.
4. Remove reference; verify zero, several loads and off-centre positions. Set capacity to the lowest rated component. Aim for ±0.2 kg under static known loads, subject to selected hardware; this is an acceptance target, not certified accuracy.
5. Test occupied startup, early step-on, movement, held/repeated button, visitor changing during journey, unplug/replug, Arduino reboot and sensor disconnection. New captures after faults require a fresh clear platform.
6. Run a school-day soak test, including offline restart. Check rendering performance, temperature, drift, cable retention, queue turnover and clearing of previous measurements.
7. Optional staff shortcut: `--kiosk`. F11 toggles fullscreen; Ctrl+Shift+Q exits. Configure Windows startup only after staff approve daily operation.

Daily: inspect platform/cables, check empty zero and one known load, test button and run one cycle. Recalibrate after movement, repairs or failed checks. Keep source, lockfile, firmware and spare USB cable available. Hardware-in-loop validation and structural approval depend on the real installation and cannot be replaced by software tests.

## Research references

- [NASA/JPL physical parameters](https://ssd.jpl.nasa.gov/planets/phys_par.html): gravity values and reference definitions.
- [NIST mass units](https://www.nist.gov/pml/owm/si-units-mass) and [NASA Jupiter facts](https://science.nasa.gov/jupiter/jupiter-facts/): terminology and giant-planet caveats.
- [SparkFun HX711 guide](https://learn.sparkfun.com/tutorials/load-cell-amplifier-hx711-breakout-hookup-guide/introduction) and [Phidgets load-cell primer](https://www.phidgets.com/docs/Load_Cell_Primer): signal chain, bridges and mounting.
- [Arduino Uno R3](https://docs.arduino.cc/hardware/uno-rev3/) and [bogde HX711](https://github.com/bogde/HX711): hardware and sensor API.
- [Electron devices](https://www.electronjs.org/docs/latest/tutorial/devices) and [security](https://www.electronjs.org/docs/latest/tutorial/security): USB permission and desktop isolation.
- [Three.js responsive rendering](https://threejs.org/manual/en/responsive.html) and [renderer API](https://threejs.org/docs/pages/WebGLRenderer.html): resizing and animation.
- [NASA 3D resources](https://www.nasa.gov/3d-resources/) and [media usage](https://www.nasa.gov/nasa-brand-center/images-and-media/): possible future assets. This release bundles licensed Solar System Scope maps based on NASA and other data, with artistic processing.

Future options: Moon/Pluto bonus destinations, curriculum quizzes, multilingual narration and licensed scientific maps. These are outside the delivered eight-planet v1 scope.
