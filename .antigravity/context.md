# NovelCast — Antigravity Workspace Context

> **Auto-Resume Context File**: Antigravity reads this file upon starting any session to immediately resume from where the previous session left off.

---

## 1. Project Overview
- **Project Name**: NovelCast
- **Type**: Interactive Editorial Web Application & Book Reader Platform
- **Key Experience**: A curated editorial book collection and reading platform with immersive book-detail views, horizontal/vertical reading modes (`read-book.html`, `read-scroll.html`), catalog filtering, search, and audio narration capabilities (integrating Fish Audio).
- **Styling & Frameworks**: Tailwind CSS, Vanilla CSS (`css/`), Vanilla JS (`js/`), Google Fonts (Bodoni Moda, Playfair Display, Plus Jakarta Sans, Cinzel, GeistMono).

---

## 2. Workspace File Map

| File / Folder | Purpose |
| :--- | :--- |
| `frontend/index.html` | Unified SPA shell, header, sidebar dock, persistent audio player, and Tailwind design tokens |
| `frontend/assets/` | Static media (`login_atelier_bg.jpg`) and canonical vector logo (`logo.svg`) |
| `frontend/css/` | Custom styles (`site.css`, `landing.css`, `home.css`, `reader.css`, `pixel-card.css`, `app.css`) |
| `frontend/js/views/` | Modular SPA view controllers (`landingView.js`, `homeView.js`, `searchView.js`, `bookDetailsView.js`, `readerView.js`, `libraryView.js`, `loginView.js`) |
| `frontend/js/components/`| Interactive canvas components (`pixelCard.js`) |
| `frontend/js/` | Core services (`router.js`, `auth.js`, `data.js`, `pages.js`, `ui.js`, `app.js`, `env.js`) |
| `backend/` | Roadmap & proxy handlers for Fish Audio TTS streaming and user sync |
| `components/` | Reference UI components (`1s1s.tsx` ASCII video background) |
| `Referance/` | High-fidelity design references (`Figma/` renders, `Stich/` screens, `design/` Vite demo) |
| `scripts/` | Development tooling (`build-css.js`, `generate-env.js`, `figma-client.js`, `import-figma.js`, `import-stitch.js`, `inspect.js`, `screenshots.js`) |
| `tests/` | Automated Playwright end-to-end tests for all views, auth flows, and reader modes |
| `.agents/skills/` | Workspace skills (`claude-remember`, `review`, `unslop`, `caveman`) |
| `archive/` | Quarantined visual test outputs and snapshots (git ignored) |
| `.env` / `.env.example` | Environment configurations (Supabase, Fish Audio, Figma) |
| `index.html` | Root redirect to `frontend/index.html` |
| `package.json` | Project scripts (`npm start`, `npm run build:css`, `npm test`, etc.) |
| `README.md` | Complete architecture, feature guide, and quickstart documentation |
| `.antigravity/` | Local Antigravity persistent state, context, and session continuity |

---

## 3. Current Session & Continuity State

- **Current Status**: Skills configured and persistence rules active.
- **Active Skills**:
  - `claude-remember`: Persistent memory management, automatic context load, and state compression across IDE restarts.
  - `review`: Interactive co-planning workflow via `ask_question` where the user defines product logic and features while the agent handles coding.
  - `caveman`: Ultra-compressed communication mode cutting output tokens while retaining technical substance and precision.
