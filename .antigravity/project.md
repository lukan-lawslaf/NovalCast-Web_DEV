# NovelCast Technical Documentation

## Architecture & Design

### 1. Concept & Vision
NovelCast is a digital editorial reading and audio novel experience. It focuses on typography, fluid animations, book covers, and clean reader controls.

### 2. Page Directory
- **`index.html`**: Entry landing page. Features a dynamic 3D book cover carousel (`parade-stage`), subtle spotlight gradients, and quick navigational links.
- **`home.html`**: The main discovery interface. Showcases curated catalogs, trending stories, genres, and recommendations.
- **`library.html`**: User's personalized collection, active reading progress, bookmarks, and completed works.
- **`book-details.html`**: Book overview with cover presentation, metadata, author bio, synopsis, chapter selection, and audio playback triggers.
- **`read-book.html`**: Paged horizontal or paginated reading experience optimized for desktop/tablets.
- **`read-scroll.html`**: Seamless continuous vertical scroll reader with typography controls, chapter progress, and responsive layout.
- **`search.html`**: Live client-side book search with filtering by genre, author, and keywords.
- **`coming-soon.html`**: Minimalist video-background landing page with animated 404 message.

### 3. JavaScript Structure (`js/`)
- `data.js`: Mock book catalog, metadata, chapters, and content.
- `app.js`: Main router, book navigation bindings, and shared state events.
- `pages.js`: Dynamic page rendering and DOM building helpers.
- `reader.js`: Reading settings, font size, theme switching, scroll/page tracking.
- `ui.js`: Common UI utilities (modals, dropdowns, transitions).
- `home.js`, `library.js`, `book-details.js`, `search.js`, `landing.js`: Page-specific controllers.
- `tailwind-app.js`, `tailwind-home.js`, `tailwind-landing.js`: Tailwind runtime configurations and presets.

### 4. Stylesheets (`css/`)
- `site.css`: Compiled Tailwind utilities and shared layout styles.
- `landing.css`: Landing-specific 3D book cover transforms and lighting effects.
- `home.css`: Discovery page specific styling.
- `reader.css`: Typography and reading layout formatting.
- `coming-soon.css`: Background video positioning and typography styling for coming-soon/404.

### 5. Development Scripts (`scripts/`)
- `scripts/build-css.js`: Compiles Tailwind styles across all HTML pages and JS templates into `css/site.css`.
- `scripts/inspect.js`: Inspects DOM hierarchy across reader and library pages for semantic consistency.
- `scripts/screenshots.js`: Automates desktop and mobile full-page screenshots via Playwright for visual regression testing.

### 6. External Integrations
- Fish Audio API (`Fish_Audio` token in `.env`) for text-to-speech / audio novel narration.
