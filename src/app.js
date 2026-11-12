import './style.css';
import './visuals.css';
import './exhibit.css';
import './station.css';
import { PLANETS, equivalent, force, multiplier, formatKg } from './data.js';
import { Exhibit, DEFAULTS } from './core.js';
import { PlanetScene } from './scene.js';
import { ScaleConnection } from './serial.js';

const $ = selector => document.querySelector(selector);
const icons = { arrow: '↗', settings: '⚙' };

const saved = (() => {
  try {
    return JSON.parse(localStorage.getItem('gravity-settings')) || {};
  } catch {
    return {};
  }
})();

const settings = {
  mode: saved.mode === 'hardware' ? 'hardware' : 'demo',
  reduced: saved.reduced ?? matchMedia('(prefers-reduced-motion: reduce)').matches,
  quality: saved.quality === 'low' ? 'low' : 'high',
  capacity:
    Number.isFinite(saved.capacity) && saved.capacity >= 20 && saved.capacity <= 500
      ? saved.capacity
      : 200
};

let exhibit = new Exhibit({ capacity: settings.capacity });
let simKg = 0,
  simTarget = 60,
  autoDemo = true,
  simStart = null,
  viewKey = '',
  lastState = 'idle',
  teacherOpen = false,
  serialStatus = 'Not connected',
  toastTimer;
let commandBusy = false,
  calibrationStage = 'empty',
  lastAck = null;

