// Integration test: production files in an isolated, sandboxed Electron renderer.
const { app, BrowserWindow } = require('electron');
const path = require('node:path');

app.setPath('userData', path.join(app.getPath('temp'), 'gravity-explorer-smoke-v15'));
let window, timer;

app.whenReady().then(async () => {
  timer = setTimeout(() => {
    console.error('Desktop smoke test timed out');
    app.exit(1);
  }, 35000);

  window = new BrowserWindow({
    show: false,
    width: 1366,
    height: 768,
    useContentSize: true,
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const errors = [];
  const network = [];
  window.webContents.session.webRequest.onBeforeRequest(
    { urls: ['http://*/*', 'https://*/*'] },
    (details, callback) => {
      network.push(details.url);
      callback({ cancel: true });
    }
  );

  window.webContents.on('console-message', (_event, details) => {
    if (details.level === 'error') errors.push(details.message);
  });
  window.webContents.on('render-process-gone', () => app.exit(1));

  try {
    await window.loadFile(
      process.argv[2] ? path.resolve(process.argv[2]) : path.join(__dirname, '../dist/index.html')
    );

    const result = await window.webContents.executeJavaScript(`
      new Promise(resolve => setTimeout(() => resolve({
        title: document.title,
        heading: document.querySelector('h1')?.textContent,
        view: document.querySelector('#planet-scene')?.dataset.view,
        worlds: document.querySelectorAll('.system-label:not(.sun-label)').length,
        canvas: !!document.querySelector('canvas'),
        surface: document.querySelector('#planet-scene')?.dataset.surface,
        voiceControls: !!document.querySelector('#sound,#narration'),
        profiles: !!document.querySelector('#planet-readouts'),
        fallback: document.querySelector('#planet-scene')?.classList.contains('fallback'),
        nodeAccess: typeof require,
        overflow: document.documentElement.scrollHeight - innerHeight
      }), 3500))
    `);

    if (
      !result.heading?.toLowerCase().includes('solar') ||
      result.view !== 'system' ||
      (!result.fallback && result.worlds !== 8) ||
      (!result.canvas && !result.fallback) ||
      result.nodeAccess !== 'undefined' ||
      (!result.fallback && result.surface !== 'mapped') ||
      result.voiceControls ||
      result.profiles ||
      result.overflow > 1
    ) {
      throw new Error(JSON.stringify({ result, errors }));
    }

    // Launch visit: Start button -> Earth weighing
    const launch = await window.webContents.executeJavaScript(`
      document.querySelector('#primary').click();
      ({ view: document.querySelector('#planet-scene').dataset.view, planet: document.querySelector('#planet-scene').getAttribute('aria-label') })
    `);
    if (launch.view !== 'planet' || !launch.planet.includes('Earth')) {
      throw new Error(JSON.stringify(launch));
    }

    // Weighing completes automatically -> Destination 01: Earth
    const journey = await window.webContents.executeJavaScript(`
      new Promise((resolve, reject) => {
        const began = performance.now();
        const poll = setInterval(() => {
          const weight = document.querySelector('.answer-number');
          if (weight) {
            clearInterval(poll);
            resolve({
              weight: weight.getAttribute('aria-label'),
              fontSize: parseFloat(getComputedStyle(weight).fontSize),
              heading: document.querySelector('h1').textContent,
              labelsHidden: document.querySelector('.system-labels')?.hidden
            });
          } else if (performance.now() - began > 9000) {
            clearInterval(poll);
            reject(new Error('Weight reveal did not start'));
          }
        }, 100);
      })
    `);

    if (
      !journey.weight.startsWith('60.0 kilograms') ||
      !journey.heading.toUpperCase().includes('EARTH') ||
      journey.fontSize < 100 ||
      (!result.fallback && !journey.labelsHidden) ||
      errors.length ||
      network.length
    ) {
      throw new Error(JSON.stringify({ journey, errors, network }));
    }

    // Manual navigation: Next advances to The Moon (Destination 02)
    const manual = await window.webContents.executeJavaScript(`
      new Promise(resolve => setTimeout(() => {
        const before = document.querySelector('h1').textContent;
        document.querySelector('#primary').click();
        resolve({
          before,
          after: document.querySelector('h1').textContent,
          previousDisabled: document.querySelector('#previous').disabled
        });
      }, 500))
    `);

    if (
      !manual.before.toUpperCase().includes('EARTH') ||
      !manual.after.toUpperCase().includes('MOON') ||
      manual.previousDisabled
    ) {
      throw new Error(JSON.stringify(manual));
    }

    await new Promise(resolve => setTimeout(resolve, 500));

    // Previous navigation: Returns back to Earth
    const back = await window.webContents.executeJavaScript(`
      document.querySelector('#previous').click();
      ({ planet: document.querySelector('h1').textContent, disabled: document.querySelector('#previous').disabled });
    `);

    if (!back.planet.toUpperCase().includes('EARTH') || !back.disabled) {
      throw new Error(JSON.stringify(back));
    }

    console.log(
      'Desktop smoke passed:',
      JSON.stringify({
        idle: result,
        launch,
        journey,
        manual,
        back,
        externalRequests: network.length
      })
    );
    clearTimeout(timer);
    app.exit(0);
  } catch (error) {
    console.error(error);
    clearTimeout(timer);
    app.exit(1);
  }
});
