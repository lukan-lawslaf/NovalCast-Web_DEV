// Check theme transitions in real browsers across screen sizes using a local test server.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const express = require('../backend/node_modules/express');
const { chromium, firefox } = require('playwright');
const { PNG } = require('../node_modules/playwright-core/lib/utilsBundle.js');

// A blank transition can still update localStorage and dispatch all its events.
// Measure the displayed pixels while the transition runs, without freezing it.
function dominantColorFraction({ data, width, height }) {
  const histogram = new Uint32Array(4096);
  let sampled = 0;
  let largest = 0;
  for (let y = 8; y < height - 8; y += 4) {
    for (let x = 8; x < width - 8; x += 4) {
      const offset = (y * width + x) * 4;
      const bucket = ((data[offset] >> 4) << 8) | ((data[offset + 1] >> 4) << 4) | (data[offset + 2] >> 4);
      largest = Math.max(largest, ++histogram[bucket]);
      sampled++;
    }
  }
  return largest / sampled;
}

function themeMixture(image, before, after) {
  assert.equal(image.width, before.width);
  assert.equal(image.height, before.height);
  let eligible = 0;
  let oldPixels = 0;
  let newPixels = 0;
  for (let y = 8; y < image.height - 8; y += 4) {
    for (let x = 8; x < image.width - 8; x += 4) {
      const i = (y * image.width + x) * 4;
      const distance = (a, b) => Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]);
      if (distance(before.data, after.data) < 90) continue;
      eligible++;
      if (distance(image.data, before.data) < 45) oldPixels++;
      if (distance(image.data, after.data) < 45) newPixels++;
    }
  }
  assert.ok(eligible > 100, 'the two theme baselines must have visibly different pixels');
  return { old: oldPixels / eligible, new: newPixels / eligible };
}

function fixtureColors({ data, width, height }) {
  let red = 0;
  let blue = 0;
  let count = 0;
  for (let y = 8; y < height - 8; y += 4) {
    for (let x = 8; x < width - 8; x += 4) {
      const i = (y * width + x) * 4;
      if (data[i] > 220 && data[i + 1] < 40 && data[i + 2] < 40) red++;
      if (data[i] < 40 && data[i + 1] < 40 && data[i + 2] > 220) blue++;
      count++;
    }
  }
  return { red: red / count, blue: blue / count };
}

function systemFirefoxPath() {
  if (process.env.NOVELCAST_FIREFOX_PATH) return process.env.NOVELCAST_FIREFOX_PATH;
  if (process.platform !== 'win32') return '';
  const regular = 'C:/Program Files/Mozilla Firefox/firefox.exe';
  if (fs.existsSync(regular)) return regular;
  try {
    // The Microsoft Store installs Firefox in a versioned, non-enumerable
    // WindowsApps directory. A running Firefox exposes its executable path.
    return execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
      '(Get-Process -Name firefox -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*WindowsApps*Mozilla.Firefox*" } | Select-Object -First 1 -ExpandProperty Path)'],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], windowsHide: true, timeout: 5000 }).trim();
  } catch {
    return '';
  }
}

const browsers = [
  { name: 'firefox-system', engine: firefox, channel: 'moz-firefox', executablePath: systemFirefoxPath() },
  { name: 'firefox', engine: firefox, executablePath: path.join(process.env.LOCALAPPDATA || '', 'ms-playwright/firefox-1543/firefox/firefox.exe') },
  { name: 'chrome', engine: chromium, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' },
].filter(config => !process.env.NOVELCAST_THEME_BROWSER || process.env.NOVELCAST_THEME_BROWSER === config.name);
const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
].filter(viewport => !process.env.NOVELCAST_THEME_SMOKE || viewport.name === 'desktop');

