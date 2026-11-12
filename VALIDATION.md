# GravityExplorer v1.4.0 validation

Verified on 2026-10-31 on Windows x64.

| Check | Result |
|---|---|
| Controller, gravity, framing and serial transport | 31 automated tests passed |
| Manual journey | All eight planets remain selected through a simulated minute of scale samples each; only a button press advances them |
| Manual finish | Results persist through a simulated ten-minute wait; a button press clears the measurement |
| Button debounce | Repeated presses inside 450 ms advance only once |
| Packaged offline desktop | Passed with all HTTP/HTTPS requests blocked, zero external requests, sandbox enabled and Node unavailable |
| Real renderer timing | Mercury remained selected after an eight-second wait beyond the former seven-second timer; pressing Next changed it to Venus; Previous returned to Mercury and disabled at the first planet |
| Simplified controls | No voice controls, planet statistics panel or planet navigation buttons in the packaged interface |
| PC weight layout | At 1366×768, weight digits measured 222.72 px and the Mercury instructions cleared the planet strip by 111 px |
| Solar-system overview | Local mapped planets, eight world labels and WebGL canvas present; Start switched to the Earth weighing view |
| Production build | Passed |

The release is an offline Windows station with a full-display solar-system idle view and two large Previous/Next controls. Capture still happens automatically after a stable reading; progression through planets and the final comparison requires the button. Waiting for an unoccupied scale still times out after 45 seconds. The overview returns after finishing and confirming the platform is empty. No spoken narration is included. On-screen accessibility announcements remain available to assistive technology.

The two-button Uno sketch compiled with Arduino AVR core 1.8.8 and bogde HX711 0.7.5: 11,424 bytes flash, 454 bytes global RAM. Next uses D2 and Previous uses D3, with both switches to GND. The app accepts legacy undirected button frames as Next. Physical scale calibration, switch wiring, mechanical capacity, USB recovery, school-PC performance and full-day operation still require acceptance testing on the installation hardware. The Windows portable executable is unsigned. Orbital positions, speeds, distances and sizes are illustrative.