$('#app').innerHTML = `
  <div class="app-shell">
    <header class="topbar">
      <div class="brand" aria-label="GravityExplorer by ExpermindLabs">
        <img class="brand-logo" src="./logo.png" alt="ExpermindLabs" />
        <div class="brand-text">
          <span class="brand-title">Gravity<span class="brand-light">Explorer</span></span>
          <small class="brand-sub">BY EXPERMINDLABS</small>
        </div>
      </div>
      <div class="top-right">
        <span class="status-pill"><i></i><span id="mode-label">PRACTICE MODE</span></span>
        <button class="icon-btn" id="settings" title="Teacher controls · Ctrl+Shift+S" aria-label="Open teacher controls">${icons.settings}</button>
      </div>
    </header>
    <main class="stage" id="stage">
      <div id="planet-scene" role="img" aria-label="Photorealistic 3D Solar System"></div>
      <section id="content" class="content" aria-labelledby="main-title"></section>
    </main>
    <section class="planet-strip" aria-label="Solar System Destinations">
      <div class="planet-list">
        ${PLANETS.map(
          (p, i) => `
          <div class="planet-stop" data-planet="${i}" aria-label="${p.name}">
            <span class="mini-planet" style="--planet-color:${p.color};"></span>
            <span>${p.name.replace('The ', '')}</span>
          </div>`
        ).join('')}
      </div>
    </section>
    <footer>
      <span id="footer-hint">Press the illuminated button to begin.</span>
      <span class="footer-end">GRAVITYEXPLORER // EXPERMINDLABS EXHIBIT</span>
    </footer>
  </div>
  <div id="toast" class="toast" role="status"></div>
  <div id="announcement" class="sr-only" aria-live="polite"></div>

  <dialog id="teacher" aria-labelledby="teacher-title">
    <div class="dialog-head">
      <div>
        <span class="eyebrow">EXHIBIT SETUP</span>
        <h2 id="teacher-title">Teacher Controls</h2>
      </div>
      <button id="close-teacher" class="icon-btn" aria-label="Close teacher controls">×</button>
    </div>
    <p class="dialog-note">Settings persist on this PC. Visitor weights are never stored. Close setup to resume the exhibit.</p>
    <div class="controls-grid">
      <section class="control-card">
        <h3>01 · Scale Connection</h3>
        <label>Input source
          <select id="input-mode">
            <option value="demo">Practice Simulator (Simulated Mass)</option>
            <option value="hardware">Arduino + HX711 Load Cell Platform</option>
          </select>
        </label>
        <p class="readout" id="serial-status">Not connected</p>
        <div class="button-row">
          <button id="connect" class="small-button">Connect scale</button>
          <button id="disconnect" class="small-button secondary">Disconnect</button>
        </div>
        <p class="small">USB serial · 115200 baud · Uno R3 firmware. Next: D2 · Prev: D3 · HX711: D4/D5.</p>
      </section>

      <section class="control-card" id="demo-controls">
        <h3>02 · Practice Visitor</h3>
        <label>Simulated mass <output id="sim-value">60.0 kg</output>
          <input id="sim-mass" type="range" min="5" max="180" value="60" step="0.1">
        </label>
        <label class="checkbox">
          <input id="auto-demo" type="checkbox" checked> Automatically step on after Start
        </label>
        <div class="button-row">
          <button id="sim-on" class="small-button">Step on</button>
          <button id="sim-off" class="small-button secondary">Step off</button>
        </div>
        <p class="small">Practice mode runs entirely offline with fictional measurements.</p>
      </section>

      <section class="control-card">
        <h3>03 · Scale Calibration</h3>
        <p class="small">Ensure no one is standing on the platform before recording zero.</p>
        <label class="checkbox">
          <input id="empty-confirm" type="checkbox"> Platform is completely empty
        </label>
        <button id="tare" class="small-button">1. Record empty platform (TARE)</button>
        <label>Known reference mass (kg)
          <input id="reference-mass" type="number" min="1" max="100" step="0.1" value="10">
        </label>
        <button id="calibrate" class="small-button">2. Calibrate with reference mass (CAL)</button>
        <p class="readout" id="cal-status">No calibration performed in this session.</p>
        <label>Platform rated capacity (kg)
          <input id="capacity" type="number" min="20" max="500" step="1">
        </label>
      </section>

      <section class="control-card">
        <h3>04 · Station Display</h3>
        <label>Graphics Quality
          <select id="quality">
            <option value="high">Standard · Up to 1.5× resolution</option>
            <option value="low">Low · 1.0× native resolution</option>
          </select>
        </label>
        <label class="checkbox">
          <input id="reduced" type="checkbox"> Reduce motion
        </label>
        <div class="button-row">
          <button id="fullscreen" class="small-button">Toggle Fullscreen (F11)</button>
          <button id="reset" class="small-button secondary">End visitor session</button>
        </div>
      </section>
    </div>

    <details class="science-notes">
      <summary>NASA/JPL Physics & 10 Destinations Reference</summary>
      <p>Earth baseline is 9.80 m/s². The Moon is 1.62 m/s² (Apollo site). The Sun is 274.00 m/s² (visible surface). The eight planets: Mercury 3.70, Venus 8.87, Earth 9.80, Mars 3.71, Jupiter 24.79, Saturn 10.44, Uranus 8.87, Neptune 11.15 m/s². Weight is the force W = m × g in Newtons. The large kg figure is an Earth-scale equivalent: mass × destination gravity ÷ 9.80.</p>
    </details>
    <div class="dialog-bottom">
      <span id="live-diagnostic">Scale: —</span>
      <button class="small-button" id="done-teacher">Done</button>
    </div>
  </dialog>`;

function toast(message) {
  $('#toast').textContent = message;
  $('#toast').classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 4500);
}

const scene = new PlanetScene($('#planet-scene'), () => {
  $('#planet-scene').classList.add('fallback');
  $('#planet-scene').textContent = '';
  toast('3D graphics fallback active.');
  queueMicrotask(() => render(true));
});

function save() {
  try {
    localStorage.setItem('gravity-settings', JSON.stringify(settings));
  } catch {}
  scene.settings({ reduced: settings.reduced, quality: settings.quality, paused: teacherOpen });
  document.body.classList.toggle('reduced-motion', settings.reduced);
}

function say(text) {
  $('#announcement').textContent = text;
}

function action(direction = 'next') {
  if (teacherOpen) return;
  const before = exhibit.state;
  exhibit.press(performance.now(), direction);
  if (before === 'idle' && exhibit.state === 'weighing' && settings.mode === 'demo' && autoDemo) {
    simStart = performance.now() + 1800;
  }
  render();
}

function navigation(previous, next) {
  return `
    <nav class="station-controls" aria-label="Station controls">
      <button class="station-button station-previous" id="previous" ${previous ? '' : 'disabled'}>
        <span aria-hidden="true">←</span> Previous
      </button>
      <button class="station-button station-next" id="primary">
        ${next} <span aria-hidden="true">→</span>
      </button>
    </nav>`;
}

