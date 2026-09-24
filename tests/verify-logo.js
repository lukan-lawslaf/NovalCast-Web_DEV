const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  // Test #/home
  console.log('Navigating to http://localhost:3000/#/home ...');
  await page.goto('http://localhost:3000/#/home', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  const homeData = await page.evaluate(() => {
    const sidebarLogo = document.querySelector('#app-sidebar a[title="NovelCast"] img');
    const headerTitle = document.querySelector('#app-header');
    const headerLogo = document.querySelector('#app-header img');
    return {
      hasSidebarLogo: !!sidebarLogo,
      sidebarLogoSrc: sidebarLogo ? sidebarLogo.getAttribute('src') : null,
      headerText: headerTitle ? headerTitle.innerText.trim() : null,
      headerLogoSrc: headerLogo ? headerLogo.getAttribute('src') : null
    };
  });
  console.log('Home verification data:', homeData);
  await page.screenshot({ path: 'Referance/home_luxury_logo_verified.png' });
  console.log('Captured Referance/home_luxury_logo_verified.png');

  // Test #/landing
  console.log('Navigating to http://localhost:3000/#/landing ...');
  await page.goto('http://localhost:3000/#/landing', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'Referance/landing_luxury_logo_verified.png' });
  console.log('Captured Referance/landing_luxury_logo_verified.png');

  await browser.close();
})();
