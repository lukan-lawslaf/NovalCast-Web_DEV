const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 950 } });
  
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  
  const featuredBook = page.locator('.book-featured');
  const box = await featuredBook.boundingBox();
  console.log('Featured book box:', box);

  // Move mouse inside the featured book to trigger mousemove
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.move(box.x + box.width / 2 + 15, box.y + box.height / 2 - 10);
  await page.waitForTimeout(200);

  const featuredTransform = await featuredBook.evaluate(el => el.style.transform);
  console.log('Middle book transform during mouse movement:', featuredTransform);

  await browser.close();
})();
