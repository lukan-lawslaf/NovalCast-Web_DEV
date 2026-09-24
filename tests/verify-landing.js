const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 950 } });
  
  console.log('Navigating to http://localhost:3000/ ...');
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  
  // Verify all books bottom positions & featured book
  const booksData = await page.evaluate(() => {
    const books = Array.from(document.querySelectorAll('.book-3d-wrapper'));
    const bottomPositions = books.map((b, i) => {
      const rect = b.getBoundingClientRect();
      return { index: i + 1, bottom: Math.round(rect.bottom), width: Math.round(rect.width), height: Math.round(rect.height), isFeatured: b.classList.contains('book-featured') };
    });
    const video = document.querySelector('video[aria-label="1s1s — animated ASCII art"]');
    return {
      totalBooks: books.length,
      bottomPositions,
      hasAsciiVideo: !!video,
      videoSrc: video ? video.src : null
    };
  });
  console.log('Books Data & ASCII Art:', JSON.stringify(booksData, null, 2));

  // Hover over the middle book (book-featured) to test mousemove cursor tilt
  console.log('Hovering over middle book (book-featured)...');
  const featuredBook = page.locator('.book-featured');
  await featuredBook.hover();
  await page.mouse.move(100, 100);
  await page.waitForTimeout(400);

  const featuredTransform = await featuredBook.evaluate(el => el.style.transform);
  console.log('Middle book transform during hover:', featuredTransform);

  // Take screenshot
  await page.screenshot({ path: 'Referance/landing_updated_verified.png' });
  console.log('Screenshot saved to Referance/landing_updated_verified.png');

  await browser.close();
})();
