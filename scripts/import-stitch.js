const https = require('https');
const fs = require('fs');
// Load environment variables from .env
function loadEnv() {
  const envPath = path.resolve(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
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

fs.mkdirSync(outDir, { recursive: true });

function callMcp(toolName, args) {
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
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
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
    req.write(JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: { name: toolName, arguments: args }
    }));
    req.end();
  });
}

function downloadUrl(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadUrl(res.headers.location, dest).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        fs.writeFileSync(dest, data, 'utf8');
        resolve(data.length);
      });
    }).on('error', reject);
  });
}

async function run() {
  console.log('Fetching screen list for Stitch project:', projectId);
  const listRes = await callMcp('list_screens', { projectId: 'projects/' + projectId });
  const screens = listRes.screens || [];
  console.log(`Found ${screens.length} screens.`);

  const manifest = [];

  for (const s of screens) {
    const screenId = s.name.split('/').pop();
    console.log(`Fetching screen [${screenId}]: ${s.title}`);
    try {
      const details = await callMcp('get_screen', {
        name: s.name
      });
      
      const safeTitle = s.title.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 50);
      const filename = `${safeTitle}_${screenId}.html`;
      const filePath = path.join(outDir, filename);

      let htmlLen = 0;
      if (details.htmlCode && details.htmlCode.downloadUrl) {
        htmlLen = await downloadUrl(details.htmlCode.downloadUrl, filePath);
        console.log(`  -> Saved HTML (${htmlLen} bytes) to ${filename}`);
      } else {
        console.log(`  -> No htmlCode.downloadUrl available`);
      }

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
    } catch (err) {
      console.error(`  -> Failed for ${screenId}:`, err.message);
    }
  }

  const manifestPath = path.join(outDir, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`\nImport complete! Saved ${manifest.length} screen assets to ${outDir}`);
}

run().catch(console.error);
