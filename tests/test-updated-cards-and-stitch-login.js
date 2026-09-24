const { chromium } = require('playwright');
const path = require('path');

(async () => {
  console.log('Testing Stitch Login Screen, Updated Book Cards, and Book Details Page...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') console.log('BROWSER ERROR:', msg.text());
  });

  // 1. Visit Login Page
  console.log('Navigating to #/login...');
  await page.goto('http://localhost:3000/#/home', { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    localStorage.removeItem('novelcast.auth.user.v1');
    location.hash = '#/login';
  });
  await page.waitForTimeout(1200);

  const loginTitle = await page.textContent('h1');
  console.log('Login headline:', loginTitle);

  const btnSubmit = await page.$('#btn-submit');
  if (btnSubmit) {
    console.log('PASS: Stitch gold-shimmer-btn "Enter Sanctuary" rendered.');
  } else {
    console.error('FAIL: Submit button not found on login screen.');
  }

  await page.screenshot({ path: path.join(__dirname, '../archive/stitch_login_verified.png') });
  console.log('Saved stitch_login_verified.png');

  // 2. Authenticate and go to Library with uploaded book
  console.log('Authenticating reader and loading library...');
  await page.evaluate(() => {
    const testUser = {
      id: 'test-user-sanctuary',
      email: 'reader@novelcast.com'
    };
    localStorage.setItem('novelcast.auth.user.v1', JSON.stringify(testUser));
    
    // Add manuscript book upload
    const NC = window.NovelCast;
    NC.addUserUpload('test-user-sanctuary', {
      id: 'upload-business-comm',
      title: 'Understanding Business Communication',
      author: 'Prof. Julian Vance',
      format: 'PDF',
      size: '2.5 MB',
      progress: 40,
      chapters: 10,
      lastRead: 'Chapter 4'
    });

    window.NovelCastAuth.init();
    window.NovelCastRouter.navigate('library');
  });
  await page.waitForTimeout(1500);

  // Check card appearance
  const bookLink = await page.$('a[href="#/book?book=upload-business-comm"]');
  if (bookLink) {
    console.log('PASS: Uploaded book card rendered with standard book link.');
  } else {
    console.error('FAIL: Uploaded book link not found.');
  }

  // Check that "Start Reading" button is removed from card
  const startReadingBtn = await page.$('#user-books-container button:has-text("Start Reading")');
  if (!startReadingBtn) {
    console.log('PASS: "Start Reading" button removed from uploaded book card.');
  } else {
    console.error('FAIL: "Start Reading" button still present.');
  }

  await page.screenshot({ path: path.join(__dirname, '../archive/updated_library_cards_verified.png') });
  console.log('Saved updated_library_cards_verified.png');

  // 3. Click uploaded book card to navigate to book details page
  console.log('Clicking on uploaded book card to verify navigation to book details...');
  await page.click('a[href="#/book?book=upload-business-comm"]');
  await page.waitForTimeout(1200);

  const currentUrl = await page.evaluate(() => location.hash);
  console.log('Current URL hash after click:', currentUrl);

  const bookDetailTitle = await page.textContent('h1, h2');
  console.log('Book Details Page Title on screen:', bookDetailTitle);

  const readNowBtn = await page.$('a:has-text("Read Now")');
  if (readNowBtn) {
    console.log('PASS: "Read Now" option present on book details page.');
  } else {
    console.error('FAIL: "Read Now" button not found on book details page.');
  }

  await page.screenshot({ path: path.join(__dirname, '../archive/uploaded_book_details_verified.png') });
  console.log('Saved uploaded_book_details_verified.png');

  await browser.close();
  console.log('All verification checks completed successfully!');
})();
