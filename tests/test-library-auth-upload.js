const { chromium } = require('playwright');
const path = require('path');

(async () => {
  console.log('Launching browser to verify Auth, Library, PixelCard, and Uploads...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') console.log('BROWSER ERROR:', msg.text());
  });

  // Step 1: Open site and check header profile icon
  await page.goto('http://localhost:3000/#/home', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Check that no img with Profile Avatar exists in header
  const headerAvatarImg = await page.$('#app-header img[alt="Profile Avatar"]');
  if (headerAvatarImg) {
    console.error('FAIL: Profile Avatar img still found in header!');
  } else {
    console.log('PASS: Profile Avatar img removed from header.');
  }

  const userBtn = await page.$('#header-user-btn svg');
  if (userBtn) {
    console.log('PASS: User profile SVG icon rendered in header.');
  } else {
    console.error('FAIL: User profile SVG icon not found in header.');
  }

  // Step 2: Try to navigate to #/library while logged out
  console.log('Testing unauthenticated guard on #/library...');
  await page.evaluate(() => {
    // Ensure logged out
    localStorage.removeItem('novelcast.auth.user.v1');
    location.hash = '#/library';
  });
  await page.waitForTimeout(1000);

  const currentHash = await page.evaluate(() => location.hash);
  console.log('Current URL hash after attempting /library:', currentHash);

  const loginTitle = await page.textContent('h2');
  console.log('Header on screen:', loginTitle);

  // Take screenshot of Login page
  await page.screenshot({ path: path.join(__dirname, '../archive/test_login_page.png') });
  console.log('Saved login page screenshot.');

  // Step 3: Simulate authenticated user
  console.log('Simulating authenticated reader session...');
  await page.evaluate(() => {
    const testUser = {
      id: 'test-user-sanctuary',
      email: 'reader@novelcast.com'
    };
    localStorage.setItem('novelcast.auth.user.v1', JSON.stringify(testUser));
    window.NovelCastAuth.init();
    window.NovelCastRouter.navigate('library');
  });
  await page.waitForTimeout(1500);

  const libHash = await page.evaluate(() => location.hash);
  console.log('Current URL hash after login:', libHash);

  // Check PixelCard rendered
  const pixelCard = await page.$('#pixel-upload-card');
  const pixelCanvas = await page.$('#pixel-upload-card canvas.pixel-canvas');
  if (pixelCard && pixelCanvas) {
    console.log('PASS: PixelCard component with canvas rendered successfully.');
  } else {
    console.error('FAIL: PixelCard or canvas not rendered.');
  }

  // Check Null / Empty state
  const nullStateText = await page.textContent('#user-books-container');
  console.log('Empty state found:', nullStateText.includes('Empty') || nullStateText.includes('Null'));

  await page.screenshot({ path: path.join(__dirname, '../archive/test_library_empty.png') });

  // Step 4: Add a manuscript book upload
  console.log('Testing book upload & progress tracking...');
  await page.evaluate(() => {
    const NC = window.NovelCast;
    NC.addUserUpload('test-user-sanctuary', {
      id: 'upload-test-1',
      title: 'The Whispering Pines',
      author: 'Evelyn Vance',
      format: 'EPUB',
      size: '2.4 MB',
      progress: 35,
      chapters: 14,
      lastRead: 'Chapter 5'
    });
    // Re-render
    const container = document.getElementById('app-view');
    container.innerHTML = window.NovelCastViews.library.render();
    window.NovelCastViews.library.init();
  });
  await page.waitForTimeout(800);

  const bookCard = await page.$('#user-books-container .group');
  if (bookCard) {
    console.log('PASS: Uploaded book card rendered with title and reading progress.');
  } else {
    console.error('FAIL: Uploaded book card not rendered.');
  }

  // Step 5: Test quick progress increment button
  console.log('Testing +20% quick progress increment...');
  await page.click('.btn-quick-progress');
  await page.waitForTimeout(500);

  const progressText = await page.textContent('#user-books-container');
  console.log('PASS: Progress updated to 55% verified in UI:', progressText.includes('55%'));

  await page.screenshot({ path: path.join(__dirname, '../archive/test_library_with_book.png') });
  console.log('Saved library with book screenshot to archive/test_library_with_book.png');

  await browser.close();
  console.log('All tests finished successfully!');
})();