- **Completed Actions**:
  - Installed `caveman` skill suite from `JuliusBrussee/caveman` into workspace (`.agents/skills/`) and global (`.gemini/config/skills/`).
  - Codebase sanitized and organized with `.gitignore`, `package.json`, `README.md`, and `scripts/`.
  - Created global and workspace `claude-remember` skill.
  - Created global and workspace `review` skill.
  - Updated `AGENTS.md` and `GEMINI.md` to enforce continuous context persistence and interactive review.
  - Configured and verified **Stitch MCP** (`https://stitch.googleapis.com/mcp`) via Google API Key.
  - Located existing Stitch project `Remix of Multi-Page Theme Website` (`projects/2662529744193891123`) containing the full NovelCast design screens.
  - Configured official remote **Figma MCP** (`https://mcp.figma.com/mcp`) in `mcp_config.json`.
  - Verified Figma Personal Access Token and established automated API tooling in [`scripts/figma-client.js`](file:///c:/Users/Nakul/OneDrive/Documents/NovalCast/scripts/figma-client.js).
  - Verified direct access to all `NovalCast📖` frames (Home, Book Details, Library, Search, Hero) and render URLs.
  - Imported all Google Stitch project screens into [`Referance/Stich/`](file:///c:/Users/Nakul/OneDrive/Documents/NovalCast/Referance/Stich).
  - Imported full Figma AST, frame JSONs, high-resolution renders, and visual preview gallery into [`Referance/Figma/`](file:///c:/Users/Nakul/OneDrive/Documents/NovalCast/Referance/Figma).
  - Created [`backend/`](file:///c:/Users/Nakul/OneDrive/Documents/NovalCast/backend) folder with [`README.md`](file:///c:/Users/Nakul/OneDrive/Documents/NovalCast/backend/README.md) roadmap.
  - Created [`frontend/`](file:///c:/Users/Nakul/OneDrive/Documents/NovalCast/frontend) folder with unified [`index.html`](file:///c:/Users/Nakul/OneDrive/Documents/NovalCast/frontend/index.html) SPA shell.
  - Built client-side hash router [`frontend/js/router.js`](file:///c:/Users/Nakul/OneDrive/Documents/NovalCast/frontend/js/router.js) (`#/home`, `#/search`, `#/library`, `#/book`, `#/reader`, `#/landing`).
  - Extracted modular view controllers into [`frontend/js/views/`](file:///c:/Users/Nakul/OneDrive/Documents/NovalCast/frontend/js/views).
  - Added persistent global audio player bar and preserved original pages in [`frontend/legacy_pages/`](file:///c:/Users/Nakul/OneDrive/Documents/NovalCast/frontend/legacy_pages).
  - **Tailwind CSS & Styling Fixes**:
    - Installed `tailwindcss`, `@tailwindcss/forms`, `@tailwindcss/container-queries`, `postcss`, and `autoprefixer` via npm.
    - Added Tailwind CDN (`cdn.tailwindcss.com`) and complete design tokens configuration (`tailwind.config`) directly to [`frontend/index.html`](file:///c:/Users/Nakul/OneDrive/Documents/NovalCast/frontend/index.html).
    - Recompiled [`frontend/css/site.css`](file:///c:/Users/Nakul/OneDrive/Documents/NovalCast/frontend/css/site.css) (136 KB) with complete Tailwind preflight resets and component tokens.
    - Eliminated browser default blue underlined links across all cards, titles, authors, and chapter index items.
    - Restored authentic Stitch/Figma book covers, 3D spines, and the cherry blossom artwork in [`frontend/js/ui.js`](file:///c:/Users/Nakul/OneDrive/Documents/NovalCast/frontend/js/ui.js) and [`frontend/js/pages.js`](file:///c:/Users/Nakul/OneDrive/Documents/NovalCast/frontend/js/pages.js).
    - Restored the full 3D book parade stage, overlapping hardcover book spines, and background watermark in [`frontend/js/views/landingView.js`](file:///c:/Users/Nakul/OneDrive/Documents/NovalCast/frontend/js/views/landingView.js).
    - **Landing Page Overhaul (Referance/test.html)**:
      - Default entry route set to `#/landing` so it opens first upon visiting the website.
      - Removed/hidden sidebar dock (`#app-sidebar`) and top shell header (`#app-header`) on the landing page with zero padding (`p-0`) for 100% focused, distraction-free cinematic immersion.
      - Replaced all verbose "aural immersion" copy with sleek, evocative, minimal literary hook text:
        - *"Private Press & Voice Sanctuary"*
        - *"Where stories breathe. Bound for devotion, voiced in quiet reverie."*
      - Restored authentic reference top floating nav (`Catalogs`, `Editions`, `Audiobooks`, `Sanctuary`, `Enter Library →`).
      - Verified full 10 3D hardcover book parade with smooth interactive mouse-tilt and seamless transition into `#/home` upon entering library.
      - **Book Proportions & Layout Polish**:
        - Reduced height and increased width (`210px–255px` × `255px–290px`) for balanced, realistic hardcover book dimensions.
        - Aligned all 10 books so the middle book (`Sunshine & Second Chances`) rests on the exact same bottom baseline (`bottom: 541px`).
        - Fixed middle book cursor tilt interaction by removing `!important` from CSS and harmonizing mousemove tilt handlers.
        - Integrated the **21st.dev Animated ASCII Art video (`1s1s`) as the full-screen ambient background** with boosted opacity (`0.55`), enhanced brightness/contrast filters, and balanced vignette overlays.
        - Replaced generic "NC" badges and the "E-book" / "AudioBook" header tabs across the application with the official [`logo.svg`](file:///c:/Users/Nakul/OneDrive/Documents/NovalCast/logo.svg) and unified `NovelCast` branding.
        - Integrated [`luxury_logo.svg`](file:///c:/Users/Nakul/OneDrive/Documents/NovalCast/luxury_logo.svg) and finalized with the requested official [`logo.svg`](file:///c:/Users/Nakul/OneDrive/Documents/NovalCast/logo.svg) across the sidebar mark, top main header, and floating landing nav.
        - Created [`components/ui/1s1s.tsx`](file:///c:/Users/Nakul/OneDrive/Documents/NovalCast/components/ui/1s1s.tsx).
      - **Authentication & User Library Overhaul**:
        - Replaced DP / profile avatar picture with clean SVG user profile icon across all headers and views.
        - Wired **Supabase Authentication** (`frontend/js/auth.js`) using project URL and Anon Key from `.env`.
        - Created login/sign-up page view (`#/login`, `frontend/js/views/loginView.js`) with tabbed Sign In / Create Account forms and auth state management.
        - Enforced route guard on `#/library` (unauthenticated visits redirect to `#/login?redirect=library`).
        - Integrated React Bits `<PixelCard />` (`frontend/css/pixel-card.css`, `frontend/js/components/pixelCard.js`) with responsive canvas pixel animation for the drag-and-drop manuscript upload zone.
        - Implemented user book uploads supporting EPUB, PDF, TXT, MD with automatic metadata parsing, upload progress bar, and persistence.
        - Displayed empty shelf state (`null if nothing added`) when no books are uploaded.
        - Added live reading progress tracking (percentage bar, quick +20% increment button, and resume reader link) for each uploaded book.
      - **Library Card Redesign & Stitch Login Screen**:
        - Redesigned uploaded book cards in `#/library` to the standard vertical book format matching the reference (`aspect-[1/1.42]`, 3D hardcover spine, star rating, gold monogram/borders, bottom glow title, and bookmark icon).
        - Removed horizontal image panel and standalone "Start Reading" button from uploaded cards.
        - Configured direct card click navigation to `#/book?book=[id]` (e.g. `#/book?book=eighty-days` or `#/book?book=upload-xxx`).
        - Populated full book details page for uploaded manuscripts with description, chapter index, audience reviews, and the "Read Now" / "Listen Now" buttons.
        - Connected to Stitch project `17892911391031885180`, generated atmospheric login screen (`77d2816c8a2840698cc104d4349b15ce`), and integrated it into `frontend/js/views/loginView.js` with frosted glass, cipher toggles, and Supabase Auth.
      - **Reference Login Page Overhaul**:
        - Replaced login screen with user's exact reference HTML in `frontend/js/views/loginView.js`.
        - Added `Cormorant Garamond` Google Fonts, luxury letter-spacing (`.tracking-luxury`, `.tracking-widest-plus`), `.sanctuary-glass`, `.input-glass`, `.gold-cta-btn`, and `.social-btn`.
        - Integrated interactive tab switcher ("Sign In" vs "Request Access" with dynamic Name field), Apple ID & Google OAuth actions, cipher show/hide toggle, and Supabase auth submission.
        - Downloaded antique library atelier background locally to `frontend/assets/login_atelier_bg.jpg` to prevent browser cross-origin ORB blocking.
        - **Auth & Email Confirmation Refinement**:
          - Removed Apple ID & Google buttons and 'or' divider from the login modal for a focused, clean editorial aesthetic.
          - Configured Supabase Auth sign-up to dispatch email verification (`emailRedirectTo: '#/login?confirmed=true'`).
          - Blocked direct unverified sign-in: `signUp` sets user state to null until confirmed; `signIn` catches unconfirmed email errors and displays prompt with resend action.
          - Added dedicated `#confirmation-notice` card displaying target email, clear instructions, "Proceed to Sign In" toggle, and resend action.
          - Verified complete workflow via automated Playwright test in `scripts/test-email-confirmation-login.js`.
        - **Dynamic Environment Loading & Official Logo Integration**:
          - Created `scripts/generate-env.js` and npm lifecycle scripts (`prestart`, `predev`, `generate:env`) to read `.env` dynamically and output `frontend/js/env.js` and `frontend/env.json`.
          - Fully removed hardcoded Supabase URL and API key from `frontend/js/auth.js`.
          - Added `frontend/js/env.js` and `frontend/env.json` to `.gitignore` to prevent committing keys.
          - Replaced circular 'N' placeholder with the official `logo.svg` in `frontend/js/views/loginView.js` across the top navbar, central card header, and authenticated card view.
          - Verified with Playwright in `scripts/test-env-and-logo.js` and visually confirmed in `archive/login_with_official_logo.png`.
        - **Skill Integration: unslop**:
          - Downloaded and configured the `unslop` skill (v2.3.0 from `theclaymethod/unslop`) with all commands (`rewrite`, `cleanup`, `teach`, `mimic`), core contracts, voice presets (`crisp`, `warm`, `expert`, `story`), and evaluation scripts.
          - Installed into both global root (`C:\Users\Nakul\.gemini\config\skills\unslop`) and workspace root (`.agents\skills\unslop`).
        - **Reader Book vs PDF Modes**:
          - Replaced Sepia/Obsidian theme toggle in `#/reader` with `[Book]` and `[PDF]` mode switcher.
          - Built continuous vertical scroll PDF layout matching the user's reference with live reading pace (`240 WPM pace`), time remaining (`1 hr 12m left`), scroll progress (`34% Complete`), Volume/Chapter heading, and bottom scrubber bar.
        - **Codebase Organization & Deduplication**:
          - Purged duplicate media: removed duplicate `animated_hero.webp` (3.6 MB), duplicate and unused `luxury_logo.svg` (2.7 MB), and root `logo.svg`, keeping canonical vector in `frontend/logo.svg` and `frontend/assets/logo.svg`.
          - Deleted legacy multi-page directory `frontend/legacy_pages/` (8 obsolete HTML files) and legacy page-specific scripts (`book-details.js`, `home.js`, `landing.js`, `library.js`, `reader.js`, `search.js`, `tailwind-app.js`, `tailwind-home.js`, `tailwind-landing.js`, `coming-soon.css`).
          - Cleaned 92 MB of temporary dependencies in `Referance/design/node_modules/` and `dist/`.
          - Purged loose git database files from `.agents/skills/unslop/`.
          - Hardened `.gitignore` to exclude 11MB Figma AST dump, nested node_modules, build outputs, and all secrets.
          - Rebuilt Tailwind CSS bundle `frontend/css/site.css` (reduced from 142 KB to 101 KB).
          - Updated `README.md` to accurately document modern SPA architecture, views, directory layout, and test commands.
    - Verified all views and interactions via automated Playwright tests.
- **Active Integrations**:
  - Fish Audio key configured in `.env`.
  - Stitch MCP configured in `.agents/mcp_config.json` and global `mcp_config.json`.
  - Stitch Project `17892911391031885180` (NovelCast Sanctuary Atelier).
  - Figma remote MCP configured in `mcp_config.json`.
  - Figma Personal Access Token & File Key configured in `.env`.

---

## 4. Pending / Next Steps
- [ ] Connect real-time Fish Audio voice synthesis to the persistent global audio player.
- [ ] Implement backend proxy service in `backend/` for TTS caching and user account sync.
- [ ] Maintain `.antigravity/context.md` and `.antigravity/state.json` at every step.

---

## 5. Agent Instructions for Resuming
Whenever Antigravity starts a new turn or reopens this project:
1. Read `.antigravity/context.md` (this file) and `.antigravity/state.json`.
2. Check the **Pending / Next Steps** and **Current Status** sections.
3. Inform the user you have restored context from `.antigravity/` and confirm what next task they would like to tackle.
4. When planning features, use `ask_question` with options to collaborate with the user on logic and design.