function resultCards() {
  const mass = exhibit.mass;
  const maxPlanetG = 24.79; // Jupiter reference

  return PLANETS.map((p, i) => {
    const w = formatKg(equivalent(mass, i));
    const mult = multiplier(i);
    const fVal = Math.round(force(mass, i)).toLocaleString();
    const gVal = p.g.toFixed(2);
    const meterPercent = Math.min(100, Math.max(10, Math.round((p.g / maxPlanetG) * 100)));
    const isSun = i === 2;
    const isEarth = i === 0;

    return `
      <div class="result-card ${isSun ? 'sun-card' : ''} ${isEarth ? 'earth-card' : ''}" style="--planet-color:${p.color}">
        <div class="card-top">
          <div class="card-planet-identity">
            <span class="card-globe" style="background: radial-gradient(circle at 35% 35%, ${p.color}, #08111d);" aria-hidden="true"></span>
            <div class="card-titles">
              <h3 class="card-planet-name">${p.name.replace('The ', '').toUpperCase()}</h3>
              <span class="card-planet-type">${p.type}</span>
            </div>
          </div>
          <span class="card-mult-badge">${mult}×</span>
        </div>

        <div class="card-weight-block">
          <strong class="card-weight">${w}<small>kg</small></strong>
        </div>

        <div class="card-telemetry-grid">
          <div class="card-telem-cell">
            <span class="card-telem-lbl">SURFACE GRAVITY</span>
            <span class="card-telem-val">${gVal} m/s²</span>
          </div>
          <div class="card-telem-cell">
            <span class="card-telem-lbl">FORCE</span>
            <span class="card-telem-val">${fVal} N</span>
          </div>
        </div>

        <div class="card-meter-track" title="Surface gravity: ${gVal} m/s²">
          <div class="card-meter-bar" style="width: ${meterPercent}%;"></div>
        </div>

        <div class="card-surface-note">
          <span>${p.surfaceNote}</span>
        </div>
      </div>`;
  }).join('');
}

