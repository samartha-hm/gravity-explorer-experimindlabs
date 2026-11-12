const { app, BrowserWindow } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

app.setPath('userData', path.join(app.getPath('temp'), 'gravity-explorer-screenshots'));

app.whenReady().then(async () => {
  const window = new BrowserWindow({
    show: false,
    width: 1920,
    height: 1080,
    useContentSize: true,
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const outDir = path.join(__dirname, '../screenshots');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  try {
    await window.loadFile(path.join(__dirname, '../dist/index.html'));
    await new Promise(r => setTimeout(r, 2000));

    // Capture idle
    let img = await window.webContents.capturePage();
    fs.writeFileSync(path.join(outDir, '00_idle.png'), img.toPNG());

    // Launch visit -> Earth
    await window.webContents.executeJavaScript(`document.querySelector('#primary').click()`);

    // Wait for Earth weighing capture
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

    await new Promise(r => setTimeout(r, 600));
    img = await window.webContents.capturePage();
    fs.writeFileSync(path.join(outDir, '01_earth.png'), img.toPNG());

    // Cycle through all destinations and capture Moon, Sun, Jupiter, Saturn
    const targets = ['moon', 'sun', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
    for (const name of targets) {
      await window.webContents.executeJavaScript(`document.querySelector('#primary').click()`);
      await new Promise(r => setTimeout(r, 700));
      const pageImg = await window.webContents.capturePage();
      fs.writeFileSync(path.join(outDir, `dest_${name}.png`), pageImg.toPNG());
      console.log(`Captured ${name}`);
    }

    console.log('Screenshots captured successfully in', outDir);
    app.exit(0);
  } catch (err) {
    console.error(err);
    app.exit(1);
  }
});

