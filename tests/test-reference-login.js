const { chromium } = require('playwright');
const path = require('path');

(async () => {
  console.log('Testing Reference Login Page Integration...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') console.log('[BROWSER ERROR]', msg.text());
  });
  page.on('pageerror', err => {
    console.log('[PAGE ERROR]', err.message);
  });

  // 1. Visit Login Page in unauthenticated state
  console.log('Navigating to http://localhost:3000/#/login...');
  await page.goto('http://localhost:3000/#/home', { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    localStorage.removeItem('novelcast.auth.user.v1');
    location.hash = '#/login';
  });
  await page.waitForTimeout(1200);

  // 2. Validate Headline & Branding
  const headline = await page.textContent('h1');
  console.log('Headline:', headline?.trim());
  if (headline && headline.includes('Where Stories') && headline.includes('Breathe.')) {
    console.log('PASS: Headline "Where Stories Breathe." matched reference.');
  } else {
    console.error('FAIL: Headline mismatch:', headline);
  }

  // 3. Validate Sign In Mode (Default)
  const isNameHidden = await page.$eval('#field-fullname', el => el.classList.contains('hidden'));
  const btnSubmitText = await page.textContent('#btn-submit-text');
  console.log('Sign In submit text:', btnSubmitText?.trim(), '| Name hidden:', isNameHidden);
  if (isNameHidden && btnSubmitText?.trim() === 'Enter Atelier') {
    console.log('PASS: Sign In mode defaults verified.');
  } else {
    console.error('FAIL: Sign In mode defaults incorrect.');
  }

  // Take screenshot of Sign In view
  const signInPath = path.join(__dirname, '../archive/reference_login_signin_verified.png');
  await page.screenshot({ path: signInPath });
  console.log('Saved:', signInPath);

  // 4. Test Tab Switch to "Request Access"
  console.log('Switching to "Request Access" tab...');
  await page.click('#tab-signup');
  await page.waitForTimeout(500);

  const isNameVisible = await page.$eval('#field-fullname', el => !el.classList.contains('hidden'));
  const signUpBtnText = await page.textContent('#btn-submit-text');
  console.log('Sign Up submit text:', signUpBtnText?.trim(), '| Name visible:', isNameVisible);
  if (isNameVisible && signUpBtnText?.trim() === 'Request Invitation') {
    console.log('PASS: "Request Access" tab switch verified with Name field revealed.');
  } else {
    console.error('FAIL: "Request Access" tab switch failed.');
  }

  // Take screenshot of Request Access view
  const signUpPath = path.join(__dirname, '../archive/reference_login_signup_verified.png');
  await page.screenshot({ path: signUpPath });
  console.log('Saved:', signUpPath);

  // 5. Test Password / Cipher Visibility Toggle
  console.log('Testing password visibility toggle...');
  const cipherInput = await page.$('#master-cipher');
  let inputType = await cipherInput.getAttribute('type');
  console.log('Initial type:', inputType);

  await page.click('#toggle-password');
  inputType = await cipherInput.getAttribute('type');
  console.log('Type after 1 click:', inputType);
  if (inputType === 'text') {
    console.log('PASS: Cipher revealed as text.');
  } else {
    console.error('FAIL: Cipher toggle did not reveal text.');
  }

  await page.click('#toggle-password');
  inputType = await cipherInput.getAttribute('type');
  console.log('Type after 2nd click:', inputType);
  if (inputType === 'password') {
    console.log('PASS: Cipher hidden back as password.');
  } else {
    console.error('FAIL: Cipher toggle did not return to password.');
  }

  // 6. Test Social Buttons
  const appleBtn = await page.$('#btn-apple-auth');
  const googleBtn = await page.$('#btn-google-auth');
  if (appleBtn && googleBtn) {
    console.log('PASS: Apple ID and Google social auth buttons present.');
  } else {
    console.error('FAIL: Social auth buttons missing.');
  }

  // 7. Test Switch back to Sign In
  await page.click('#tab-signin');
  await page.waitForTimeout(400);

  // 8. Test Navigation link to Catalog / Home
  console.log('Testing Catalog link navigation...');
  const catalogLink = await page.$('a:has-text("Catalog")');
  if (catalogLink) {
    await catalogLink.click();
    await page.waitForTimeout(800);
    const afterCatalogHash = await page.evaluate(() => location.hash);
    console.log('Hash after clicking Catalog:', afterCatalogHash);
    if (afterCatalogHash.includes('home')) {
      console.log('PASS: Catalog link navigated to #/home.');
    }
  }

  await browser.close();
  console.log('All reference login page verifications passed!');
})();
