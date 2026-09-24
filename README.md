# 🎧 NovalCast — Audiobook & E-Book Platform

**NovalCast** is a web development project — a modern platform for discovering, streaming, and reading audiobooks and e-books. Built as a fully static front-end prototype using HTML, Tailwind CSS, and custom CSS 3D transforms, it explores an editorial, book-luxury visual style across the full product journey: landing → catalog → book details → library → immersive reading.

> 🚧 **Status:** Prototype / coursework stage — pages are static demos, not yet wired to a backend.

---

## ✨ Features

- **Editorial Landing Page (`#/landing`)** — hero with a continuous 3D perspective "book parade" (isometric 3D books built with pure CSS transforms, interactive tilt, sheen, and ambient ASCII background)
- **Audiobook & E-Book Discovery (`#/home`)** — main application dashboard for browsing curated shelves and genre spotlights
- **Book Detail Pages (`#/book`)** — ratings, trending ranks, author & narrator info, chapter counts, reviews, and reading launchpad
- **My Library & Manuscript Uploads (`#/library`)** — personal collection with drag-and-drop file upload zone (EPUB, PDF, TXT, MD) and reading progress tracking
- **Bespoke Reader (`#/reader`)** — dual modes: Classic Book double-page spread and distraction-free Continuous Scroll PDF layout with real-time reading pace (WPM)
- **Sanctuary Access (`#/login`)** — luxury editorial authentication modal with Supabase email verification

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Architecture | Single Page Application (SPA Hash Router) |
| Structure | HTML5 / JavaScript (Vanilla ES6+) |
| Styling | Tailwind CSS (CDN & compiled utility tokens) |
| Auth & State | Supabase Authentication |
| Fonts | Google Fonts — Cormorant Garamond, Bodoni Moda, Playfair Display, Plus Jakarta Sans, Cinzel |
| Icons | Material Symbols |
| 3D & Visuals | CSS 3D transforms (`perspective`, `preserve-3d`), React Bits Canvas PixelCard, ASCII stream |

## 📁 Project Structure

```
NovalCast-Web_DEV/
├── index.html           # Root entry redirect (routes to frontend/index.html)
├── frontend/            # Unified SPA Web Application
│   ├── index.html       # Main application shell & Tailwind design system
│   ├── assets/          # Static media & official vector branding
│   ├── css/             # Custom styles (site.css, landing.css, pixel-card.css, reader.css)
│   └── js/              # Modular application logic
│       ├── views/       # View controllers (landing, home, book, reader, library, login, search)
│       ├── components/  # Canvas PixelCard component
│       ├── auth.js      # Supabase authentication service
│       ├── data.js      # Catalog dataset & book normalizer
│       └── router.js    # Client-side hash router
├── backend/             # Roadmap for TTS voice streaming & account sync
├── Referance/           # High-fidelity Figma ASTs & Google Stitch reference screens
├── scripts/             # Build and asset extraction tooling
├── tests/               # Playwright automated test suite
└── package.json         # NPM scripts and dev dependencies
```

## 🚀 Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/lukan-lawslaf/NovalCast-Web_DEV.git
   cd NovalCast-Web_DEV
   ```

2. **Run locally**

   Serve using npm or any static server (recommended, so assets and fonts load cleanly):
   ```bash
   # Using npm
   npm start
   # or
   npm run dev

   # or Python
   python -m http.server 3000
   ```
   Then visit `http://localhost:3000`.

> **Note:** The application uses client-side hash routing (`#/landing`, `#/home`, `#/book`, `#/reader`, `#/library`, `#/login`, `#/search`).

## 🗺️ Roadmap

- [x] Semantic routing / friendly page names
- [x] Search & filtering across the catalog
- [x] User accounts and cloud-synced library (Supabase Auth & user manuscript uploads)
- [x] Reader dual modes (Classic Book double-page & Continuous Scroll PDF layout)
- [x] Reading progress tracking (% complete, reading pace & time left)
- [x] Interactive 3D hardcover book parade & ambient visual effects
- [ ] Real-time audio playback & TTS voice streaming (Fish Audio integration)
- [ ] Reader state persistence for user notes & highlights
- [ ] Responsive polish for mobile readers

## 👥 Team

| Member | Role |
|---|---|
| [Ujwal Tyagi](https://github.com/) | Web Development |
| [Nakul Falswal](https://github.com/) | Web Development |
| [Tejasvi N Sharma](https://github.com/Tejasvi-N-Sharma-) | Web Development |
| [Vaibhav Saini](https://github.com/) | Web Development |
| [Tarun Yadav](https://github.com/) | Web Development |

## 🤝 Contributing

This is a team coursework project. To contribute:

1. Fork / clone the repo
2. Create a branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m "Add your feature"`)
4. Push and open a Pull Request

## 📄 License

For educational purposes. All book content shown (titles, excerpts, cover concepts) belongs to its respective authors and publishers and is used here as placeholder demo material only.

---

<p align="center"><em>Built with 📚 + ❤️ by Team NovalCast</em></p>
