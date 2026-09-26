const { chromium } = require('playwright');

async function testDraculaPagination() {
  console.log('--- Testing In-Chapter Book Pagination on Dracula Chapter 1 ---');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const pageErrors = [];
  page.on('pageerror', err => pageErrors.push(err.message));
  page.on('console', msg => {
    if (msg.type() === 'error') console.error('Browser error:', msg.text());
  });

  try {
    // 1. Navigate to Dracula Chapter 1
    console.log('\n[1/5] Navigating to http://localhost:3000/#/reader?book=dracula&chapter=1 ...');
    await page.goto('http://localhost:3000/#/reader?book=dracula&chapter=1', { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);

    // Verify initial spread
    const chHeading = await page.textContent('#book-chapter-heading');
    console.log('✓ Initial Chapter Heading:', chHeading ? chHeading.trim() : 'missing');

    const leftPageNum = await page.textContent('#book-left-page-num');
    const rightPageNum = await page.textContent('#book-right-page-num');
    console.log(`✓ Spread 1 Page numbers: [${leftPageNum?.trim()}] and [${rightPageNum?.trim()}]`);

    const navIndicator = await page.textContent('#reader-nav-indicator');
    console.log('✓ Navigation Indicator:', navIndicator?.trim());

    // Verify container dimensions and no scroll overflow
    const leftArticleHeight = await page.$eval('#book-left-article', el => el.clientHeight);
    const rightArticleHeight = await page.$eval('#book-right-article', el => el.clientHeight);
    console.log(`✓ Left Article Height: ${leftArticleHeight}px | Right Article Height: ${rightArticleHeight}px`);
    if (leftArticleHeight > 700 || rightArticleHeight > 700) {
      throw new Error(`Article height exceeds standard book dimensions: ${leftArticleHeight}px`);
    }

    // 2. Test Turning to Next Spread (Pages 3 & 4)
    console.log('\n[2/5] Turning to Spread 2 (Pages 3 & 4)...');
    const nextBtn = page.locator('#reader-next-btn');
    const nextLabel = await page.textContent('#reader-next-label');
    console.log('  Next button label:', nextLabel?.trim());
    if (!nextLabel?.includes('Next Page')) {
      throw new Error(`Expected button label "Next Page", got "${nextLabel}"`);
    }

    await nextBtn.click();
    await page.waitForTimeout(400);

    const leftPageNum2 = await page.textContent('#book-left-page-num');
    const rightPageNum2 = await page.textContent('#book-right-page-num');
    const navIndicator2 = await page.textContent('#reader-nav-indicator');
    console.log(`✓ Spread 2 Page numbers: [${leftPageNum2?.trim()}] and [${rightPageNum2?.trim()}]`);
    console.log('✓ Navigation Indicator after flip:', navIndicator2?.trim());

    if (!leftPageNum2?.includes('Page 3')) {
      throw new Error(`Expected Spread 2 to start on Page 3, got "${leftPageNum2}"`);
    }

    // 3. Test Turning to Previous Spread (Pages 1 & 2)
    console.log('\n[3/5] Testing Previous Page button...');
    const prevBtn = page.locator('#reader-prev-btn');
    await prevBtn.click();
    await page.waitForTimeout(400);

    const leftPageNumBack = await page.textContent('#book-left-page-num');
    console.log('✓ Returned to:', leftPageNumBack?.trim());
    if (!leftPageNumBack?.includes('Page 1')) {
      throw new Error(`Expected to return to Page 1, got "${leftPageNumBack}"`);
    }

    // 4. Test Keyboard Arrow Navigation
    console.log('\n[4/5] Testing Keyboard ArrowRight navigation...');
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(400);
    const indicatorAfterKey = await page.textContent('#reader-nav-indicator');
    console.log('✓ After ArrowRight:', indicatorAfterKey?.trim());
    if (!indicatorAfterKey?.includes('3–4')) {
      throw new Error(`ArrowRight navigation failed: ${indicatorAfterKey}`);
    }

    // 5. Test Chapter Skip Button
    console.log('\n[5/5] Testing Quick Chapter Skip (Jump to Chapter 2)...');
    await page.click('#reader-jump-next-ch');
    await page.waitForTimeout(800);

    const ch2Heading = await page.textContent('#book-chapter-heading');
    const ch2NavIndicator = await page.textContent('#reader-nav-indicator');
    console.log('✓ Chapter 2 Heading:', ch2Heading?.trim());
    console.log('✓ Chapter 2 Nav Indicator:', ch2NavIndicator?.trim());
    if (!ch2NavIndicator?.includes('Ch. 2')) {
      throw new Error(`Expected Chapter 2 indicator, got: ${ch2NavIndicator}`);
    }

    console.log('\n======================================================');
    console.log('🎉 DRACULA IN-CHAPTER SPREAD PAGINATION VERIFIED 100%!');
    console.log('======================================================\n');
  } catch (err) {
    console.error('\n❌ Test failed with error:', err.message);
    if (pageErrors.length > 0) {
      console.error('Page errors:', pageErrors);
    }
    process.exit(1);
  } finally {
    await browser.close();
  }
}

testDraculaPagination();
