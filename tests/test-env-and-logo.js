const { chromium } = require('playwright');
const path = require('path');

(async () => {
  console.log('Testing dynamic env injection & official logo in login page...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') console.log('[BROWSER ERROR]', msg.text());
  });

  // 1. Navigate to login
  await page.goto('http://localhost:3000/#/home', { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    localStorage.removeItem('novelcast.auth.user.v1');
    location.hash = '#/login';
  });
  await page.waitForTimeout(1500);

  // 2. Check window.__ENV__ is present and loaded from env.js
  const envData = await page.evaluate(() => window.__ENV__);
  console.log('Detected window.__ENV__ in browser:', {
    hasUrl: Boolean(envData && envData.SUPABASE_URL),
    hasKey: Boolean(envData && envData.SUPABASE_ANON_KEY)
  });

  if (envData && envData.SUPABASE_URL && envData.SUPABASE_ANON_KEY) {
    console.log('PASS: window.__ENV__ loaded dynamically from environment.');
  } else {
    console.error('FAIL: window.__ENV__ not found or empty.');
  }

  // 3. Verify Logo in Header and Logo in Card
  const headerLogo = await page.$eval('header img[src="logo.svg"]', el => ({
    src: el.src,
    naturalWidth: el.naturalWidth,
    complete: el.complete
  }));
  console.log('Header Logo Status:', headerLogo);

  const cardLogo = await page.$eval('main header img[src="logo.svg"]', el => ({
    src: el.src,
    naturalWidth: el.naturalWidth,
    complete: el.complete
  }));
  console.log('Card Central Logo Status:', cardLogo);

  if (headerLogo.complete && headerLogo.naturalWidth > 0 && cardLogo.complete && cardLogo.naturalWidth > 0) {
    console.log('PASS: Official NovelCast logo.svg successfully rendered in header and card!');
  } else {
    console.error('FAIL: Logo image failed to render properly.');
  }

  // 4. Verify no circular 'N' placeholder is remaining in header or card
  const nSpans = await page.$$eval('span.font-editorial-serif', spans => spans.map(s => s.textContent.trim()));
  console.log('Editorial serif spans:', nSpans);
  const hasIsolatedN = nSpans.some(text => text === 'N');
  if (!hasIsolatedN) {
    console.log('PASS: Circular "N" placeholder completely replaced with official logo.');
  } else {
    console.error('FAIL: Isolated "N" still found in DOM.');
  }

  // 5. Screenshot of updated login view with logo
  const screenshotPath = path.join(__dirname, '../archive/login_with_official_logo.png');
  await page.screenshot({ path: screenshotPath });
  console.log('Saved screenshot to:', screenshotPath);

  await browser.close();
  console.log('Environment and Logo verification completed successfully!');
})();
