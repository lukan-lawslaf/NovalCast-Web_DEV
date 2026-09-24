const fs = require('fs');
const { chromium } = require('playwright');

(async () => {
  const logoPath = fs.existsSync('frontend/logo.svg') ? 'frontend/logo.svg' : 'logo.svg';
  const originalSvg = fs.readFileSync(logoPath, 'utf8');

  // Variation 1: Headphones & book cover white, pages translucent/cutout
  // Variation 2: All fills pure #ffffff
  // Variation 3: Headphones white (#fff), book spine white (#fff), pages subtle slate-200 (#e2e8f0)
  
  const v1 = originalSvg
    .replace('fill="#1d1d1e"', 'fill="#FFFFFF"')
    .replace('fill="#0a315e"', 'fill="#FFFFFF"')
    .replace('fill="#fdfdfd"', 'fill="#A0AEC0"');

  const v2 = originalSvg
    .replace('fill="#1d1d1e"', 'fill="#FFFFFF"')
    .replace('fill="#0a315e"', 'fill="#FFFFFF"')
    .replace('fill="#fdfdfd"', 'fill="#FFFFFF"');

  const v3 = originalSvg
    .replace('fill="#1d1d1e"', 'fill="#FFFFFF"')
    .replace('fill="#0a315e"', 'fill="#E2E8F0"')
    .replace('fill="#fdfdfd"', 'fill="#FFFFFF"');

  fs.writeFileSync('Referance/logo-v1.svg', v1);
  fs.writeFileSync('Referance/logo-v2.svg', v2);
  fs.writeFileSync('Referance/logo-v3.svg', v3);

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { background: #080A0E; color: white; display: flex; flex-direction: column; gap: 30px; padding: 40px; font-family: sans-serif; }
        .row { display: flex; align-items: center; gap: 20px; }
        .brand { display: flex; align-items: center; gap: 10px; font-family: serif; font-size: 22px; font-weight: 600; }
      </style>
    </head>
    <body>
      <div class="row">
        <h3>V1 (White headphones & cover, silver pages):</h3>
        <div class="brand">
          <img src="logo-v1.svg" width="32" height="28" />
          <span>NovelCast</span>
        </div>
      </div>
      <div class="row">
        <h3>V2 (All pure white #ffffff):</h3>
        <div class="brand">
          <img src="logo-v2.svg" width="32" height="28" />
          <span>NovelCast</span>
        </div>
      </div>
      <div class="row">
        <h3>V3 (White headphones, subtle slate book, white pages):</h3>
        <div class="brand">
          <img src="logo-v3.svg" width="32" height="28" />
          <span>NovelCast</span>
        </div>
      </div>
    </body>
    </html>
  `;
  fs.writeFileSync('Referance/compare-white-logos.html', html);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
  const path = require('path');
  await page.goto('file:///' + path.resolve('Referance/compare-white-logos.html').replace(/\\\\/g, '/'));
  await page.screenshot({ path: 'Referance/compare-white-logos.png' });
  await browser.close();
  console.log('Rendered Referance/compare-white-logos.png');
})();
