# GravityExplorer production hardware selection

Updated 4 November 2026. Recommended procurement and integration plan; equipment has not been purchased or tested together. This supersedes the HX711/Uno purchasing recommendation in the earlier installation plan. Existing v1.4 hardware firmware still targets HX711 and must be replaced for this architecture.

## Selected weighing device

**Adam Equipment MDW 300L**, complete person-weighing scale with RS-232. Obtain the exact MDW 300L model with its manufacturer power adapter, serial cable/pinout, operating manual and supplier calibration documentation.

The manufacturer lists 300 kg capacity, 0.05 kg readability, a 275 × 375 mm non-slip platform and a metal base/pillar. Its specified repeatability and linearity are 0.1 kg; readability is not an accuracy guarantee. It is a standing-person scale rather than a goods platform. The pillar/height rod affects enclosure space: preserve the complete supported assembly; do not assume the base can be separated or buried under an exhibit deck.

Source: [manufacturer product page](https://adamequipment.com/mdw-300l-us.html).

## Connection architecture

```text
MDW 300L complete scale
        │ RS-232
Enclosed interface carrier using TI MAX3232E
        │ 5 V UART
Arduino Mega 2560 Rev3 ── USB ── PC running GravityExplorer
        ├── D2: Next button
        └── D3: Previous button
```

Use a **Mega 2560 Rev3**, not the earlier Uno selection, so the scale has a hardware UART separate from the PC USB connection. Serial1 uses RX1 D19 and TX1 D18. Keep USB Serial for the exhibit protocol. Source: [Arduino manufacturer specifications](https://store.arduino.cc/products/arduino-mega-2560-rev3).

The interface carrier must include the transceiver, its specified capacitors, power decoupling, secured connectors and an enclosure. Prefer a supported assembled carrier or a manufactured PCB over loose jumper wiring. The MAX3232E is a voltage-level interface, not an ADC and not galvanically isolated. Source: [TI MAX3232E](https://www.ti.com/product/MAX3232E).

## Signal connections and scale setup

For the reviewed MDW manual revision, DB9 pin 2 is scale TX, pin 3 is scale RX and pin 5 is signal ground. Route these through the RS-232 side of the carrier; its logic RX output goes to Mega D19, and Mega D18 drives its logic TX input. Do not connect RS-232 signals directly to Arduino pins. Confirm the delivered revision and cable wiring before assembly.

The reviewed manual specifies 9600 baud, 8 data bits, no parity and one stop bit. Use kg, disable auto-off, select P.H.=0 and S.F.=3 for command operation. `W\r` requests weight; status bytes identify motion and errors. Scale configuration and serial protocol source: [manufacturer manual, sections 7–8](https://adamequipment.co.za/media/docs/manuals/MDW_300L_UM_EN.pdf).

Both momentary button commons connect to Mega GND, with Next NO to D2 and Previous NO to D3, using internal pull-ups. Illuminated button lamps require their own correctly rated wiring/driver, separate from the switch contacts. Power the scale with its own supplied adapter; power the Mega through the PC USB connection. No HX711 or external bare load cells are needed.

## Software changes required after procurement

- Replace the HX711 firmware with an MDW serial adapter on Serial1; retain button debounce and the USB exhibit protocol.
- Parse complete bounded messages, units, error/status fields and timeouts. A moving visitor must not be confused with a lost connection. Do not turn missing packets into a zero reading.
- Measure the actual update cadence before choosing capture settings. Current controller assumptions include gaps no greater than 350 ms and at least ten samples; they cannot be carried over blindly. Configure timing and stability from fresh device readings, never repeated cached values.
- Keep stable automatic capture, empty-platform confirmation, locked visitor measurements and manual Previous/Next navigation. Keep a disconnected device visibly unavailable; never substitute practice data.
- Replace HX711 tare/reference-mass controls with device status and supplier/service calibration instructions. Calibration belongs to the complete scale; do not add a second calibration factor in Arduino. Match the app capacity setting to the commissioned scale.
- Keep all screen content offline and preserve the existing practice mode for demonstrations, clearly marked.

## Purchasing request

Request a written quotation for one MDW 300L with working RS-232, the supplied adapter, documented cable, calibration documentation, Indian delivery charges/taxes, warranty and service arrangements. Ask the supplier to demonstrate unattended weight/status retrieval from the exact delivered revision. Confirm continuous operating suitability for the intended school opening hours. Indian stock, price, lead time and local service have **not** been verified; this is a specific recommended model, not a confirmed local purchase listing.

For the electronics, obtain one genuine Mega 2560 Rev3, one properly assembled MAX3232E interface carrier, one USB data cable, two robust momentary panel buttons, and a secured electronics enclosure with strain relief.

## Product acceptance

Before releasing the assembled station, verify repeated and off-centre readings against the supplier's specification using suitable known loads; include visitors standing still and moving. Confirm empty/occupied startup, unit handling, overweight and serial errors, button bounce, USB/scale power recovery and operation throughout the intended opening hours. Check that the exhibit enclosure never contacts or loads the weighing mechanism. Record the delivered model/revision, settings, firmware version and calibration/service information for every installation.

The next integration milestone is a working scale-to-Mega-to-PC link with the actual device. Existing software tests do not certify this new hardware path.
