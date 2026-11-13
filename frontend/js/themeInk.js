// Calculate an animated clipping path that reveals the new theme like flowing ink.
(function initializeThemeInk(window, document) {
  'use strict';

  const DURATION = 1900;
  const root = document.documentElement;
  let cachedField;

  // Produce repeatable pseudo-random values so each calculated field stays consistent.
  function random(seed) {
    const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
    return value - Math.floor(value);
  }

  // Advect a diagonal boundary through nested vortices. Thresholding this field
  // produces folded ribbons and detached droplets, rather than a translated edge.
  // Cache a reduced-resolution flow field for the current viewport to limit animation work.
  function createField() {
    const viewWidth = window.innerWidth;
    const viewHeight = window.innerHeight;
    if (cachedField?.viewWidth === viewWidth && cachedField?.viewHeight === viewHeight) return cachedField;
    const resolution = Math.min(1, 420 / Math.max(viewWidth, viewHeight));
    const width = Math.max(2, Math.round(viewWidth * resolution));
    const height = Math.max(2, Math.round(viewHeight * resolution));
    const unit = Math.min(width, height);
    const layers = [];
    for (const [layer, spacing] of [.14, .065, .03].entries()) {
      const rows = Math.ceil(height / unit / spacing) + 4;
      const cols = Math.ceil(width / unit / spacing) + 4;
      const vortices = [];
      for (let row = -2; row < rows - 2; row++) {
        for (let col = -2; col < cols - 2; col++) {
          const seed = row * 157 + col * 313 + layer * 1993;
          vortices.push({
            x: (col + .2 + random(seed) * .6) * spacing,
            y: (row + .2 + random(seed + 17) * .6) * spacing,
            radius: spacing * (.52 + random(seed + 31) * .18),
            spin: (random(seed + 67) > .5 ? 1 : -1) * [4.2, 4.8, 3.2][layer],
          });
        }
      }
      layers.push({ spacing, rows, cols, vortices });
    }
    const count = width * height;
    const boundary = new Float32Array(count);
    let min = Infinity;
    let max = -Infinity;
    for (let y = 0, index = 0; y < height; y++) {
      for (let x = 0; x < width; x++, index++) {
        const startX = x / unit;
        const startY = y / unit;
        let px = startX;
        let py = startY;
        for (let layerIndex = 0; layerIndex < layers.length; layerIndex++) {
          const layer = layers[layerIndex];
          const cellX = Math.floor(px / layer.spacing) + 2;
          const cellY = Math.floor(py / layer.spacing) + 2;
          for (let row = Math.max(0, cellY - 2); row <= Math.min(layer.rows - 1, cellY + 2); row++) {
            for (let col = Math.max(0, cellX - 2); col <= Math.min(layer.cols - 1, cellX + 2); col++) {
              const vortex = layer.vortices[row * layer.cols + col];
              const dx = px - vortex.x;
              const dy = py - vortex.y;
              const distance = (dx * dx + dy * dy) / (vortex.radius * vortex.radius);
              if (distance > 4) continue;
              const angle = vortex.spin * Math.exp(-distance * 1.7);
              const cosine = Math.cos(angle);
              const sine = Math.sin(angle);
              px = vortex.x + dx * cosine - dy * sine;
              py = vortex.y + dx * sine + dy * cosine;
            }
          }
        }
        const value = px * unit / width - .32 * py * unit / height;
        boundary[index] = value;
        min = Math.min(min, value);
        max = Math.max(max, value);
      }
    }
    cachedField = { viewWidth, viewHeight, width, height, boundary, min, max };
    return cachedField;
  }

  // Build a supported clipping controller; callers can start it or clean it up.
  function prepare() {
    if (!window.CSS?.supports('clip-path', 'path(evenodd, "M0 0H1V1Z")')) {
      throw new Error('Fluid clipping is unavailable');
    }
    const field = createField();
    const columns = field.width + 2;
    const rows = field.height + 2;
    const values = new Float32Array(columns * rows).fill(-2);
    for (let y = 0; y < field.height; y++) {
      for (let x = 0; x < field.width; x++) {
        values[(y + 1) * columns + x + 1] = (field.boundary[y * field.width + x] - field.min) / (field.max - field.min);
      }
    }
    const stepX = field.viewWidth / (field.width - 1);
    const stepY = field.viewHeight / (field.height - 1);
    // Marching squares yields closed contours, including detached droplets and
    // holes. The even-odd path can clip a snapshot directly, with no SVG resource
    // lookup or image filter in the browser's separate view-transition layer.
    const segments = [[], [[3, 0]], [[0, 1]], [[3, 1]], [[1, 2]], [[3, 0], [1, 2]], [[0, 2]], [[3, 2]], [[2, 3]], [[0, 2]], [[0, 1], [2, 3]], [[1, 2]], [[3, 1]], [[0, 1]], [[3, 0]], []];
    // Convert the field threshold into closed curves that define the moving reveal edge.
    function contour(front) {
      const nodes = new Map();
      function edge(x, y, side, a, b, c, d) {
        let column = x;
        let row = y;
        let first;
        let second;
        const horizontal = side === 0 || side === 2;
        if (side === 0) { first = a; second = b; }
        else if (side === 1) { column++; first = b; second = c; }
        else if (side === 2) { row++; first = d; second = c; }
        else { first = a; second = d; }
        const id = (row * columns + column) * 2 + (horizontal ? 0 : 1);
        if (!nodes.has(id)) {
          const fraction = Math.max(0, Math.min(1, (front - first) / (second - first)));
          nodes.set(id, {
            x: (column - 1 + (horizontal ? fraction : 0)) * stepX,
            y: (row - 1 + (horizontal ? 0 : fraction)) * stepY,
            links: [],
          });
        }
        return id;
      }
      for (let y = 0; y < rows - 1; y++) {
        for (let x = 0; x < columns - 1; x++) {
          const index = y * columns + x;
          const a = values[index];
          const b = values[index + 1];
          const c = values[index + columns + 1];
          const d = values[index + columns];
          const type = (a > front ? 1 : 0) | (b > front ? 2 : 0) | (c > front ? 4 : 0) | (d > front ? 8 : 0);
          for (const [from, to] of segments[type]) {
            const first = edge(x, y, from, a, b, c, d);
            const second = edge(x, y, to, a, b, c, d);
            nodes.get(first).links.push(second);
            nodes.get(second).links.push(first);
          }
        }
      }
      const visited = new Set();
      const paths = [];
      const coordinate = (a, b) => `${((a.x + b.x) / 2).toFixed(1)} ${((a.y + b.y) / 2).toFixed(1)}`;
      for (const [start] of nodes) {
        if (visited.has(start)) continue;
        const points = [];
        let current = start;
        let previous = -1;
        while (!visited.has(current)) {
          visited.add(current);
          const node = nodes.get(current);
          points.push(node);
          const next = node.links.find(id => id !== previous);
          if (next === undefined) break;
          previous = current;
          current = next;
        }
        if (points.length < 3) continue;
        const path = [`M${coordinate(points[points.length - 1], points[0])}`];
        points.forEach((point, i) => path.push(`Q${point.x.toFixed(1)} ${point.y.toFixed(1)} ${coordinate(point, points[(i + 1) % points.length])}`));
        paths.push(path.join(' ') + 'Z');
      }
      return paths.length ? `path(evenodd, "${paths.join(' ')}")` : 'inset(0 0 0 100%)';
    }
    let frame;
    let stopped = false;
    let startedAt;

    // Turn animation progress into the CSS clipping path used by the incoming theme snapshot.
    function draw(progress) {
      // Fast arrival from the upper right, then a slower liquid tail at the left.
      const eased = 1 - Math.pow(1 - progress, 2.1);
      const front = 1.035 - eased * 1.07;
      const clip = progress === 0 ? 'inset(0 0 0 100%)' : progress === 1 ? 'inset(0)' : contour(front);
      root.style.setProperty('--nc-theme-ink-clip', clip);
    }

    // Stop animation frames and remove the temporary CSS mask.
    function cleanup() {
      stopped = true;
      window.cancelAnimationFrame(frame);
      root.style.removeProperty('--nc-theme-ink-clip');
    }

    // The incoming snapshot must be fully masked before the browser exposes it.
    try { draw(0); } catch (error) { cleanup(); throw error; }
    return {
      duration: DURATION,
      // Advance the reveal using the transition animation clock, with a frame-time fallback.
      start(complete, fail) {
        const clock = document.getAnimations?.().find(animation => animation.animationName === 'nc-theme-ink-sweep');
        let previousProgress = -1;
        const tick = time => {
          if (stopped) return;
          startedAt ??= time;
          const elapsed = clock?.currentTime ?? (time - startedAt);
          const progress = Math.min(1, Number(elapsed) / DURATION);
          try {
            if (progress !== previousProgress) draw(progress);
            previousProgress = progress;
          } catch { fail(); return; }
          if (progress === 1) complete();
          else frame = window.requestAnimationFrame(tick);
        };
        frame = window.requestAnimationFrame(tick);
      },
      cleanup,
    };
  }

  window.NovelCastThemeInk = Object.freeze({ prepare });
  const warm = () => {
    if (!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches && typeof document.startViewTransition === 'function') createField();
  };
  document.addEventListener('DOMContentLoaded', () => {
    if (window.requestIdleCallback) window.requestIdleCallback(warm, { timeout: 2000 });
    else window.setTimeout(warm, 500);
  }, { once: true });
})(window, document);
