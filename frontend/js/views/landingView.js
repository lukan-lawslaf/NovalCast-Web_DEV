window.NovelCastViews = window.NovelCastViews || {};

window.NovelCastViews.landing = {
  render: function () {
    return `
      <!-- NovelCast Focused Cinematic Landing Page (Reference: test.html / animated_hero) -->
      <div class="relative w-full min-h-screen flex flex-col justify-between bg-[#05070A] overflow-hidden select-none">
        
        <!-- Ambient Animated ASCII Art Background (21st.dev) -->
        <div class="absolute inset-0 z-0 pointer-events-none overflow-hidden select-none">
          <video
            class="w-full h-full object-cover opacity-55 mix-blend-screen scale-105 filter brightness-110 contrast-135 transition-opacity duration-1000"
            src="https://assets.21st.dev/ascii-recipes/videos/user_3HdhXqtaGNK6PDvN2DFY8vAT2Sr/aaa3f286-9a3c-491d-ba90-4e016ab73ef1.mp4"
            poster="https://assets.21st.dev/ascii-recipes/thumbnails/user_3HdhXqtaGNK6PDvN2DFY8vAT2Sr/5a8e1637-89e6-4132-8e00-61fbb69fda53.webp"
            autoplay
            loop
            muted
            playsinline
            aria-label="1s1s — animated ASCII art background"
            style="display: block; width: 100%; height: 100%; object-fit: cover;"
          ></video>
          <!-- Cinematic Vignette & Radial Spotlight Blends -->
          <div class="absolute inset-0 bg-gradient-to-b from-[#05070A]/70 via-transparent to-[#05070A]/85"></div>
          <div class="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,transparent_35%,#05070A_85%)]"></div>
        </div>

        <!-- Top Editorial Floating Nav -->
        <header class="relative z-50 w-full px-6 md:px-12 py-5 flex items-center justify-between">
          <a class="flex items-center gap-3 group focus:outline-none cursor-pointer" href="#/landing">
            <img src="logo.svg" alt="NovelCast Logo" class="h-8 w-auto object-contain" />
            <span class="font-serif text-xl tracking-tight font-medium text-white group-hover:text-neutral-200 transition-colors">
              NovelCast
            </span>
          </a>

          <nav class="hidden md:flex items-center gap-8 text-[13px] tracking-wide text-neutral-400 font-normal">
            <a class="hover:text-white transition-colors duration-200" href="#/home">Catalogs</a>
            <a class="hover:text-white transition-colors duration-200" href="#/search">Editions</a>
            <a class="hover:text-white transition-colors duration-200" href="#/book?book=ikigai">Audiobooks</a>
            <a class="hover:text-white transition-colors duration-200" href="#/library">Sanctuary</a>
          </nav>

          <div class="flex items-center gap-5 text-[13px]">
            <a class="text-neutral-300 hover:text-white font-medium transition-colors hidden sm:inline-block" href="#/search">
              Browse All
            </a>
            <a class="bg-white text-black font-semibold px-5 py-2 rounded-full text-xs hover:bg-neutral-200 active:scale-95 transition-all shadow-md shadow-white/10 flex items-center gap-1.5" href="#/home">
              <span>Enter Library</span>
              <span class="text-sm leading-none">→</span>
            </a>
          </div>
        </header>

        <!-- Seductive Minimal Hook -->
        <div class="relative z-30 text-center max-w-xl mx-auto px-4 pt-1 pointer-events-auto">
          <p class="text-[11px] md:text-xs uppercase tracking-[0.32em] text-[#E0C070] font-semibold mb-1.5 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
            Private Press &amp; Voice Sanctuary
          </p>
          <p class="text-sm md:text-base text-neutral-300 font-light tracking-wide leading-relaxed drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]">
            Where stories breathe. Bound for devotion, voiced in quiet reverie.
          </p>
        </div>

        <!-- Giant Watermark Title & 3D Book Parade Stage -->
        <div class="relative flex-1 flex flex-col justify-center items-center w-full px-0 overflow-visible min-h-[480px]">
          <!-- Watermark Background Text -->
          <div class="absolute top-[12%] md:top-[10%] w-full text-center pointer-events-none z-0">
            <h1 class="font-serif text-[19vw] md:text-[18vw] leading-none tracking-normal font-normal text-white/95 drop-shadow-[0_25px_30px_rgba(0,0,0,0.8)] select-none">
              NovelCast
            </h1>
          </div>

          <!-- Parade Stage Container -->
          <div class="parade-stage w-full flex items-end justify-center relative z-20 pt-16 md:pt-24 pb-8 overflow-visible">
            <div class="flex items-end -space-x-16 md:-space-x-22 lg:-space-x-26 pl-16 pr-8 sm:px-0">
              
              <!-- Book 1: Paris Poetry -->
              <div class="book-3d-wrapper opacity-50 hover:opacity-100" onclick="window.NovelCastRouter.navigate('book', { book: 'mist-and-whispers' })" title="Paris Poetry">
                <div class="book-edge-right"></div>
                <div class="book-edge-top"></div>
                <div class="relative w-full h-full rounded-r-[2px] bg-gradient-to-br from-[#df939a] via-[#ce7a85] to-[#9b4a55] text-[#3d1217] p-4 flex flex-col justify-between shadow-2xl overflow-hidden">
                  <div class="cover-crease"></div>
                  <div class="cover-sheen"></div>
                  <span class="text-[8px] uppercase tracking-widest font-semibold opacity-70">Paris Poetry</span>
                  <div class="my-auto">
                    <p class="font-serif italic text-base leading-tight">Petits<br/>Poèmes</p>
                  </div>
                  <span class="text-[8px] tracking-wider opacity-60">Vol. III</span>
                </div>
              </div>

              <!-- Book 2: The Grand Arcade -->
              <div class="book-3d-wrapper opacity-75 hover:opacity-100" onclick="window.NovelCastRouter.navigate('book', { book: 'swords-of-the-son' })" title="The Grand Arcade">
                <div class="book-edge-right"></div>
                <div class="book-edge-top"></div>
                <div class="relative w-full h-full rounded-r-[2px] bg-[#0c1322] border-l-[3px] border-amber-500/40 p-3.5 flex flex-col justify-between shadow-2xl overflow-hidden">
                  <div class="cover-crease"></div>
                  <div class="cover-sheen"></div>
                  <div class="h-full w-full border border-amber-500/30 p-2.5 flex flex-col justify-between relative bg-gradient-to-b from-[#111a2e] to-[#080d17]">
                    <div class="flex justify-between items-center text-[7px] text-amber-300/80 font-mono tracking-widest">
                      <span>EST. 1892</span>
                      <span>NO. 4</span>
                    </div>
                    <div class="text-center my-auto">
                      <div class="w-7 h-7 mx-auto mb-2 border border-amber-400/50 rounded-full flex items-center justify-center text-[10px] text-amber-300">🏛️</div>
                      <h4 class="font-serif text-xs uppercase tracking-widest text-amber-100 font-semibold leading-tight">The Grand<br/>Arcade</h4>
                    </div>
                    <span class="text-[7px] text-amber-400/60 uppercase tracking-wider text-center">Oxford Press</span>
                  </div>
                </div>
              </div>

              <!-- Book 3: The Light Story -->
              <div class="book-3d-wrapper opacity-90 hover:opacity-100" onclick="window.NovelCastRouter.navigate('book', { book: 'white-raven' })" title="The Light Story">
                <div class="book-edge-right"></div>
                <div class="book-edge-top"></div>
                <div class="relative w-full h-full rounded-r-[2px] bg-[#0f172a] border-l-[3px] border-blue-900 p-4 flex flex-col justify-between shadow-2xl overflow-hidden">
                  <div class="cover-crease"></div>
                  <div class="cover-sheen"></div>
                  <div class="flex justify-between items-center text-[8px] uppercase tracking-widest text-blue-300/70">
                    <span>First Edition</span>
                    <span>Vol. II</span>
                  </div>
                  <div class="my-auto space-y-1">
                    <span class="text-[9px] uppercase tracking-widest text-blue-200 block font-light">The</span>
                    <h3 class="font-serif text-lg tracking-wider text-white font-bold leading-tight">LIGHT<br/>STORY</h3>
                    <div class="w-8 h-[1px] bg-blue-400/40 my-2"></div>
                    <p class="text-[9px] text-blue-300/70 font-serif italic">Maxwell</p>
                  </div>
                  <span class="text-[8px] text-neutral-500">London, 1924</span>
                </div>
              </div>

              <!-- Book 4: As a Man Thinketh -->
              <div class="book-3d-wrapper" onclick="window.NovelCastRouter.navigate('book', { book: 'eighty-days' })" title="As a Man Thinketh">
                <div class="book-edge-right"></div>
                <div class="book-edge-top"></div>
                <div class="relative w-full h-full rounded-r-[2px] bg-[#f5f1e8] text-neutral-900 border-l-[3px] border-neutral-400 p-4 flex flex-col justify-between shadow-2xl overflow-hidden">
                  <div class="cover-crease"></div>
                  <div class="cover-sheen"></div>
                  <div class="border-b border-neutral-300 pb-1 text-center">
                    <span class="text-[7px] uppercase tracking-widest font-semibold text-neutral-500 block">
                      The New York Times Bestseller
                    </span>
                  </div>
                  <div class="my-auto text-left py-2">
                    <h3 class="font-serif text-2xl uppercase tracking-wider font-bold text-neutral-950 leading-none mb-1">
                      JAMES<br/>ALLEN
                    </h3>
                    <div class="w-6 h-[1.5px] bg-neutral-900 my-2"></div>
                    <p class="font-serif italic text-xs text-neutral-700">As a Man<br/>Thinketh</p>
                  </div>
                  <span class="text-[8px] uppercase tracking-widest font-semibold text-neutral-500">Classic Edition</span>
                </div>
              </div>

              <!-- Book 5: Featured Centerpiece (Sunshine & Second Chances) -->
              <div class="book-3d-wrapper book-featured" onclick="window.NovelCastRouter.navigate('book', { book: 'ikigai' })" title="Sunshine & Second Chances">
                <div class="book-edge-right !w-[42px]"></div>
                <div class="book-edge-top !h-[42px]"></div>
                <div class="relative w-full h-full rounded-r-[2px] bg-gradient-to-b from-[#FFFDF2] via-[#FDF5D8] to-[#FCEABB] text-[#802D15] p-4 flex flex-col justify-between border-l-[4px] border-[#D4AF37] shadow-2xl overflow-hidden">
                  <div class="cover-crease"></div>
                  <div class="cover-sheen"></div>
                  <div class="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#d97706_1px,transparent_1px)] [background-size:10px_10px]"></div>
                  <div class="relative z-10 text-center border-b border-[#ebd79b] pb-1">
                    <span class="text-[7px] tracking-widest uppercase font-bold text-[#A85A2A] block">
                      The Sunday Times Bestseller
                    </span>
                  </div>
                  <div class="relative z-10 my-auto text-center space-y-0.5">
                    <h2 class="font-serif italic text-2xl md:text-3xl text-[#cf4a21] font-semibold leading-tight drop-shadow-sm">
                      Sunshine
                    </h2>
                    <p class="text-[9px] tracking-[0.25em] font-serif uppercase text-[#8d5e34] font-bold">
                      &amp; SECOND
                    </p>
                    <h3 class="font-serif text-2xl md:text-3xl text-[#dc5523] font-medium leading-none drop-shadow-sm">
                      Chances
                    </h3>
                  </div>
                  <div class="relative z-10 pt-1 flex flex-col items-center">
                    <div class="flex items-center justify-center gap-1.5 mb-1.5">
                      <span class="text-base drop-shadow">🌻</span>
                      <span class="text-xs opacity-80 drop-shadow">🚲</span>
                      <span class="text-base drop-shadow">🌻</span>
                    </div>
                    <span class="font-sans text-[10px] uppercase tracking-wider font-bold text-[#56341f]">
                      Mila Summers
                    </span>
                  </div>
                </div>
              </div>

              <!-- Book 6: Shadows of Time / Shadows & Dust -->
              <div class="book-3d-wrapper opacity-95 hover:opacity-100" onclick="window.NovelCastRouter.navigate('book', { book: 'adorning-the-dark' })" title="Shadows of Time">
                <div class="book-edge-right"></div>
                <div class="book-edge-top"></div>
                <div class="relative w-full h-full rounded-r-[2px] bg-gradient-to-b from-[#181920] via-[#0d0e12] to-black border-l-[3px] border-neutral-700 p-4 flex flex-col justify-between text-neutral-200 shadow-2xl overflow-hidden">
                  <div class="cover-crease"></div>
                  <div class="cover-sheen"></div>
                  <span class="text-[8px] uppercase tracking-widest text-neutral-400">A Candle in the Attic</span>
                  <div class="my-auto space-y-1">
                    <h3 class="font-serif text-lg tracking-[0.2em] text-white uppercase font-light leading-none">SHADOWS</h3>
                    <p class="font-serif italic text-xs text-neutral-400">of time</p>
                    <div class="w-5 h-[1px] bg-neutral-600 mt-2"></div>
                  </div>
                  <span class="text-[9px] uppercase tracking-wider text-neutral-400 font-sans">Rowe</span>
                </div>
              </div>

              <!-- Book 7: Venture -->
              <div class="book-3d-wrapper opacity-95 hover:opacity-100" onclick="window.NovelCastRouter.navigate('book', { book: 'swords-of-the-son' })" title="Venture">
                <div class="book-edge-right"></div>
                <div class="book-edge-top"></div>
                <div class="relative w-full h-full rounded-r-[2px] bg-[#E64A19] text-white border-l-[3px] border-orange-800 p-4 flex flex-col justify-between shadow-2xl overflow-hidden">
                  <div class="cover-crease"></div>
                  <div class="cover-sheen"></div>
                  <span class="text-[8px] uppercase font-bold tracking-widest text-orange-200">The Series</span>
                  <div class="my-auto">
                    <h3 class="font-sans font-black text-2xl uppercase leading-none tracking-tight">
                      VEN<br/>TURE
                    </h3>
                  </div>
                  <div class="border-t border-orange-300/40 pt-1">
                    <span class="text-[8px] uppercase tracking-widest text-orange-100 font-bold">Art &amp; Culture</span>
                  </div>
                </div>
              </div>

              <!-- Book 8: The Island -->
              <div class="book-3d-wrapper opacity-90 hover:opacity-100" onclick="window.NovelCastRouter.navigate('book', { book: 'white-raven' })" title="The Island">
                <div class="book-edge-right"></div>
                <div class="book-edge-top"></div>
                <div class="relative w-full h-full rounded-r-[2px] bg-[#0c1524] border-l-[3px] border-amber-600/80 p-3.5 flex flex-col justify-between shadow-2xl overflow-hidden">
                  <div class="cover-crease"></div>
                  <div class="cover-sheen"></div>
                  <div class="h-full w-full border border-amber-500/40 p-2.5 flex flex-col justify-between">
                    <div class="flex justify-center pt-1">
                      <span class="text-amber-300 text-xs">🌙</span>
                    </div>
                    <div class="text-center my-auto">
                      <p class="font-serif text-[9px] text-amber-200 tracking-widest uppercase">The</p>
                      <h4 class="font-serif text-sm tracking-widest text-amber-300 font-semibold uppercase">ISLAND</h4>
                    </div>
                    <span class="text-[8px] text-amber-400/70 text-center font-sans tracking-widest uppercase">AU D</span>
                  </div>
                </div>
              </div>

              <!-- Book 9: James Allen Philosophic -->
              <div class="book-3d-wrapper opacity-85 hover:opacity-100" onclick="window.NovelCastRouter.navigate('book', { book: 'eighty-days' })" title="James Allen Philosophic">
                <div class="book-edge-right"></div>
                <div class="book-edge-top"></div>
                <div class="relative w-full h-full rounded-r-[2px] bg-[#eeeae0] text-black border-l-[3px] border-neutral-400 p-4 flex flex-col justify-between shadow-2xl overflow-hidden">
                  <div class="cover-crease"></div>
                  <div class="cover-sheen"></div>
                  <span class="text-[8px] uppercase tracking-widest text-neutral-500 font-medium">New Edition</span>
                  <div class="my-auto py-2">
                    <h3 class="font-serif text-lg tracking-normal uppercase font-bold text-neutral-900 leading-snug">
                      JAMES<br/>ALLEN
                    </h3>
                  </div>
                  <span class="text-[8px] uppercase tracking-wider text-neutral-600">Philosophic</span>
                </div>
              </div>

              <!-- Book 10: The Deep -->
              <div class="book-3d-wrapper opacity-65 hover:opacity-100" onclick="window.NovelCastRouter.navigate('book', { book: 'mist-and-whispers' })" title="The Deep">
                <div class="book-edge-right"></div>
                <div class="book-edge-top"></div>
                <div class="relative w-full h-full rounded-r-[2px] bg-[#070b14] border-l-[3px] border-teal-900 p-4 flex flex-col justify-between text-neutral-300 shadow-2xl overflow-hidden">
                  <div class="cover-crease"></div>
                  <div class="cover-sheen"></div>
                  <span class="text-[8px] uppercase tracking-wider text-teal-400/80">The Silent Key</span>
                  <div class="my-auto">
                    <h4 class="font-serif text-base tracking-wider text-white font-semibold">THE DEEP</h4>
                  </div>
                  <span class="text-[8px] text-neutral-500">M. B. Cooper</span>
                </div>
              </div>

            </div>
          </div>
        </div>

        <!-- Bottom Atmospheric Spacer -->
        <div class="relative z-20 w-full pb-8 md:pb-12 pointer-events-none"></div>

      </div>
    `;
  },
  init: function () {
    // Ensure background ASCII video plays smoothly
    const bgVideo = document.querySelector('video[aria-label*="ASCII"]');
    if (bgVideo) {
      bgVideo.play().catch(() => {});
    }

    // 3D Tilt interactive effect for all books at the exact same level
    const wrappers = document.querySelectorAll('.book-3d-wrapper');
    wrappers.forEach(wrap => {
      wrap.addEventListener('mousemove', (e) => {
        const rect = wrap.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        const isFeatured = wrap.classList.contains('book-featured');
        // Kept at identical vertical level (-18px) for all books, with forward depth
        const baseTransY = -18;
        const baseTransZ = isFeatured ? 42 : 32;
        wrap.style.transform = `rotateY(-54deg) rotateX(4deg) translateY(${baseTransY}px) translateZ(${baseTransZ}px) rotateY(${x / 20}deg) rotateX(${-y / 20}deg)`;
      });
      wrap.addEventListener('mouseleave', () => {
        wrap.style.transform = '';
      });
    });
  }
};
