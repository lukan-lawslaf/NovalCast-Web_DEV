// Design import utility: request Stitch design references and save downloaded outputs when run manually.
const https = require('https');
const fs = require('fs');
// Load environment variables from .env
function loadEnv() {
  const envPath = path.resolve(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    // Read matching key=value entries for this development process.
    lines.forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        process.env[match[1]] = match[2].trim();
      }
    });
  }
}

loadEnv();

const apiKey = process.env.GOOGLE_API_KEY || process.env.STITCH_API_KEY || '';
const projectId = '17892911391031885180';
const outDir = path.resolve(__dirname, '..', 'Referance', 'Stich');

// Prepare the local reference folder used by the exported HTML and manifest.
fs.mkdirSync(outDir, { recursive: true });

// Send a tool request to the design service and return its response.
function callMcp(toolName, args) {
  // Wrap request events in a Promise so callers can await a complete service result.
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'stitch.googleapis.com',
      path: '/mcp',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey
      }
    }, (res) => {
      let body = '';
      // Buffer the service response until the JSON-RPC result is complete.
      res.on('data', chunk => body += chunk);
      // Decode the JSON-RPC envelope and then the tool's optional JSON text payload.
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          // Reject a service error instead of treating it as an empty successful export.
          if (data.error) return reject(new Error(JSON.stringify(data.error)));
          if (data.result && data.result.content && data.result.content[0]) {
            resolve(JSON.parse(data.result.content[0].text));
          } else {
            resolve(data.result);
          }
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    // Send the requested tool name and arguments using the JSON-RPC tools/call method.
    req.write(JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: { name: toolName, arguments: args }
    }));
    req.end();
  });
}

// Download an exported reference file, following redirects where supported.
function downloadUrl(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      // Follow redirected export URLs before saving the response to the selected path.
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadUrl(res.headers.location, dest).then(resolve).catch(reject);
      }
      let data = '';
      // Collect the exported HTML text before writing the complete file.
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        fs.writeFileSync(dest, data, 'utf8');
        resolve(data.length);
      });
    }).on('error', reject);
  });
}

// Collect screen exports and record their local paths in a manifest.
async function run() {
  console.log('Fetching screen list for Stitch project:', projectId);
  const listRes = await callMcp('list_screens', { projectId: 'projects/' + projectId });
  const screens = listRes.screens || [];
  console.log(`Found ${screens.length} screens.`);

  const manifest = [];

  // Export screens independently so one failure does not stop all remaining downloads.
  for (const s of screens) {
    const screenId = s.name.split('/').pop();
    console.log(`Fetching screen [${screenId}]: ${s.title}`);
    try {
      const details = await callMcp('get_screen', {
        name: s.name
      });
      
      // Turn the screen title into a bounded filename and include its source ID.
      const safeTitle = s.title.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 50);
      const filename = `${safeTitle}_${screenId}.html`;
      const filePath = path.join(outDir, filename);

      let htmlLen = 0;
      // Download only when the service supplies an HTML export URL.
      if (details.htmlCode && details.htmlCode.downloadUrl) {
        htmlLen = await downloadUrl(details.htmlCode.downloadUrl, filePath);
        console.log(`  -> Saved HTML (${htmlLen} bytes) to ${filename}`);
      } else {
        console.log(`  -> No htmlCode.downloadUrl available`);
      }

      // Store source identity, dimensions, local filename, and screenshot link for each result.
      manifest.push({
        id: screenId,
        title: s.title,
        filename: filename,
        width: details.width,
        height: details.height,
        deviceType: details.deviceType,
        htmlBytes: htmlLen,
        screenshotUrl: details.screenshot ? details.screenshot.downloadUrl : null
      });
    // Report this screen's failure and continue the outer export loop.
    } catch (err) {
      console.error(`  -> Failed for ${screenId}:`, err.message);
    }
  }

  // Save the completed export index for later local reference.
  const manifestPath = path.join(outDir, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`\nImport complete! Saved ${manifest.length} screen assets to ${outDir}`);
}

// Execute the development import and surface an uncaught top-level failure.
run().catch(console.error);
