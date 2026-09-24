const fs = require('fs');
const path = require('path');

// Generate client environment config from .env
function generateEnv() {
  const envPath = path.join(__dirname, '../.env');
  const outJsPath = path.join(__dirname, '../frontend/js/env.js');
  const outJsonPath = path.join(__dirname, '../frontend/env.json');

  const envConfig = {};

  if (fs.existsSync(envPath)) {
    const raw = fs.readFileSync(envPath, 'utf8');
    const lines = raw.split(/\r?\n/);

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx > -1) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim();

        // Safely extract client-needed Supabase keys
        if (key.toLowerCase() === 'supabase_url') {
          envConfig.SUPABASE_URL = val;
        } else if (key.toLowerCase() === 'supabase_api' || key.toLowerCase() === 'supabase_anon_key') {
          envConfig.SUPABASE_ANON_KEY = val;
        }
      }
    }
  }

  // Write JS loader
  const jsContent = `// Auto-generated from .env by scripts/generate-env.js. DO NOT EDIT OR COMMIT.\nwindow.__ENV__ = ${JSON.stringify(envConfig, null, 2)};\n`;
  fs.writeFileSync(outJsPath, jsContent, 'utf8');

  // Write JSON fallback
  fs.writeFileSync(outJsonPath, JSON.stringify(envConfig, null, 2), 'utf8');

  console.log('[generate-env] Successfully generated frontend/js/env.js and frontend/env.json from .env');
}

generateEnv();