function render(forceRender = false) {
  const { state, planet, mass } = exhibit;
  const key = `${state}:${planet}:${settings.mode}:${Boolean(exhibit.fault)}:${exhibit.mustClear}`;
  if (!forceRender && key === viewKey) return;
  viewKey = key;

  const isJourney = state === 'journey';
  const results = state === 'results';
  document.body.dataset.phase = state;

  $('#mode-label').textContent = settings.mode === 'demo' ? 'PRACTICE MODE' : 'LIVE EXHIBIT';
  $('.status-pill').classList.toggle('live', settings.mode === 'hardware');

  // In idle mode, 3D overview takes over the entire screen.
  // In journey mode, selected planet is shown.
  const selected = isJourney ? planet : 0;
  scene.select(selected);
  scene.setOverview(state === 'idle');

  $('#planet-scene').setAttribute(
    'aria-label',
    state === 'idle'
      ? 'Photorealistic 3D Solar System'
      : `Photorealistic 3D model of ${PLANETS[selected].name}`
  );
  $('#planet-scene').style.setProperty('--fallback-color', PLANETS[selected].color);
  $('#stage').style.setProperty('--world-accent', PLANETS[selected].color);

  for (const stop of document.querySelectorAll('.planet-stop')) {
    const i = Number(stop.dataset.planet);
    stop.classList.toggle('active', isJourney && i === planet);
    stop.classList.toggle('visited', isJourney && i < planet);
    stop.setAttribute('aria-current', isJourney && i === planet ? 'step' : 'false');
  }

  let html = '',
    announcement = '';

  if (state === 'idle') {
    // Ultra-clean, neat idle screen: 3D fills entire display, no unwanted text clutter
    html = `
      <h1 id="main-title" class="sr-only">Solar System</h1>
      <div class="idle-hud">
        <p class="idle-hint sr-only">Stand on the scale or press <strong>Start</strong></p>
        <div class="mission-launchpad" role="region" aria-label="Interactive Exhibit Start Controls">
          <div class="launchpad-radar-pulse" aria-hidden="true">
            <span class="sonar-ring ring-1"></span>
            <span class="sonar-ring ring-2"></span>
            <span class="sonar-ring ring-3"></span>
          </div>

          <div class="launchpad-content">
            <div class="launchpad-header">
              <span class="launchpad-tag"><span class="live-beacon-dot"></span> LIVE EXHIBIT STATION</span>
              <h2 class="launchpad-headline">DISCOVER YOUR SOLAR SYSTEM WEIGHT</h2>
            </div>

            <div class="launchpad-prompts">
              <!-- Action 1: Physical Weighing Scale -->
              <div class="prompt-card scale-prompt">
                <div class="prompt-icon-wrap" aria-hidden="true">
                  <svg class="prompt-svg" viewBox="0 0 48 48" fill="none">
                    <rect x="6" y="32" width="36" height="7" rx="3.5" fill="#72d6b3" fill-opacity="0.25" stroke="#72d6b3" stroke-width="2.2"/>
                    <circle cx="24" cy="18" r="9" fill="#0d1b2a" stroke="#72d6b3" stroke-width="2.2"/>
                    <path d="M24 13v5l3 2" stroke="#72d6b3" stroke-width="2" stroke-linecap="round"/>
                    <ellipse cx="14" cy="35.5" rx="3.5" ry="1.5" fill="#72d6b3"/>
                    <ellipse cx="34" cy="35.5" rx="3.5" ry="1.5" fill="#72d6b3"/>
                  </svg>
                  <span class="icon-pulse-glow"></span>
                </div>
                <div class="prompt-info">
                  <strong class="prompt-title">STEP ON THE SCALE</strong>
                  <span class="prompt-sub">Automatic sensor capture</span>
                </div>
                <span class="prompt-badge scale-badge">HANDS FREE</span>
              </div>

              <!-- Sleek Visual OR Divider -->
              <div class="prompt-divider" aria-hidden="true">
                <span class="divider-line"></span>
                <span class="divider-text">OR</span>
                <span class="divider-line"></span>
              </div>

              <!-- Action 2: Physical / UI Arcade Button -->
              <div class="prompt-card button-prompt">
                <div class="prompt-icon-wrap" aria-hidden="true">
                  <svg class="prompt-svg" viewBox="0 0 48 48" fill="none">
                    <rect x="8" y="12" width="32" height="24" rx="7" fill="#6daeff" fill-opacity="0.22" stroke="#6daeff" stroke-width="2.2"/>
                    <circle cx="24" cy="24" r="7" fill="#72d6b3" stroke="#ffffff" stroke-width="1.8"/>
                    <path d="M22 20.5l5 3.5-5 3.5v-7z" fill="#0a1929"/>
                  </svg>
                  <span class="icon-pulse-glow green-glow"></span>
                </div>
                <div class="prompt-info">
                  <strong class="prompt-title">PRESS START BUTTON</strong>
                  <span class="prompt-sub">Begin interactive planetary tour</span>
                </div>
                <span class="prompt-badge button-badge">PUSH D2</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      ${navigation(false, 'Start')}
      ${exhibit.fault && settings.mode === 'hardware' ? '<p class="warning">Scale unavailable · Ask a teacher</p>' : ''}`;
    announcement = 'Welcome to GravityExplorer. Stand on the scale or press the button to begin.';
  } else if (state === 'weighing') {
    const title = exhibit.mustClear ? 'Step Off Platform' : 'Stand On The Scale';
    html = `
      <div class="hud-panel weighing-hud">
        <div class="destination-badge"><span class="badge-dot" style="background:#6daeff"></span>01 // EARTH BASELINE</div>
        <h1 id="main-title">${title}</h1>
        <p class="intro-copy" id="weigh-instruction">
          ${exhibit.mustClear ? 'Please step off the platform for a moment.' : 'Keep still while measuring your Earth weight.'}
        </p>
        <div class="measurement-card">
          <div class="measurement-top">
            <span>EARTH MASS</span>
            <span id="reading-status">WAITING</span>
          </div>
          <div class="live-measurement">
            <span id="live-weight">—</span><small>kg</small>
            <span class="signal-bars" aria-hidden="true">▂▅▃▆▂</span>
          </div>
          <div class="stability-track"><i id="stability-progress"></i></div>
          <p id="stability-label">Waiting for an explorer…</p>
        </div>
      </div>`;
    announcement = exhibit.mustClear
      ? 'Please step off the platform so we can confirm it is empty.'
      : 'Stand on the platform and keep still. Your weight will be captured automatically.';
  } else if (isJourney) {
    const p = PLANETS[planet];
    const value = formatKg(equivalent(mass, planet));
    const [whole, decimal] = value.split('.');
    const gVal = p.g.toFixed(2);
    const fVal = Math.round(force(mass, planet)).toLocaleString();
    const mult = multiplier(planet);

    html = `
      <div class="hud-panel">
        <div class="destination-badge"><span class="badge-dot" style="background:${p.color}"></span>DESTINATION 0${planet + 1} // ${p.type.toUpperCase()}</div>
        <h1 class="planet-title" id="main-title">${p.name.toUpperCase()}</h1>
        
        <div class="weight-answer">
          <div class="weight-heading">YOUR WEIGHT</div>
          <div class="answer-number digits-${whole.length}" aria-label="${value} kilograms, Earth-scale equivalent">
            <span class="weight-integer">${whole}</span><span class="weight-decimal">.${decimal}</span><span class="weight-unit">kg</span>
          </div>
        </div>

        <div class="telemetry-bar">
          <div class="telemetry-item">
            <span class="telemetry-label">EARTH BASELINE</span>
            <strong>${formatKg(mass)} kg</strong> <small>(${mult}×)</small>
          </div>
          <div class="telemetry-item">
            <span class="telemetry-label">SURFACE GRAVITY</span>
            <strong>${gVal} m/s²</strong>
          </div>
          <div class="telemetry-item">
            <span class="telemetry-label">FORCE</span>
            <strong>${fVal} N</strong>
          </div>
        </div>

        <p class="capture-note">${p.surfaceNote}</p>
      </div>
      ${navigation(planet > 0, planet === 9 ? 'All weights' : 'Next')}`;

    announcement = `${p.name}. Your Earth-scale equivalent weight is ${value} kilograms.`;
  } else if (results) {
    html = `
      <div class="hud-panel results-hud">
        <div class="results-header-bar">
          <div class="results-title-group">
            <div class="destination-badge"><span class="badge-dot" style="background:#72d6b3"></span>MISSION COMPLETE // DEBRIEFING</div>
            <h1 id="main-title" class="results-title">Solar System Weights</h1>
          </div>
          <div class="results-baseline-chip">
            <span class="baseline-chip-label">EARTH BASELINE</span>
            <span class="baseline-chip-mass">${formatKg(mass)} kg</span>
            <span class="baseline-chip-sub">Mass stays identical everywhere · Local gravity dictates weight</span>
          </div>
        </div>
        <div class="results-grid">${resultCards()}</div>
      </div>
      ${navigation(true, 'Finish')}`;
    announcement = 'Mission complete. Review your weights across the solar system.';
  } else {
    html = `
      <div class="hud-panel">
        <div class="destination-badge">READY FOR NEXT EXPLORER</div>
        <h1 id="main-title">Keep Looking Up.</h1>
        <p class="intro-copy">Please step off the platform.<br>The next explorer’s journey starts here.</p>
      </div>`;
    announcement = 'Thank you for exploring. Please step off the platform for the next explorer.';
  }

  $('#content').innerHTML = html;
  $('#primary')?.addEventListener('click', () => action('next'));
  $('#previous')?.addEventListener('click', () => action('previous'));
  $('#footer-hint').textContent =
    settings.mode === 'demo'
      ? 'Practice mode · simulated measurements'
      : isJourney
      ? 'Press Next for the next celestial destination.'
      : 'One explorer at a time.';

  if (lastState !== state || isJourney) {
    say(announcement);
    lastState = state;
  }
  updateLive();
}

