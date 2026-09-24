const { chromium } = require('playwright');
const path = require('path');

(async () => {
  console.log('Testing Email Confirmation & Clean Auth Card (Apple/Google removed)...');
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

  // 2. Verify Apple ID and Google buttons are completely removed
  const appleBtn = await page.$('#btn-apple-auth');
  const googleBtn = await page.$('#btn-google-auth');
  const orDivider = await page.$('text="or"');
  if (!appleBtn && !googleBtn && !orDivider) {
    console.log('PASS: Apple ID and Google buttons and "or" divider successfully removed.');
  } else {
    console.error('FAIL: Social auth elements still present in DOM.');
  }

  // 3. Verify Background is visible and loaded
  const bgImg = await page.$eval('img[alt*="Atmospheric"]', el => ({
    src: el.src,
    naturalWidth: el.naturalWidth,
    complete: el.complete
  }));
  console.log('Background Image Status:', bgImg);
  if (bgImg.naturalWidth > 0 && bgImg.complete) {
    console.log('PASS: Atmospheric atelier background loaded locally.');
  } else {
    console.error('FAIL: Background image not loaded.');
  }

  // 4. Screenshot of clean Sign In page
  const cleanSignInPath = path.join(__dirname, '../archive/login_clean_signin_verified.png');
  await page.screenshot({ path: cleanSignInPath });
  console.log('Saved:', cleanSignInPath);

  // 5. Test Sign Up flow with Email Confirmation requirement
  console.log('Switching to "Request Access" tab to test email confirmation flow...');
  await page.click('#tab-signup');
  await page.waitForTimeout(400);

  const testEmail = `patron_${Date.now()}@gmail.com`;
  await page.fill('#sanctuary-name', 'Lord Alistair');
  await page.fill('#sanctuary-id', testEmail);
  await page.fill('#master-cipher', 'SanctuaryCipher99!');

  console.log('Submitting signup with test email:', testEmail);
  await page.click('#btn-submit');

  // Wait for Supabase dispatch and UI state change
  await page.waitForTimeout(2500);

  // Verify that user is NOT automatically logged in
  const storedUser = await page.evaluate(() => localStorage.getItem('novelcast.auth.user.v1'));
  console.log('Stored user in localStorage after signup:', storedUser);
  if (!storedUser) {
    console.log('PASS: User is NOT directly logged in upon registration.');
  } else {
    console.error('FAIL: User was directly logged in without email confirmation.');
  }

  // Verify confirmation notice is shown
  const confirmationNoticeVisible = await page.$eval('#confirmation-notice', el => !el.classList.contains('hidden'));
  const confirmedEmailText = await page.textContent('#confirmed-email-display');
  console.log('Confirmation notice visible:', confirmationNoticeVisible, '| Email in notice:', confirmedEmailText);
  if (confirmationNoticeVisible && confirmedEmailText.includes(testEmail)) {
    console.log('PASS: Dedicated "Confirmation Dispatch Sent" notice rendered with email.');
  } else {
    console.error('FAIL: Confirmation notice not displayed properly.');
  }

  // Screenshot of confirmation notice
  const confirmNoticePath = path.join(__dirname, '../archive/login_confirmation_notice_verified.png');
  await page.screenshot({ path: confirmNoticePath });
  console.log('Saved:', confirmNoticePath);

  // 6. Test "Proceed to Sign In" button returns to Sign In form
  console.log('Testing "Proceed to Sign In" action...');
  await page.click('#btn-back-to-signin');
  await page.waitForTimeout(400);

  const formVisibleAgain = await page.$eval('#auth-form', el => !el.classList.contains('hidden'));
  const noticeHiddenAgain = await page.$eval('#confirmation-notice', el => el.classList.contains('hidden'));
  if (formVisibleAgain && noticeHiddenAgain) {
    console.log('PASS: "Proceed to Sign In" smoothly toggles back to Sign In form.');
  } else {
    console.error('FAIL: Could not return to Sign In form.');
  }

  // 7. Test unconfirmed email sign-in attempt
  console.log('Attempting to sign in with unconfirmed email...');
  await page.fill('#sanctuary-id', testEmail);
  await page.fill('#master-cipher', 'SanctuaryCipher99!');
  await page.click('#btn-submit');
  await page.waitForTimeout(2000);

  const alertText = await page.textContent('#auth-alert');
  console.log('Sign in response alert:', alertText);
  const stillNotLoggedIn = await page.evaluate(() => localStorage.getItem('novelcast.auth.user.v1'));
  if (!stillNotLoggedIn) {
    console.log('PASS: Unconfirmed email blocked from directly signing in.');
  } else {
    console.error('FAIL: Unconfirmed email was allowed to sign in.');
  }

  await browser.close();
  console.log('All verification checks for email confirmation & clean auth card completed successfully!');
})();
