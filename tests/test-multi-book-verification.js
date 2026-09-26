const { chromium } = require('playwright');

const TEST_SLUGS = [
  { slug: 'dracula', expectedAuthor: 'Bram Stoker', minCh: 20 },
  { slug: 'moby-dick', expectedAuthor: 'Herman Melville', minCh: 50 },
  { slug: 'the-great-gatsby', expectedAuthor: 'F. Scott Fitzgerald', minCh: 5 },
  { slug: 'the-adventures-of-sherlock-holmes', expectedAuthor: 'Arthur Conan Doyle', minCh: 10 },
  { slug: 'alices-adventures-in-wonderland', expectedAuthor: 'Lewis Carroll', minCh: 10 },
  { slug: 'twenty-thousand-leagues-under-the-sea', expectedAuthor: 'Jules Verne', minCh: 20 },
  { slug: 'jane-eyre', expectedAuthor: 'Charlotte Brontë', minCh: 30 },
  { slug: 'the-war-of-the-worlds', expectedAuthor: 'H. G. Wells', minCh: 20 }
];

async function verifyMultiBook() {
  console.log('--- Multi-Book Automated Verification Test ---');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const pageErrors = [];
  page.on('pageerror', err => pageErrors.push(err.message));

  try {
    for (const item of TEST_SLUGS) {
      console.log(`\nVerifying [${item.slug}]...`);
      // 1. Check Book Details Page
      await page.goto(`http://localhost:3000/#/book?book=${item.slug}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(400);

      const title = await page.$eval('h1', el => el.textContent.trim());
      console.log(`  ✓ Title: "${title}"`);

      const chapterCount = await page.$$eval('#chapter-list-items a', links => links.length);
      console.log(`  ✓ Chapters in TOC: ${chapterCount} (expected >= ${item.minCh})`);
      if (chapterCount < item.minCh) {
        throw new Error(`Insufficient chapters for ${item.slug}: got ${chapterCount}`);
      }

      // 2. Check Reader View Chapter 1
      await page.goto(`http://localhost:3000/#/reader?book=${item.slug}&chapter=1`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(600);

      const chHeading = await page.$eval('#book-chapter-heading', el => el.textContent.trim());
      const leftSnippet = await page.$eval('#book-left-page-content', el => el.textContent.trim());
      console.log(`  ✓ Chapter 1 Heading: "${chHeading}"`);
      console.log(`  ✓ Sample Content: "${leftSnippet.slice(0, 100).replace(/\s+/g, ' ')}..."`);

      if (leftSnippet.length < 150) {
        throw new Error(`Reader content too short for ${item.slug}: length ${leftSnippet.length}`);
      }
    }

    console.log('\n======================================================');
    console.log(`🎉 MULTI-BOOK VERIFICATION PASSED: ${TEST_SLUGS.length}/${TEST_SLUGS.length} BOOKS VERIFIED!`);
    console.log('======================================================');
  } catch (err) {
    console.error('\n❌ Multi-book verification failed:', err.message);
    if (pageErrors.length > 0) {
      console.error('Page errors:', pageErrors);
    }
    process.exit(1);
  } finally {
    await browser.close();
  }
}

verifyMultiBook();
