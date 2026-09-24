const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const root = path.resolve(__dirname, '..');
const pages = ['library', 'search', 'book-details', 'read-book', 'read-scroll'];

for (const name of pages) {
  const filePath = path.join(root, name + '.html');
  if (!fs.existsSync(filePath)) continue;

  const d = new JSDOM(fs.readFileSync(filePath, 'utf8')).window.document;
  console.log('\nPAGE:', name);
  for (const [i, e] of [...d.querySelectorAll('main section, main article, main h1, main h2, main h3, main h4, main input, main button, [id]')].entries()) {
    console.log(i, e.tagName, e.id, e.className.slice(0, 90), 'TEXT:', e.textContent.trim().replace(/\s+/g, ' ').slice(0, 120));
  }
  if (name.startsWith('read-')) {
    console.log('READER NODES:');
    for (const e of d.querySelectorAll('main p, main h1, main h2, main h3, main article')) {
      console.log(e.tagName, e.className, e.parentElement.tagName, e.parentElement.className, e.textContent.trim().slice(0, 90));
    }
  }
}
