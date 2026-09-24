const fs = require('fs');
const path = require('path');
const https = require('https');

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

const TOKEN = process.env.FIGMA_ACCESS_TOKEN || '';
const FILE_KEY = process.env.FIGMA_FILE_KEY || '0WW7OwtWFVtYtIXQGuPdk2';

function figmaRequest(endpoint) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.figma.com',
      path: endpoint,
      method: 'GET',
      headers: {
        'X-Figma-Token': TOKEN
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(`Figma API Error (${res.statusCode}): ${parsed.err || parsed.message || data}`));
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

async function listFrames() {
  const data = await figmaRequest(`/v1/files/${FILE_KEY}?depth=2`);
  const frames = [];
  if (data.document && data.document.children) {
    data.document.children.forEach(page => {
      if (page.children) {
        page.children.forEach(child => {
          frames.push({
            id: child.id,
            name: child.name,
            type: child.type,
            page: page.name,
            box: child.absoluteBoundingBox
          });
        });
      }
    });
  }
  return frames;
}

async function getNode(nodeId) {
  return await figmaRequest(`/v1/files/${FILE_KEY}/nodes?ids=${encodeURIComponent(nodeId)}`);
}

async function getImageUrls(nodeIds, format = 'png', scale = 1) {
  const ids = Array.isArray(nodeIds) ? nodeIds.join(',') : nodeIds;
  const res = await figmaRequest(`/v1/images/${FILE_KEY}?ids=${encodeURIComponent(ids)}&format=${format}&scale=${scale}`);
  return res.images;
}

module.exports = {
  listFrames,
  getNode,
  getImageUrls,
  FILE_KEY
};

// CLI Support
if (require.main === module) {
  const cmd = process.argv[2] || 'frames';
  if (cmd === 'frames') {
    listFrames().then(frames => {
      console.log(`\n=== Figma File: NovalCast📖 (${FILE_KEY}) ===`);
      frames.forEach(f => {
        const w = f.box ? Math.round(f.box.width) : '?';
        const h = f.box ? Math.round(f.box.height) : '?';
        console.log(`- [${f.id}] "${f.name}" (${f.type}, ${w}x${h})`);
      });
      console.log('');
    }).catch(console.error);
  } else if (cmd === 'images') {
    const id = process.argv[3] || '6:2';
    getImageUrls(id).then(images => {
      console.log('Image URLs:', images);
    }).catch(console.error);
  }
}
