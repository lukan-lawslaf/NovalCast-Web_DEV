// Optional motion for the Experience route. The shelf is usable before GSAP loads.
window.NovelCastShelfMotion = (function () {
  let gsapRequest;

  function loadGsap() {
    gsapRequest ??= new Promise(resolve => {
      const script = document.createElement('script');
      script.src = 'js/vendor/gsap.min.js';
      script.onload = () => resolve(window.gsap);
      script.onerror = () => {
        gsapRequest = null;
        script.remove();
        resolve(null);
      };
      document.head.append(script);
    });
    return gsapRequest;
  }

  function playCurtain(curtain, onStart, onOpen) {
    if (typeof curtain.animate !== 'function') return null;
    // Keep the fabric on the compositor while the browser lays out the shelf underneath.
    curtain.hidden = false;
    let panels = [];
    let firstFrame;
    let frame;

    function open(time) {
      firstFrame ??= time;
      // Give the closed curtain a short beat to paint before moving its textured layers.
      if (time - firstFrame < 72) {
        frame = requestAnimationFrame(open);
        return;
      }
      panels = Array.from(curtain.children, (panel, index) => panel.animate([
        { transform: 'translateX(0) scaleX(1)' },
        { transform: `translateX(${index === 0 ? -100 : 100}%) scaleX(0.84)` }
      ], { duration: 720, easing: 'cubic-bezier(.37, 0, .63, 1)', fill: 'both' }));
      panels[0].addEventListener('finish', finish, { once: true });
      onStart();
    }

    function closeCurtain() {
      curtain.hidden = true;
      for (const panel of panels) panel.cancel();
    }
    function finish() {
      closeCurtain();
      onOpen();
    }

    frame = requestAnimationFrame(open);
    return () => {
      cancelAnimationFrame(frame);
      panels[0]?.removeEventListener('finish', finish);
      closeCurtain();
    };
  }

  function playEntrance(gsap, root, elapsed) {
    const title = root.querySelector('#exs-page-title');
    const captions = root.querySelectorAll('.exs-hero-copy p, .exs-hero-feature');
    const shelfHeading = root.querySelector('.exs-collection-heading');
    const reveal = { ease: 'power3.out', clearProps: 'transform,opacity' };
    const timeline = gsap.timeline();
    timeline.from(title, { ...reveal, y: 14, opacity: 0.56, duration: 0.49 }, 0.13);
    timeline.from(captions, { ...reveal, y: 8, opacity: 0.62, duration: 0.4, stagger: 0.05 }, 0.29);
    timeline.from(shelfHeading, { ...reveal, y: 6, opacity: 0.72, duration: 0.32 }, 0.37);
    return timeline.time(elapsed);
  }

  function revealCards(gsap) {
    const playing = new Set();
    const observer = new IntersectionObserver((entries, currentObserver) => {
      const visible = [];
      for (const entry of entries) {
        if (!entry.isIntersecting || entry.target.hidden || !entry.target.isConnected) continue;
        currentObserver.unobserve(entry.target);
        if (!entry.target.contains(document.activeElement)) visible.push(entry.target);
      }
      if (!visible.length) return;
      const tween = gsap.from(visible, {
        y: 13,
        opacity: 0.7,
        duration: 0.43,
        stagger: { amount: 0.18 },
        ease: 'power2.out',
        clearProps: 'transform,opacity',
        onComplete: () => playing.delete(tween)
      });
      playing.add(tween);
    }, { rootMargin: '0px 0px 40px' });

    return {
      observe(items) {
        this.clear();
        for (const item of items) {
          if (!item.hidden) observer.observe(item);
        }
      },
      clear() {
        observer.disconnect();
        observer.takeRecords();
        for (const tween of playing) tween.revert();
        playing.clear();
      }
    };
  }

  function tiltCovers(gsap, list) {
    const controller = new AbortController();
    const listener = { signal: controller.signal };
    const covers = new Map();
    let activeStage;

    function release() {
      if (!activeStage) return;
      const state = covers.get(activeStage);
      for (const move of state.tweens) move(0);
      state.cover.style.removeProperty('--exs-light-x');
      state.cover.style.removeProperty('--exs-light-y');
      activeStage = null;
    }

    list.addEventListener('pointermove', event => {
      if (event.pointerType === 'touch') return;
      const stage = event.target.closest('.exs-cover-stage');
      if (stage !== activeStage) release();
      if (!stage) return;
      if (!covers.has(stage)) {
        const cover = stage.querySelector('.exs-cover');
        const options = { duration: 0.42, ease: 'power3.out' };
        const tweens = ['rotationX', 'rotationY', 'y'].map(property => gsap.quickTo(cover, property, options));
        covers.set(stage, { cover, tweens });
      }
      activeStage = stage;
      const { cover, tweens: [pitch, yaw, lift] } = covers.get(stage);
      const bounds = stage.getBoundingClientRect();
      const x = gsap.utils.clamp(0, 1, (event.clientX - bounds.left) / bounds.width);
      const y = gsap.utils.clamp(0, 1, (event.clientY - bounds.top) / bounds.height);
      pitch((0.5 - y) * 9);
      yaw((x - 0.5) * 12);
      lift(-5);
      cover.style.setProperty('--exs-light-x', `${x * 100}%`);
      cover.style.setProperty('--exs-light-y', `${y * 100}%`);
    }, { ...listener, passive: true });

    list.addEventListener('pointerout', event => {
      if (activeStage && !activeStage.contains(event.relatedTarget)) release();
    }, listener);

    function clear() {
      release();
      for (const { cover, tweens } of covers.values()) {
        for (const move of tweens) move.tween.kill();
        gsap.set(cover, { clearProps: 'transform' });
      }
      covers.clear();
    }

    return {
      clear,
      destroy() {
        clear();
        controller.abort();
      }
    };
  }

  function mount(root, list, { reducedMotion, supportsTilt }) {
    const controller = new AbortController();
    const listener = { signal: controller.signal };
    const curtain = root.querySelector('.exs-hero-curtain');
    let entrance;
    let cards;
    let tilt;
    let gsap;
    let openedAt;
    let stopCurtain = reducedMotion.matches ? null : playCurtain(curtain, startEntrance, observeCards);

    function startEntrance() {
      openedAt = performance.now();
      if (gsap) entrance = playEntrance(gsap, root, 0);
    }

    function observeCards() {
      if (curtain.hidden) cards?.observe(list.children);
    }

    function refresh() {
      tilt?.clear();
      observeCards();
    }

    function stop() {
      stopCurtain?.();
      stopCurtain = null;
      openedAt = null;
      entrance?.revert();
      cards?.clear();
      tilt?.destroy();
      entrance = cards = tilt = null;
      delete root.dataset.exsTilt;
    }

    async function sync() {
      if (reducedMotion.matches) {
        stop();
        return;
      }
      const library = await loadGsap();
      if (!library || controller.signal.aborted || reducedMotion.matches) return;
      if (!gsap && openedAt != null) {
        const elapsed = (performance.now() - openedAt) / 1000;
        if (elapsed < 0.2) entrance = playEntrance(library, root, elapsed);
      }
      gsap = library;
      if (!cards && typeof IntersectionObserver === 'function') {
        cards = revealCards(gsap);
        observeCards();
      }
      if (supportsTilt.matches && !tilt) {
        root.dataset.exsTilt = '';
        tilt = tiltCovers(gsap, list);
      } else if (!supportsTilt.matches && tilt) {
        tilt.destroy();
        tilt = null;
        delete root.dataset.exsTilt;
      }
    }

    reducedMotion.addEventListener('change', sync, listener);
    supportsTilt.addEventListener('change', sync, listener);
    void sync();
    return {
      refresh,
      destroy() {
        controller.abort();
        stop();
      }
    };
  }

  return { mount };
})();
