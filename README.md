# NovelCast

> **A curated editorial digital reading platform and audio novel experience.**

NovelCast pairs fine literature reading with bespoke editorial typography, interactive 3D hardcover animations, dual reading modes (classic skeuomorphic double-page spread & continuous vertical scroll PDF layout), live reading metrics, Supabase authentication, custom manuscript uploads, and ambient audio narration.

---

## 📖 Key Features & Reading Experiences

- **Atmospheric 3D Showcase (`#/landing`)**: Immersive 3D hardcover book parade with real-time interactive mouse-tilt, ambient 21st.dev ASCII video background, and literary sanctuary aesthetics.
- **Curated Discovery (`#/home`)**: Explore seasonal editorial collections, top shelves, Ghibli Studio spotlights, and trending audiobooks.
- **Personal Sanctuary & Uploads (`#/library`)**: Authenticated user library featuring drag-and-drop manuscript upload zone powered by React Bits `<PixelCard />`, format auto-detection (EPUB, PDF, TXT, MD), reading progress percentages, and quick progress tracking.
- **Book Details & Deep Dive (`#/book?book=[id]`)**: Comprehensive synopsis, narrator details, chapter list, audience reviews, and immediate "Read Now" or "Listen Now" actions.
- **Bespoke Reader (`#/reader?book=[id]`)**:
  - **`[Book]` Mode**: Classic skeuomorphic double-page hardcover spread with ribbon bookmark and page-turn dynamics.
  - **`[PDF]` Mode**: Continuous vertical scroll reader with live reading pace (WPM), estimated time remaining, scroll percentage tracker, chapter headings, and bottom progress scrubber.
- **Global Search (`#/search`)**: Instant live filtering across titles, authors, and genre pills.
- **Sanctuary Atelier Access (`#/login`)**: Luxury editorial authentication modal with Cormorant Garamond typography, tabbed sign-in / access request, cipher toggle, and secure Supabase email verification.
- **Persistent Global Audio Player**: Floating audio pill with real-time track metadata and playback controls.

---

## 📂 Directory Layout

```text
├── .agents/                 # Workspace agent skills (claude-remember, review, unslop, etc.)
├── .antigravity/            # Persistent local state, session continuity & context tracking
├── backend/                 # Backend proxy roadmap & service specifications
├── components/              # Reference UI components (e.g. 21st.dev ASCII art)
├── frontend/                # Production web application
│   ├── assets/              # Static media, atelier backgrounds, official vector logos
│   ├── css/                 # Stylesheets (site.css, app.css, home.css, landing.css, pixel-card.css, reader.css)
│   ├── js/                  # Application JavaScript modules
│   │   ├── components/      # Interactive components (pixelCard.js)
│   │   ├── views/           # Modular SPA view controllers (landing, home, search, book, reader, library, login)
│   │   ├── app.js           # Audio playback logic and DOM event delegation
│   │   ├── auth.js          # Supabase client authentication service
│   │   ├── data.js          # Canonical catalog dataset, chapters, and book normalization
│   │   ├── pages.js         # Editorial card templates and component generators
│   │   ├── router.js        # Client-side hash router
│   │   └── ui.js            # UI utilities, cover art generators, and toast alerts
│   ├── index.html           # Unified SPA shell and Tailwind design system tokens
│   └── logo.svg             # Official NovelCast vector branding
├── Referance/               # High-fidelity design specifications (Figma renders, Stitch screens, Vite demo)
├── scripts/                 # Development and build tooling
│   ├── build-css.js         # Tailwind CSS build script
│   ├── generate-env.js      # Dynamic environment injector (generates frontend/js/env.js from .env)
│   ├── figma-client.js      # Figma REST API integration helper
│   ├── import-figma.js      # Figma screen importer
│   ├── import-stitch.js     # Google Stitch screen importer
│   ├── inspect.js           # Reader DOM node inspector
│   └── screenshots.js       # Playwright screenshot runner
├── tests/                   # Automated end-to-end Playwright tests
├── .env.example             # Template for API credentials (Supabase, Fish Audio, Figma)
├── .gitignore               # Excludes secrets, node_modules, and archive artifacts
├── index.html               # Root redirect to frontend/index.html
└── package.json             # NPM package scripts and dev dependencies
```

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Copy the example environment file and configure your credentials:
```bash
cp .env.example .env
```
Populate `.env` with your Supabase URL, Anon Key, and optional Fish Audio / Figma keys.

### 3. Run Locally
```bash
# Starts development server at http://localhost:3000
npm start
# or
npm run dev
```

### 4. Build Tailwind CSS
```bash
npm run build:css
```

### 5. Automated Tests
```bash
# Run reader tests
npm test

# Run auth & email verification tests
npm run test:auth

# Run complete test suite
npm run test:all
```
