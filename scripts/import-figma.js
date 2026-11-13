// Design import utility: download Figma reference data/assets into Referance/Figma when run manually.
const https = require('https');
const fs = require('fs');
const path = require('path');
// Load environment variables from .env
function loadEnv() {
  const envPath = path.resolve(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    // Accept matching assignments from the local file for this development process.
    lines.forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        process.env[match[1]] = match[2].trim();
      }
    });
  }
}

loadEnv();

const TOKEN = process.env.FIGMA_ACCESS_TOKEN || '';
const FILE_KEY = process.env.FIGMA_FILE_KEY || '0WW7OwtWFVtYtIXQGuPdk2';
const outDir = path.resolve(__dirname, '..', 'Referance', 'Figma');

// Create the local reference folder before any metadata or image writes.
fs.mkdirSync(outDir, { recursive: true });

// Fetch design JSON from Figma; credentials stay in the request headers.
function figmaGet(endpoint) {
  return new Promise((resolve, reject) => {
    // Issue an authenticated Figma request and collect its response asynchronously.
    const req = https.request({
      hostname: 'api.figma.com',
      path: endpoint,
      method: 'GET',
      headers: {
        'X-Figma-Token': TOKEN
      }
    }, (res) => {
      let data = '';
      // Join streamed text chunks before attempting to parse JSON.
      res.on('data', chunk => data += chunk);
      // Resolve only successful HTTP responses; propagate parse and API errors to the caller.
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(`Figma Error (${res.statusCode}): ${parsed.err || parsed.message || data.slice(0, 200)}`));
          }
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

// Save a remote binary asset into the local reference folder.
function downloadBinary(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      // Export links may redirect; follow the new location before opening the destination file.
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadBinary(res.headers.location, dest).then(resolve).catch(reject);
      }
      // Pipe bytes directly to disk instead of keeping the whole image in memory.
      const fileStream = fs.createWriteStream(dest);
      res.pipe(fileStream);
      // Wait for the write to finish, then close the stream and report the saved size.
      fileStream.on('finish', () => {
        fileStream.close();
        resolve(fs.statSync(dest).size);
      });
    }).on('error', reject);
  });
}

