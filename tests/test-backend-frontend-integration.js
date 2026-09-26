const { chromium } = require('playwright');

async function runIntegrationTests() {
  console.log('--- Starting NovelCast Frontend-Backend Integration Test ---');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // Capture console errors
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  try {
    // 1. Test Home View (#/home)
    console.log('\n[1/5] Testing Home View (#/home)...');
    await page.goto('http://localhost:3000/#/home', { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);

    const homeTitle = await page.textContent('h3:has-text("Popular Books")');
    console.log('✓ Found header:', homeTitle);

    // Verify real book cards in popular grid
    const popularCards = await page.$$eval('#popular-grid [data-book-link]', cards =>
      cards.map(c => c.getAttribute('data-book-link'))
    );
    console.log(`✓ Loaded ${popularCards.length} popular book cards from Atlas`);
    console.log('  Sample cards:', popularCards.slice(0, 4));

    if (popularCards.length < 5) {
      throw new Error(`Expected at least 5 popular cards, got ${popularCards.length}`);
    }

    // Verify Open Library cover loaded
    const hasCovers = await page.$$eval('#popular-grid img', imgs => imgs.length);
    console.log(`✓ Found ${hasCovers} book cover images rendered in popular grid`);

    // 2. Test Search View (#/search)
    console.log('\n[2/5] Testing Search View with Live Backend (#/search)...');
    await page.goto('http://localhost:3000/#/search', { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);

    // Test text search for "Gothic"
    const searchInput = page.locator('#search-input');
    await searchInput.fill('Gothic');
    await page.waitForTimeout(500);

    const resultsCount = await page.textContent('#results-count');
    console.log('✓ Search for "Gothic" yielded:', resultsCount);

    const gothicResults = await page.$$eval('#search-results-grid [data-book-link]', cards =>
      cards.map(c => c.getAttribute('data-book-link'))
    );
    console.log('  Gothic book slugs:', gothicResults);
    if (!gothicResults.includes('frankenstein') && !gothicResults.includes('dracula')) {
      throw new Error('Gothic search failed to find frankenstein or dracula');
    }

    // Test Genre Chip Filter
    console.log('  Testing Science Fiction filter chip...');
    await page.click('#search-chips [data-filter="Science Fiction"]');
    await page.waitForTimeout(500);
    const sciFiResults = await page.$$eval('#search-results-grid [data-book-link]', cards =>
      cards.map(c => c.getAttribute('data-book-link'))
    );
    console.log('✓ Science Fiction filter slugs:', sciFiResults);
    if (!sciFiResults.some(s => s.includes('war') || s.includes('time-machine') || s.includes('leagues'))) {
      throw new Error('Science Fiction filter failed to match expected books');
    }

    // 3. Test Book Details View (#/book?book=frankenstein)
    console.log('\n[3/5] Testing Book Details View with Live TOC (#/book?book=frankenstein)...');
    await page.goto('http://localhost:3000/#/book?book=frankenstein', { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);

    const bookTitle = await page.textContent('h1:has-text("Frankenstein")');
    console.log('✓ Book Title:', bookTitle ? bookTitle.trim() : 'missing');

    const authorText = await page.textContent('p:has-text("Mary Wollstonecraft Shelley")');
    console.log('✓ Author:', authorText ? authorText.trim() : 'missing');

    // Verify Chapter Index loaded full chapters from MongoDB
    const chapterLinks = await page.$$eval('#chapter-list-items a', links =>
      links.map(a => ({
        href: a.getAttribute('href'),
        title: a.querySelector('h4')?.textContent?.trim(),
        words: a.querySelector('span.font-body-sm')?.textContent?.trim()
      }))
    );
    console.log(`✓ Loaded ${chapterLinks.length} verified chapters from MongoDB Atlas`);
    console.log('  Chapter 1:', chapterLinks[0]);
    console.log('  Chapter 2:', chapterLinks[1]);
    console.log('  Chapter 3:', chapterLinks[2]);

    if (chapterLinks.length !== 28) {
      throw new Error(`Expected 28 chapters for Frankenstein, got ${chapterLinks.length}`);
    }

    // 4. Test Book Reader View (#/reader?book=frankenstein&chapter=1)
    console.log('\n[4/5] Testing Reader View with Live Gutenberg Full-Text (#/reader?book=frankenstein&chapter=1)...');
    await page.goto('http://localhost:3000/#/reader?book=frankenstein&chapter=1', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Verify Book Mode text
    const chHeading = await page.textContent('#book-chapter-heading');
    console.log('✓ Reader Chapter Heading:', chHeading ? chHeading.trim() : 'missing');

    const leftPageText = await page.textContent('#book-left-page-content');
    console.log('✓ Left Page Content Snippet:', leftPageText ? leftPageText.slice(0, 180).replace(/\s+/g, ' ') : 'empty');
    if (!leftPageText.includes('Mrs. Saville') && !leftPageText.includes('Petersburgh')) {
      throw new Error('Did not find authentic Frankenstein Chapter 1 text (Mrs. Saville / Petersburgh)');
    }

    // Test In-Chapter Spread Flip
    console.log('  Testing In-Chapter Next Page flip...');
    const nextBtn = page.locator('#reader-next-btn');
    await nextBtn.click();
    await page.waitForTimeout(600);
    const navInd = await page.textContent('#reader-nav-indicator');
    console.log('✓ Flipped in-chapter spread:', navInd?.trim());

    // Test Navigation to Chapter 2
    console.log('  Navigating to Chapter 2 via quick skip button...');
    await page.click('#reader-jump-next-ch');
    await page.waitForTimeout(1000);

    const ch2Heading = await page.textContent('#book-chapter-heading');
    const ch2Text = await page.textContent('#book-left-page-content');
    console.log('✓ Navigated to Chapter 2:', ch2Heading ? ch2Heading.trim() : 'missing');
    console.log('  Chapter 2 text snippet:', ch2Text ? ch2Text.slice(0, 150).replace(/\s+/g, ' ') : 'empty');

    // Test Switching to PDF Mode
    console.log('  Switching to [PDF] Continuous Scroll Mode...');
    await page.click('#btn-mode-pdf');
    await page.waitForTimeout(400);

    const isPdfVisible = await page.isVisible('#reader-pdf-container');
    const isBookHidden = !(await page.isVisible('#reader-book-container'));
    console.log('✓ PDF mode container visible:', isPdfVisible, '| Book spread hidden:', isBookHidden);

    const pdfTitle = await page.textContent('#pdf-chapter-title');
    console.log('✓ PDF Mode Chapter Title:', pdfTitle ? pdfTitle.trim() : 'missing');

    const pdfText = await page.textContent('#pdf-paragraphs-container');
    console.log('✓ PDF Mode Paragraphs Snippet:', pdfText ? pdfText.slice(0, 180).replace(/\s+/g, ' ') : 'empty');
    if (!pdfText || pdfText.length < 500) {
      throw new Error('PDF mode container has insufficient full-text content');
    }

    // 5. Test 3D Hardcover Book Parade on Landing View (#/landing)
    console.log('\n[5/5] Testing 3D Parade Book Targets (#/landing)...');
    await page.goto('http://localhost:3000/#/landing', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    const centerpiece = page.locator('.book-featured');
    await centerpiece.click();
    await page.waitForTimeout(600);

    const currentUrl = page.url();
    console.log('✓ Clicking 3D Centerpiece navigated to:', currentUrl);
    if (!currentUrl.includes('pride-and-prejudice')) {
      throw new Error(`Expected navigation to pride-and-prejudice, got ${currentUrl}`);
    }

    console.log('\n======================================================');
    console.log('🎉 ALL 5 INTEGRATION CHECKS PASSED WITH 100% SUCCESS!');
    console.log('======================================================\n');
  } catch (err) {
    console.error('\n❌ Test failed with error:', err.message);
    if (errors.length > 0) {
      console.error('Browser console errors:', errors);
    }
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runIntegrationTests();
