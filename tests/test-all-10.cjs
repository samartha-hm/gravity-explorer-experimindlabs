// End-to-end integration test: Verifies all 10 destinations & the results matrix in Electron
const { app, BrowserWindow } = require('electron');
const path = require('node:path');

app.setPath('userData', path.join(app.getPath('temp'), 'gravity-explorer-full-run'));

app.whenReady().then(async () => {
  const timer = setTimeout(() => {
    console.error('Full 10-world journey test timed out');
    app.exit(1);
  }, 45000);

  const window = new BrowserWindow({
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
  window.webContents.on('console-message', (_event, details) => {
    if (details.level === 'error') errors.push(details.message);
  });

  try {
    await window.loadFile(path.join(__dirname, '../dist/index.html'));
    await new Promise(r => setTimeout(r, 2000));

    // 1. Launch visit
    await window.webContents.executeJavaScript(`document.querySelector('#primary').click()`);

    // 2. Wait for weighing capture (Earth)
    await window.webContents.executeJavaScript(`
      new Promise((resolve, reject) => {
        const start = performance.now();
        const check = setInterval(() => {
          const weight = document.querySelector('.answer-number');
          if (weight) {
            clearInterval(check);
            resolve();
          } else if (performance.now() - start > 12000) {
            clearInterval(check);
            reject(new Error('Weighing did not complete'));
          }
        }, 100);
      })
    `);

    // 3. Cycle through remaining 9 destinations
    // Order: Moon (1), Sun (2), Mercury (3), Venus (4), Mars (5), Jupiter (6), Saturn (7), Uranus (8), Neptune (9)
    const expected = [
      'MOON',
      'SUN',
      'MERCURY',
      'VENUS',
      'MARS',
      'JUPITER',
      'SATURN',
      'URANUS',
      'NEPTUNE'
    ];

    const visited = [];
    for (const exp of expected) {
      await window.webContents.executeJavaScript(`document.querySelector('#primary').click()`);
      await new Promise(r => setTimeout(r, 550));
      const title = await window.webContents.executeJavaScript(`document.querySelector('h1')?.textContent`);
      const weight = await window.webContents.executeJavaScript(`document.querySelector('.answer-number')?.textContent.trim()`);
      visited.push({ title, weight });
      if (!title?.toUpperCase().includes(exp)) {
        throw new Error(`Expected destination ${exp}, got ${title}`);
      }
    }

    // 4. Click Next from Neptune to enter Results (Final Comparison)
    await window.webContents.executeJavaScript(`document.querySelector('#primary').click()`);
    await new Promise(r => setTimeout(r, 300));

    const results = await window.webContents.executeJavaScript(`
      ({
        heading: document.querySelector('h1')?.textContent,
        cards: document.querySelectorAll('.result-card').length,
        weights: Array.from(document.querySelectorAll('.result-card strong')).map(s => s.textContent.trim())
      })
    `);

    if (results.cards !== 10) {
      throw new Error(`Expected 10 result cards, found ${results.cards}`);
    }

    console.log('All 10 destinations verified successfully:', { visited, results, errors: errors.length });
    clearTimeout(timer);
    app.exit(0);
  } catch (err) {
    console.error(err);
    clearTimeout(timer);
    app.exit(1);
  }
});