// Export selected design nodes, assets, tokens, and a reference preview.
async function run() {
  console.log(`Importing Figma design from file: ${FILE_KEY} to ${outDir}`);

  // 1. Fetch full file metadata and document structure
  console.log('1. Fetching file structure and styles...');
  const fileData = await figmaGet(`/v1/files/${FILE_KEY}`);
  
  // Save full raw file JSON
  fs.writeFileSync(path.join(outDir, 'figma-file.json'), JSON.stringify(fileData, null, 2), 'utf8');
  console.log(`   -> Saved complete figma-file.json`);

  // Extract frames
  const frames = [];
  if (fileData.document && fileData.document.children) {
    fileData.document.children.forEach(page => {
      if (page.children) {
        page.children.forEach(child => {
          frames.push({
            id: child.id,
            name: child.name,
            type: child.type,
            page: page.name,
            box: child.absoluteBoundingBox,
            childCount: child.children ? child.children.length : 0
          });
        });
      }
    });
  }

  console.log(`2. Found ${frames.length} top-level frames:`);
  frames.forEach(f => console.log(`   - [${f.id}] ${f.name} (${f.type})`));

  // 2. Fetch images for all frames
  console.log('3. Requesting high-resolution PNG renders for frames...');
  const frameIds = frames.map(f => f.id);
  const imagesRes = await figmaGet(`/v1/images/${FILE_KEY}?ids=${encodeURIComponent(frameIds.join(','))}&format=png&scale=1`);
  const imageUrls = imagesRes.images || {};

  // Download each frame render & save individual frame JSON
  // Record each exported frame so the final manifest and preview can link to it.
  const framesManifest = [];
  for (const f of frames) {
    // Replace unsupported filename characters and cap the length before creating local paths.
    const safeName = f.name.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 50);
    const cleanId = f.id.replace(':', '-');
    const imgFilename = `${safeName}_${cleanId}.png`;
    const jsonFilename = `${safeName}_${cleanId}.json`;

    // Fetch deep node data
    try {
      const nodeData = await figmaGet(`/v1/files/${FILE_KEY}/nodes?ids=${encodeURIComponent(f.id)}`);
      fs.writeFileSync(path.join(outDir, jsonFilename), JSON.stringify(nodeData, null, 2), 'utf8');
    } catch (e) {
      console.warn(`   Could not fetch node details for ${f.id}:`, e.message);
    }

    // A missing or failed render must not prevent the other frames from being recorded.
    let imgBytes = 0;
    if (imageUrls[f.id]) {
      try {
        imgBytes = await downloadBinary(imageUrls[f.id], path.join(outDir, imgFilename));
        console.log(`   -> Downloaded render ${imgFilename} (${imgBytes} bytes)`);
      } catch (e) {
        console.warn(`   Failed to download image for ${f.id}:`, e.message);
      }
    }

    // Keep local filenames alongside source metadata for the generated reference browser.
    framesManifest.push({
      id: f.id,
      name: f.name,
      type: f.type,
      box: f.box,
      jsonFile: jsonFilename,
      imageFile: imgFilename,
      renderUrl: imageUrls[f.id] || null
    });
  }

  // 3. Extract Design Tokens (styles, colors, typography)
  console.log('4. Extracting design tokens...');
  const tokens = {
    file: fileData.name,
    lastModified: fileData.lastModified,
    version: fileData.version,
    styles: fileData.styles || {},
    components: fileData.components || {},
    componentSets: fileData.componentSets || {}
  };
  fs.writeFileSync(path.join(outDir, 'tokens.json'), JSON.stringify(tokens, null, 2), 'utf8');

  // 4. Save manifest
  const manifest = {
    fileKey: FILE_KEY,
    name: fileData.name,
    lastModified: fileData.lastModified,
    thumbnailUrl: fileData.thumbnailUrl,
    frames: framesManifest
  };
  fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');

  // 5. Generate an index preview HTML file in Referance/Figma
  // Generate a standalone reference gallery; this is not the active NovelCast SPA shell.
  const previewHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Figma Design Import - ${fileData.name}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f0f11; color: #e5e5e5; margin: 0; padding: 24px; }
    h1 { color: #fff; font-size: 24px; margin-bottom: 8px; }
    .subtitle { color: #888; margin-bottom: 24px; font-size: 14px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 24px; }
    .card { background: #1a1a1f; border: 1px solid #2a2a32; border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; }
    .card-img-wrap { background: #0a0a0c; max-height: 380px; overflow: hidden; border-bottom: 1px solid #2a2a32; }
    .card img { width: 100%; height: auto; display: block; object-fit: contain; }
    .card-body { padding: 16px; flex: 1; }
    .card-title { font-size: 16px; font-weight: 600; margin: 0 0 8px 0; color: #fff; }
    .card-meta { font-size: 12px; color: #888; margin-bottom: 12px; }
    .links a { color: #38bdf8; text-decoration: none; font-size: 13px; margin-right: 12px; }
    .links a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <h1>Figma Import: ${fileData.name}</h1>
  <div class="subtitle">File Key: <code>${FILE_KEY}</code> &bull; Last Modified: ${fileData.lastModified} &bull; ${framesManifest.length} frames imported</div>
  <div class="grid">
    ${framesManifest.map(f => `
      <div class="card">
        <div class="card-img-wrap">
          <img src="./${f.imageFile}" alt="${f.name}" onerror="this.style.display='none'" />
        </div>
        <div class="card-body">
          <div class="card-title">${f.name}</div>
          <div class="card-meta">Node ID: <code>${f.id}</code> &bull; Bounds: ${f.box ? Math.round(f.box.width) + 'x' + Math.round(f.box.height) : 'N/A'}</div>
          <div class="links">
            <a href="./${f.jsonFile}" target="_blank">View JSON Data</a>
            <a href="./${f.imageFile}" target="_blank">View Render Image</a>
          </div>
        </div>
      </div>
    `).join('')}
  </div>
</body>
</html>`;

  fs.writeFileSync(path.join(outDir, 'index.html'), previewHtml, 'utf8');
  console.log(`\nImport complete! Saved Figma assets and index.html to ${outDir}`);
}

// Run the import and report a top-level failure rather than silently losing it.
run().catch(console.error);
