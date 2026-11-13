// Legacy inspection utility: list elements from separate root HTML pages when those files exist.
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const root = path.resolve(__dirname, '..');
const pages = ['library', 'search', 'book-details', 'read-book', 'read-scroll'];

// Inspect each legacy page independently; the active SPA uses a different shared shell.
for (const name of pages) {
  const filePath = path.join(root, name + '.html');
  // Skip legacy pages that no longer exist instead of failing the entire inspection.
  if (!fs.existsSync(filePath)) continue;

  // Parse HTML into a DOM without opening a real browser or running the application.
  const d = new JSDOM(fs.readFileSync(filePath, 'utf8')).window.document;
  console.log('\nPAGE:', name);
  // List important sections/controls with enough text to locate them during design inspection.
  for (const [i, e] of [...d.querySelectorAll('main section, main article, main h1, main h2, main h3, main h4, main input, main button, [id]')].entries()) {
    console.log(i, e.tagName, e.id, e.className.slice(0, 90), 'TEXT:', e.textContent.trim().replace(/\s+/g, ' ').slice(0, 120));
  }
  // Reader pages receive an additional text/parent listing to help inspect paragraph layout.
  if (name.startsWith('read-')) {
    console.log('READER NODES:');
    for (const e of d.querySelectorAll('main p, main h1, main h2, main h3, main article')) {
      console.log(e.tagName, e.className, e.parentElement.tagName, e.parentElement.className, e.textContent.trim().slice(0, 90));
    }
  }
}