function updateLive() {
  if (exhibit.state === 'weighing') {
    const unavailable = Boolean(exhibit.fault);
    $('#live-weight').textContent =
      unavailable || exhibit.reading === null ? '—' : formatKg(exhibit.reading);
    $('#stability-progress').style.width = `${exhibit.progress * 100}%`;
    $('#reading-status').textContent = unavailable
      ? 'OFFLINE'
      : exhibit.progress > 0
      ? 'STABILIZING'
      : 'WAITING';
    $('#stability-label').textContent = unavailable
      ? exhibit.fault
      : exhibit.mustClear
      ? 'Please clear the platform first.'
      : exhibit.reading < DEFAULTS.occupiedKg
      ? 'Waiting for an explorer…'
      : exhibit.progress > 0.05
      ? 'Keep still. Finding a steady reading…'
      : 'Keep still and relax your arms.';
  }
  if (teacherOpen) {
    $('#live-diagnostic').textContent = `Scale: ${
      exhibit.reading === null ? '—' : formatKg(exhibit.reading) + ' kg'
    } · ${exhibit.empty ? 'empty' : 'occupied'} · ${exhibit.fault || exhibit.state}`;
  }
}

const connection = new ScaleConnection(
  message => {
    if (settings.mode !== 'hardware') return;
    const now = performance.now();
    if (message.type === 'measurement') exhibit.sample(message.kg, now, message.valid);
    if (message.type === 'button') action(message.action || 'next');
    if (message.type === 'hello') {
      serialStatus = message.calibrated
        ? 'Arduino ready · calibrated'
        : 'Arduino connected · calibration required';
      if (!message.calibrated)
        exhibit.invalidate('Scale needs calibration. Please ask a teacher.');
      $('#serial-status').textContent = serialStatus;
    }
    if (['fault', 'restart', 'disconnected'].includes(message.type)) {
      exhibit.invalidate(
        message.type === 'restart'
          ? 'Arduino restarted. Please clear the platform.'
          : 'Scale unavailable. Please ask a teacher.'
      );
    }
    render();
  },
  status => {
    serialStatus = status;
    $('#serial-status').textContent = status;
  }
);

