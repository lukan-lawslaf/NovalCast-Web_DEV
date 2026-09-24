/**
 * PixelCard Component - Vanilla JS implementation from React Bits
 * Canvas-based reactive pixel animation wrapper
 */
(function () {
  class Pixel {
    constructor(canvas, context, x, y, color, speed, delay) {
      this.width = canvas.width;
      this.height = canvas.height;
      this.ctx = context;
      this.x = x;
      this.y = y;
      this.color = color;
      this.speed = this.getRandomValue(0.1, 0.9) * speed;
      this.size = 0;
      this.sizeStep = Math.random() * 0.4;
      this.minSize = 0.5;
      this.maxSizeInteger = 2.4;
      this.maxSize = this.getRandomValue(this.minSize, this.maxSizeInteger);
      this.delay = delay;
      this.counter = 0;
      this.counterStep = Math.random() * 4 + (this.width + this.height) * 0.01;
      this.isIdle = false;
      this.isReverse = false;
      this.isShimmer = false;
    }

    getRandomValue(min, max) {
      return Math.random() * (max - min) + min;
    }

    draw() {
      const centerOffset = this.maxSizeInteger * 0.5 - this.size * 0.5;
      this.ctx.fillStyle = this.color;
      this.ctx.fillRect(this.x + centerOffset, this.y + centerOffset, this.size, this.size);
    }

    appear() {
      this.isIdle = false;
      if (this.counter <= this.delay) {
        this.counter += this.counterStep;
        return;
      }
      if (this.size >= this.maxSize) {
        this.isShimmer = true;
      }
      if (this.isShimmer) {
        this.shimmer();
      } else {
        this.size += this.sizeStep;
      }
      this.draw();
    }

    disappear() {
      this.isShimmer = false;
      this.counter = 0;
      if (this.size <= 0) {
        this.isIdle = true;
        return;
      } else {
        this.size -= 0.1;
      }
      this.draw();
    }

    shimmer() {
      if (this.size >= this.maxSize) {
        this.isReverse = true;
      } else if (this.size <= this.minSize) {
        this.isReverse = false;
      }
      if (this.isReverse) {
        this.size -= this.speed;
      } else {
        this.size += this.speed;
      }
    }
  }

  function getEffectiveSpeed(value, reducedMotion) {
    const min = 0;
    const max = 100;
    const throttle = 0.001;
    const parsed = parseInt(value, 10);

    if (parsed <= min || reducedMotion) {
      return min;
    } else if (parsed >= max) {
      return max * throttle;
    } else {
      return parsed * throttle;
    }
  }

  const VARIANTS = {
    default: {
      gap: 5,
      speed: 35,
      colors: '#f8fafc,#f1f5f9,#cbd5e1'
    },
    gold: {
      gap: 6,
      speed: 30,
      colors: '#f5d77f,#ffe088,#f3d182,#d4af37,#e1c46e'
    },
    blue: {
      gap: 8,
      speed: 25,
      colors: '#e0f2fe,#7dd3fc,#0ea5e9'
    },
    pink: {
      gap: 6,
      speed: 80,
      colors: '#fecdd3,#fda4af,#e11d48'
    }
  };

  class PixelCardInstance {
    constructor(container, options = {}) {
      this.container = container;
      this.variant = options.variant || 'gold';
      const variantCfg = VARIANTS[this.variant] || VARIANTS.gold;

      this.gap = options.gap ?? variantCfg.gap;
      this.speed = options.speed ?? variantCfg.speed;
      this.colors = options.colors ?? variantCfg.colors;
      this.noFocus = options.noFocus ?? false;

      this.reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.pixels = [];
      this.animationFrame = null;
      this.timePrevious = performance.now();

      this.init();
    }

    init() {
      // Create canvas if not present
      let canvas = this.container.querySelector('canvas.pixel-canvas');
      if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.className = 'pixel-canvas';
        this.container.insertBefore(canvas, this.container.firstChild);
      }
      this.canvas = canvas;

      this.initPixels();

      this.onMouseEnter = () => this.handleAnimation('appear');
      this.onMouseLeave = () => this.handleAnimation('disappear');
      this.onFocus = (e) => {
        if (e.currentTarget.contains(e.relatedTarget)) return;
        this.handleAnimation('appear');
      };
      this.onBlur = (e) => {
        if (e.currentTarget.contains(e.relatedTarget)) return;
        this.handleAnimation('disappear');
      };

      this.container.addEventListener('mouseenter', this.onMouseEnter);
      this.container.addEventListener('mouseleave', this.onMouseLeave);
      if (!this.noFocus) {
        this.container.setAttribute('tabindex', '0');
        this.container.addEventListener('focus', this.onFocus);
        this.container.addEventListener('blur', this.onBlur);
      }

      this.resizeObserver = new ResizeObserver(() => {
        this.initPixels();
      });
      this.resizeObserver.observe(this.container);
    }

    initPixels() {
      if (!this.container || !this.canvas) return;

      const rect = this.container.getBoundingClientRect();
      const width = Math.floor(rect.width) || 300;
      const height = Math.floor(rect.height) || 200;
      const ctx = this.canvas.getContext('2d');
      if (!ctx) return;

      this.canvas.width = width;
      this.canvas.height = height;
      this.canvas.style.width = `${width}px`;
      this.canvas.style.height = `${height}px`;

      const colorsArray = this.colors.split(',');
      const pxs = [];
      const gapVal = parseInt(this.gap, 10);

      for (let x = 0; x < width; x += gapVal) {
        for (let y = 0; y < height; y += gapVal) {
          const color = colorsArray[Math.floor(Math.random() * colorsArray.length)];
          const dx = x - width / 2;
          const dy = y - height / 2;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const delay = this.reducedMotion ? 0 : distance;

          pxs.push(new Pixel(this.canvas, ctx, x, y, color, getEffectiveSpeed(this.speed, this.reducedMotion), delay));
        }
      }
      this.pixels = pxs;
    }

    doAnimate(fnName) {
      this.animationFrame = requestAnimationFrame(() => this.doAnimate(fnName));
      const timeNow = performance.now();
      const timePassed = timeNow - this.timePrevious;
      const timeInterval = 1000 / 60;

      if (timePassed < timeInterval) return;
      this.timePrevious = timeNow - (timePassed % timeInterval);

      const ctx = this.canvas ? this.canvas.getContext('2d') : null;
      if (!ctx || !this.canvas) return;

      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      let allIdle = true;
      for (let i = 0; i < this.pixels.length; i++) {
        const pixel = this.pixels[i];
        pixel[fnName]();
        if (!pixel.isIdle) {
          allIdle = false;
        }
      }
      if (allIdle) {
        cancelAnimationFrame(this.animationFrame);
      }
    }

    handleAnimation(name) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = requestAnimationFrame(() => this.doAnimate(name));
    }

    destroy() {
      cancelAnimationFrame(this.animationFrame);
      if (this.resizeObserver) this.resizeObserver.disconnect();
      this.container.removeEventListener('mouseenter', this.onMouseEnter);
      this.container.removeEventListener('mouseleave', this.onMouseLeave);
      this.container.removeEventListener('focus', this.onFocus);
      this.container.removeEventListener('blur', this.onBlur);
    }
  }

  window.PixelCard = {
    init: function (container, options) {
      return new PixelCardInstance(container, options);
    },
    autoInit: function (scope = document) {
      const elements = scope.querySelectorAll('.pixel-card');
      elements.forEach(el => {
        if (!el._pixelCardInstance) {
          const variant = el.dataset.variant || 'gold';
          el._pixelCardInstance = new PixelCardInstance(el, { variant });
        }
      });
    }
  };
})();
