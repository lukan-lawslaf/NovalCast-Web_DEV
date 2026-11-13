// Design utility: inspect Figma frames/nodes and request image URLs; not part of the running website.
const fs = require('fs');
const path = require('path');
const https = require('https');

// Load environment variables from .env
function loadEnv() {
  const envPath = path.resolve(__dirname, '..', '.env');
  // Only read the optional local configuration when it exists.
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    // Convert each matching key=value line into an environment entry for this process.
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

// Request one Figma API resource using the locally configured access token.
function figmaRequest(endpoint) {
  return new Promise((resolve, reject) => {
    // Keep authentication in the request headers, separate from the URL path.
    const req = https.request({
      hostname: 'api.figma.com',
      path: endpoint,
      method: 'GET',
      headers: {
        'X-Figma-Token': TOKEN
      }
    }, (res) => {
      let data = '';
      // Responses arrive as chunks; accumulate them until the end event.
      res.on('data', chunk => data += chunk);
      // Parse the complete JSON response, resolving success and rejecting API failures.
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          // HTTP success returns the parsed data; other statuses reject the Promise.
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(`Figma API Error (${res.statusCode}): ${parsed.err || parsed.message || data}`));
          }
        // Invalid response JSON is also a failed request, not usable design data.
        } catch (e) {
          reject(e);
        }
      });
    });
    // Forward connection errors and finish sending the request.
    req.on('error', reject);
    req.end();
  });
}

// Find frame nodes to help select which design screens to inspect.
async function listFrames() {
  const data = await figmaRequest(`/v1/files/${FILE_KEY}?depth=2`);
  const frames = [];
  // The design document contains pages; collect each page's immediate child frames.
  if (data.document && data.document.children) {
    data.document.children.forEach(page => {
      if (page.children) {
        // Return only the small metadata set needed to identify a design screen.
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

// Fetch the detailed data for one selected node.
async function getNode(nodeId) {
  return await figmaRequest(`/v1/files/${FILE_KEY}/nodes?ids=${encodeURIComponent(nodeId)}`);
}

// Ask Figma for export URLs without downloading the image bytes here.
async function getImageUrls(nodeIds, format = 'png', scale = 1) {
  // Support either one node ID or an array, then encode the query parameters safely.
  const ids = Array.isArray(nodeIds) ? nodeIds.join(',') : nodeIds;
  const res = await figmaRequest(`/v1/images/${FILE_KEY}?ids=${encodeURIComponent(ids)}&format=${format}&scale=${scale}`);
  return res.images;
}

// Other design scripts can reuse these helpers without running the CLI branch.
module.exports = {
  listFrames,
  getNode,
  getImageUrls,
  FILE_KEY
};

// CLI Support
if (require.main === module) {
  const cmd = process.argv[2] || 'frames';
  // Select the CLI action from the first argument; frames is the default action.
  if (cmd === 'frames') {
    listFrames().then(frames => {
      console.log(`\n=== Figma File: NovalCast📖 (${FILE_KEY}) ===`);
      // Print a compact frame listing; missing bounding boxes remain explicitly unknown.
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
