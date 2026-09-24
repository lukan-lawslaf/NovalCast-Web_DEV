# 🎧 NovalCast — Audiobook & E-Book Platform

**NovalCast** is a web development project — a modern platform for discovering, streaming, and reading audiobooks and e-books. Built as a fully static front-end prototype using HTML, Tailwind CSS, and custom CSS 3D transforms, it explores an editorial, book-luxury visual style across the full product journey: landing → catalog → book details → library → immersive reading.

> 🚧 **Status:** Prototype / coursework stage — pages are static demos, not yet wired to a backend.

---

## ✨ Features

- **Editorial Landing Page** — hero with a continuous 3D perspective "book parade" (isometric 3D books built with pure CSS transforms, hover elevation, sheen, and page-edge textures)
- **Audiobook & E-Book App** — main application dashboard for browsing and switching between e-book and audiobook modes
- **Book Detail Pages** — ratings, trending ranks, author & narrator info, chapter counts, listen stats, and genre browsing
- **My Library** — personal collection view for saved titles
- **Immersive E-Book Reader** — chapter navigation with annotation support: marginal notes, highlights, reader stats, and an interactive ikigai-style diagram
- **Continuous Scroll Mode** — distraction-free vertical reading mode with progress tracking, estimated time left, and reading pace (WPM)

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Structure | HTML5 |
| Styling | Tailwind CSS (CDN — forms & container queries plugins) |
| Fonts | Google Fonts — Bodoni Moda, Playfair Display, Plus Jakarta Sans, Cinzel |
| Icons | Material Symbols |
| 3D Effects | Custom CSS transforms (`perspective`, `preserve-3d`, gradients) |

No build tools, no dependencies to install — every page runs directly in the browser.

## 📁 Project Structure

```
NovalCast-Web_DEV/
├── index.html   # Landing page — Editorial Book Collection (3D book parade)
├── 2.html       # Audiobook & E-Book application (main app)
├── 3.html       # Audiobook detail page (e.g. IKIGAI)
├── 4.html       # My Library
├── 5.html       # Book detail / browse by genre
├── 6.html       # E-book reader with notes, highlights & annotations
└── 7.html       # Continuous scroll reading mode
```

## 🚀 Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/lukan-lawslaf/NovalCast-Web_DEV.git
   cd NovalCast-Web_DEV
   ```

2. **Open any page in your browser**

   Just double-click `index.html`, or serve locally (recommended, so CDN assets and fonts load cleanly):
   ```bash
   # Python
   python -m http.server 5500
   # or Node
   npx serve .
   ```
   Then visit `http://localhost:5500`.

> **Note:** Pages currently link to each other by filename (`index.html`, `2.html`, …).

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