function openTeacher() {
  if (exhibit.state === 'weighing') {
    exhibit.finish(performance.now());
    simStart = null;
  }
  teacherOpen = true;
  $('#teacher').showModal();
  save();
}

function closeTeacher() {
  teacherOpen = false;
  $('#teacher').close();
  save();
}

$('#settings').addEventListener('click', openTeacher);
$('#close-teacher').addEventListener('click', closeTeacher);
$('#done-teacher').addEventListener('click', closeTeacher);
$('#teacher').addEventListener('cancel', () => {
  teacherOpen = false;
  save();
});

document.addEventListener('keydown', event => {
  if (event.ctrlKey && event.shiftKey && event.code === 'KeyS') {
    event.preventDefault();
    teacherOpen ? closeTeacher() : openTeacher();
    return;
  }
  if (
    teacherOpen ||
    event.repeat ||
    ['INPUT', 'SELECT', 'BUTTON', 'TEXTAREA', 'A', 'SUMMARY'].includes(event.target.tagName)
  )
    return;
  if (['Space', 'Enter', 'ArrowRight', 'ArrowLeft'].includes(event.code)) {
    event.preventDefault();
    action(event.code === 'ArrowLeft' ? 'previous' : 'next');
  }
});

function syncSettings() {
  $('#input-mode').value = settings.mode;
  $('#quality').value = settings.quality;
  $('#capacity').value = settings.capacity;
  $('#reduced').checked = settings.reduced;
  $('#demo-controls').classList.toggle('disabled-card', settings.mode !== 'demo');
  for (const id of [
    'connect',
    'disconnect',
    'tare',
    'calibrate',
    'empty-confirm',
    'reference-mass'
  ]) {
    $('#' + id).disabled = settings.mode !== 'hardware';
  }
  save();
}

$('#input-mode').addEventListener('change', async event => {
  await connection.disconnect();
  settings.mode = event.target.value;
  exhibit = new Exhibit({ capacity: settings.capacity });
  simKg = 0;
  simStart = null;
  calibrationStage = 'empty';
  syncSettings();
  render(true);
  if (settings.mode === 'hardware') exhibit.invalidate('Connect the scale in teacher controls.');
});

$('#connect').addEventListener('click', () => {
  void connection.connect(true).catch(error => {
    serialStatus = error.message;
    $('#serial-status').textContent = serialStatus;
    toast(serialStatus);
  });
});