test('theme changes keep page content visible during the transition', { timeout: 300000 }, async t => {
  const app = express();
  app.get('/js/env.js', (req, res) => res.type('js').send('window.__ENV__ = {};'));
  app.get('/env.json', (req, res) => res.json({}));
  app.use(express.static(path.resolve(__dirname, '../frontend')));
  const server = await new Promise(resolve => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  t.after(() => new Promise(resolve => server.close(resolve)));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const response = await fetch(origin);
  assert.equal(response.status, 200, 'the isolated frontend server must respond');

  for (const config of browsers) {
    if (!fs.existsSync(config.executablePath)) {
      await t.test(config.name, { skip: `browser executable missing: ${config.executablePath}` }, () => {});
      continue;
    }
    await t.test(config.name, async t => {
      const browser = await config.engine.launch({ executablePath: config.executablePath, ...(config.channel ? { channel: config.channel } : {}), headless: true });
      t.after(() => browser.close());
      for (const viewport of viewports) {
        await t.test(viewport.name, async t => {
          const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, reducedMotion: 'no-preference' });
          try {
            await context.route('**/*', route => {
              const url = new URL(route.request().url());
              if (url.origin === origin) return route.continue();
              if (url.hostname === 'cdn.tailwindcss.com') {
                return route.fulfill({ contentType: 'text/javascript', body: 'window.tailwind = {};' });
              }
              return route.fulfill({ contentType: route.request().resourceType() === 'stylesheet' ? 'text/css' : 'text/plain', body: '' });
            });
            const page = await context.newPage();
            const pageErrors = [];
            const firefoxClips = [];
            page.on('pageerror', error => pageErrors.push(error.message));
            if (config.name.startsWith('firefox')) {
              t.diagnostic('Firefox screenshots capture the final DOM during native view transitions (Mozilla bug 2008417); native lifecycle and clip values are checked separately, and the same clip is rendered on an ordinary DOM fixture. Native Firefox compositor output remains unverified by screenshots.');
            }
            for (const route of process.env.NOVELCAST_THEME_SMOKE ? ['home'] : ['home', 'landing']) {
              await page.goto(`${origin}/#/${route}`, { waitUntil: 'networkidle' });
              const toggle = page.locator('[data-theme-toggle]:visible').first();
              await toggle.waitFor();
              for (const target of ['light', 'dark']) {
                // Start with a known theme so both switch directions are checked.
                await page.evaluate(theme => window.NovelCastTheme.setTheme(theme), target === 'light' ? 'dark' : 'light');
                await page.waitForTimeout(250);
                const before = PNG.sync.read(await page.screenshot({ animations: 'allow' }));
                const clickStarted = await page.evaluate(() => performance.now());
                await toggle.click();
                const clickFinished = await page.evaluate(() => performance.now());
                const samples = [];
                for (const delay of [0, 25, 25, 25, 25]) {
                  await page.waitForTimeout(delay);
                  const state = await page.evaluate(() => ({
                    now: performance.now(),
                    inTransition: document.documentElement.hasAttribute('data-theme-transition'),
                    animation: document.getAnimations().find(animation => animation.animationName === 'nc-theme-ink-sweep')?.currentTime ?? null,
                    clip: getComputedStyle(document.documentElement).getPropertyValue('--nc-theme-ink-clip').trim(),
                    pseudoClip: getComputedStyle(document.documentElement, '::view-transition-new(root)').clipPath,
                  }));
                  const screenshot = await page.screenshot({ animations: 'allow' });
                  const afterCapture = await page.evaluate(() => ({
                    now: performance.now(),
                    inTransition: document.documentElement.hasAttribute('data-theme-transition'),
                    animation: document.getAnimations().find(animation => animation.animationName === 'nc-theme-ink-sweep')?.currentTime ?? null,
                  }));
                  samples.push({ inTransition: state.inTransition && afterCapture.inTransition, screenshot, state, afterCapture });
                }
                await page.waitForFunction(() => !document.documentElement.hasAttribute('data-theme-transition'));
                assert.equal(await page.evaluate(() => window.NovelCastTheme.getTheme()), target);
                assert.equal(await page.evaluate(() => document.documentElement.style.getPropertyValue('--nc-theme-ink-clip')), '',
                  `${config.name}/${viewport.name}/${route}/${target}: the temporary clip remains after the transition`);
                await page.waitForTimeout(250);
                const after = PNG.sync.read(await page.screenshot({ animations: 'allow' }));
                const beforeDominant = dominantColorFraction(before);
                const afterDominant = dominantColorFraction(after);
                const threshold = Math.min(.97, Math.max(.94, beforeDominant + .1, afterDominant + .1));
                let mixedFrames = 0;
                const mixtures = [];
                const activeClips = [];
                for (const sample of samples) {
                  const image = PNG.sync.read(sample.screenshot);
                  const dominant = dominantColorFraction(image);
                  assert.ok(dominant < threshold,
                    `${config.name}/${viewport.name}/${route}/${target}: blank-looking frame ${(dominant * 100).toFixed(1)}% one color (threshold ${(threshold * 100).toFixed(1)}%; before ${(beforeDominant * 100).toFixed(1)}%, after ${(afterDominant * 100).toFixed(1)}%; transition ${sample.inTransition})`);
                  const mix = themeMixture(image, before, after);
                  const clock = time => time === null ? 'none' : Math.round(time);
                  mixtures.push(`${sample.inTransition ? 'active' : 'settled'}@${Math.round(sample.state.now - clickStarted)}-${Math.round(sample.afterCapture.now - clickStarted)}ms/clock:${clock(sample.state.animation)}-${clock(sample.afterCapture.animation)}:${mix.old.toFixed(2)}/${mix.new.toFixed(2)}`);
                  // Screenshots can take hundreds of milliseconds on desktop,
                  // so a captured intermediate may show only an early or late
                  // part of the wipe. Both themes must still occupy visible area.
                  if (sample.inTransition && mix.old > .05 && mix.new > .05) mixedFrames++;
                  if (sample.inTransition && sample.state.clip) activeClips.push(sample.state);
                }
                t.diagnostic(`${route}/${target}: click ${Math.round(clickFinished - clickStarted)}ms; old/new proportions ${mixtures.join(', ')}`);
                if (config.name.startsWith('firefox')) {
                  assert.ok(activeClips.length >= 2 && new Set(activeClips.map(value => value.clip)).size >= 2,
                    `${config.name}/${viewport.name}/${route}/${target}: transition did not update the live clip while active`);
                  assert.ok(activeClips.some(value => value.pseudoClip && value.pseudoClip !== 'none'),
                    `${config.name}/${viewport.name}/${route}/${target}: transition pseudo-element did not resolve the live clip`);
                  firefoxClips.push(...activeClips);
                } else {
                  assert.ok(mixedFrames > 0,
                    `${config.name}/${viewport.name}/${route}/${target}: no active frame visibly mixed the old and new themes (old/new proportions: ${mixtures.join(', ')})`);
                }
              }
            }
            assert.deepEqual(pageErrors, [], 'no uncaught page errors');
            if (config.name.startsWith('firefox')) {
              // Exercise the exact clip values produced during the real transition
              // on ordinary DOM content, which Firefox can screenshot reliably.
              await page.setContent('<!doctype html><style>html,body{margin:0;width:100%;height:100%;background:red}#incoming{position:fixed;inset:0;background:blue;clip-path:var(--nc-theme-ink-clip)}</style><div id="incoming"></div>');
              const candidates = firefoxClips.sort((a, b) => Math.abs((a.animation || 0) - 650) - Math.abs((b.animation || 0) - 650));
              let renderedMixture = false;
              for (const candidate of candidates) {
                const supported = await page.evaluate(clip => {
                  document.documentElement.style.setProperty('--nc-theme-ink-clip', clip);
                  return CSS.supports('clip-path', clip) && getComputedStyle(document.getElementById('incoming')).clipPath !== 'none';
                }, candidate.clip);
                assert.ok(supported, `${config.name}/${viewport.name}: browser could not apply the production clip to regular content`);
                const colors = fixtureColors(PNG.sync.read(await page.screenshot()));
                if (colors.red > .15 && colors.blue > .15) {
                  renderedMixture = true;
                  t.diagnostic(`ordinary DOM rendered the production clip with ${(colors.red * 100).toFixed(1)}% old and ${(colors.blue * 100).toFixed(1)}% new pixels`);
                  break;
                }
              }
              assert.ok(renderedMixture, `${config.name}/${viewport.name}: no active production clip visibly revealed both fixture layers`);
            }
          } finally {
            await context.close();
          }
        });
      }
    });
  }
});
