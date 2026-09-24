const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const out = process.argv[2] || path.resolve(__dirname, '../archive/outputs/current');
const base = process.argv[3] || 'http://127.0.0.1:3000';
const pages = ['index.html', 'home.html', 'search.html', 'book-details.html', 'library.html', 'read-book.html', 'read-scroll.html'];

(async () => {
  fs.mkdirSync(out, { recursive: true });
  console.log(`Taking snapshots to: ${out} against base URL: ${base}`);

  let browser;
  try {
    browser = await chromium.launch();
  } catch (err) {
    // Fallback to system chrome on Windows if bundled Chromium is absent
    const chromePath = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
    if (fs.existsSync(chromePath)) {
      browser = await chromium.launch({ executablePath: chromePath });
    } else {
      throw err;
    }
  }

  const page = await browser.newPage({ viewport: { width: 1440, height: 950 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

  for (const p of pages) {
    try {
      await page.goto(base + '/' + p, { waitUntil: 'load', timeout: 15000 });
      await page.waitForTimeout(2000);
      await page.screenshot({ path: path.join(out, p + '.png'), fullPage: true });
      console.log(`Saved screenshot: ${p}.png`);
    } catch (e) {
      console.error(`Failed capturing ${p}:`, e.message);
    }
  }

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  for (const p of ['home.html', 'read-scroll.html']) {
    try {
      await mobile.goto(base + '/' + p, { waitUntil: 'load', timeout: 15000 });
      await mobile.waitForTimeout(2000);
      await mobile.screenshot({ path: path.join(out, 'mobile-' + p + '.png'), fullPage: true });
      console.log(`Saved mobile screenshot: mobile-${p}.png`);
    } catch (e) {
      console.error(`Failed capturing mobile ${p}:`, e.message);
    }
  }

  console.log('Result errors:', JSON.stringify({ errors }, null, 1));
  await browser.close();
})();