$('#disconnect').addEventListener('click', async () => {
  await connection.disconnect();
  exhibit.invalidate('Scale disconnected by teacher.');
  $('#serial-status').textContent = 'Disconnected';
});

$('#sim-mass').addEventListener('input', event => {
  simTarget = Number(event.target.value);
  $('#sim-value').textContent = formatKg(simTarget) + ' kg';
  if (simKg > 0) simKg = simTarget;
});

$('#auto-demo').addEventListener('change', event => (autoDemo = event.target.checked));
$('#sim-on').addEventListener('click', () => {
  simKg = simTarget;
  simStart = null;
});
$('#sim-off').addEventListener('click', () => {
  simKg = 0;
  simStart = null;
});
$('#quality').addEventListener('change', event => {
  settings.quality = event.target.value;
  syncSettings();
});
$('#reduced').addEventListener('change', event => {
  settings.reduced = event.target.checked;
  syncSettings();
});
$('#capacity').addEventListener('change', event => {
  const value = Number(event.target.value);
  if (!Number.isFinite(value) || value < 20 || value > 500) {
    event.target.value = settings.capacity;
    toast('Enter a rated capacity between 20 and 500 kg.');
    return;
  }
  settings.capacity = value;
  exhibit.config.capacity = value;
  syncSettings();
});

$('#fullscreen').addEventListener('click', async () => {
  try {
    if (window.gravityDesktop) await window.gravityDesktop.fullscreen();
    else if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch (error) {
    toast(error.message);
  }
});

$('#reset').addEventListener('click', () => {
  exhibit.finish(performance.now());
  simKg = 0;
  simStart = null;
  render(true);
  toast('Visitor measurement cleared.');
});

async function calibrate(name) {
  if (commandBusy) return;
  if (!['idle', 'clearing'].includes(exhibit.state)) {
    toast('End the visitor session before calibrating.');
    return;
  }
  if (name === 'TARE' && !$('#empty-confirm').checked) {
    toast('Check the platform is physically empty, then tick the confirmation.');
    return;
  }
  const known = Number($('#reference-mass').value);
  if (
    name === 'CAL' &&
    (calibrationStage !== 'loaded' ||
      !Number.isFinite(known) ||
      known < 1 ||
      known > Math.min(100, settings.capacity))
  ) {
    toast(
      'First record the empty platform, then use a known reference mass from 1 to 100 kg within capacity.'
    );
    return;
  }
  commandBusy = true;
  $('#cal-status').textContent = 'Waiting for Arduino acknowledgement…';
  try {
    lastAck = await connection.command(name, name === 'CAL' ? known : '');
    calibrationStage = name === 'TARE' ? 'loaded' : 'empty';
    $('#cal-status').textContent =
      name === 'TARE'
        ? 'Empty reading recorded. Add the reference mass, let it settle, then calibrate.'
        : 'Calibration saved on Arduino. Remove reference mass and verify with known loads.';
    if (name === 'TARE') $('#empty-confirm').checked = false;
    if (name === 'CAL') exhibit.invalidate('Remove the reference mass and verify the empty platform.');
  } catch (error) {
    $('#cal-status').textContent = error.message;
    toast(error.message);
  } finally {
    commandBusy = false;
  }
}

$('#tare').addEventListener('click', () => void calibrate('TARE'));
$('#calibrate').addEventListener('click', () => void calibrate('CAL'));

let previous = performance.now();
setInterval(() => {
  const now = performance.now();
  if (teacherOpen) exhibit.phaseAt += now - previous;
  previous = now;
  if (settings.mode === 'demo') {
    if (!teacherOpen && simStart !== null && now >= simStart) {
      simKg = simTarget;
      simStart = null;
    }
    exhibit.sample(simKg > 0 ? simKg + Math.sin(now * 0.003) * 0.025 : 0, now);
  }
  exhibit.tick(now);
  if (settings.mode === 'demo' && exhibit.state === 'clearing') {
    simKg = 0;
    simStart = null;
  }
  render();
  updateLive();
}, 100);

syncSettings();
render(true);

if (settings.mode === 'hardware') {
  void connection.connect(false).catch(error => {
    serialStatus = error.message;
    $('#serial-status').textContent = serialStatus;
  });
}
