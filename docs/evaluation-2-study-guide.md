# NovelCast: project walkthrough and evaluation preparation

Prepared from the current source on 9 November 2026. Your second evaluation is the priority; third-evaluation material is marked separately. This guide explains the implementation as it exists. Example snippets labelled “teaching example” are not added features.

This is your single study document, updated for the implemented JSON storage and authentication syncing. You do not need the separate workflow note to understand or demonstrate the project.

**Study route:** sections 1–4 explain the project; 5 teaches the JavaScript you use; 6 covers CSS; 7–9 trace the actual code and JSON workflow; 10 is backend background for the third evaluation; 12–15 are your demo, viva and final revision. Prioritize the reading-plan form and section 9 for tomorrow.

**Your 40-second introduction:** “NovelCast is a reading and narration website built with HTML, CSS and vanilla JavaScript. It has seven linked screens in a single-page application. JavaScript handles navigation, search, forms, bookmarks and reader controls. Supabase handles accounts. Our reading-plan form validates input, saves it through an authenticated Express API to a private JSON file, and lets the user download a copy. localStorage keeps an account-specific cache and pending edits. MongoDB stores the public books, chapters and ratings. For this evaluation I will demonstrate linked pages, interactions, form submission and JSON saving.”

## 1. What matters for tomorrow

Your sir's checklist is the marking scheme. A feature can be technically advanced and still miss a specific requirement.

| Second-evaluation requirement | Evidence in your code | Assessment |
| --- | --- | --- |
| Additional pages linked together | Seven views connected by `frontend/js/router.js` | Implemented as SPA screens. If the rubric requires separate HTML documents, confirm that interpretation; your application uses one HTML shell. |
| JavaScript interactions and validation | Search, filters, login tabs, password visibility, theme changes, reader controls, drag/drop, ratings | Numerous concrete examples. |
| Form submission | Login submits to Supabase; the library reading-plan form submits through the JSON sync service | Use the reading plan as your clearest local-data submission demonstration. |
| Save submitted form data to local JSON files | Reading-plan form → authenticated Express API → `backend/data/libraries/<account-hash>.json`; Download JSON exports the device snapshot | Implemented. Demonstrate a valid submission, actual disk file, and download. |

**Do not say “we use JSON.stringify, so we save JSON files.”** That function produces a string. Where you put the string determines its storage.

Also understand these limitations before demonstrating:

- Library file selection saves **metadata** such as title, format and size. It does not read, parse or store the file's contents. Its progress bar is timer driven.
- The reader's “PDF” mode displays chapter text in a scrolling HTML layout. It is not a PDF parser, PDF viewer or PDF exporter.
- Catalog cards can appear from baseline metadata or cache while the backend is unavailable. This does not mean the full reader, accounts or audio work offline.
- Library state, settings, plan and upload metadata now use account-specific caches and sync to a private backend JSON file. The old shared bookmarks stay guest-only because their owner is unknown. Theme remains a device preference.
- Reader page position starts locally in the current reader session. The active reader does not call the generic `saveBookState()` helper to persist every page turn. Font size controls also do not call `saveSettings()`.
- The login form's name field is optional in current markup. Email and password have native constraints. A password-recovery link exists, but `NovelCastAuth` does not implement the recovery method checked by that link, so it reports recovery unavailable.
- The “Remember on this device” checkbox is present, but its value is not read by the submit handler. Do not claim it controls session persistence.

## 2. Explain the project in your own words

NovelCast is a digital reading and narration application. A visitor can discover books, search by title or author, inspect a book's chapters, read a chapter in a paginated or scrolling layout, and request audio narration. Accounts are handled by Supabase. Catalog books, chapters and community ratings use MongoDB Atlas through an Express backend. A private per-account JSON file stores submitted reading plans and library data, with localStorage caching and a user download.

Break that into three responsibilities:

1. **HTML supplies elements:** navigation, forms, buttons, cards and containers.
2. **CSS supplies presentation:** colors, spacing, layout, responsive behavior and animations.
3. **JavaScript supplies behavior:** deciding what to display, responding to events, validating/processing input, changing state and requesting data.

You already know programming. Your main new idea is the browser environment: JavaScript can find an HTML element and react when the user interacts with it.

## 3. Whole project structure

```text
NovalCast/
├── frontend/                  Website files served to the browser
│   ├── index.html             Shared HTML shell, styles, scripts, startup
│   ├── css/                   Generated utilities and custom styles
│   ├── js/
│   │   ├── data.js            Catalog, browser state, API client
│   │   ├── auth.js            Account/session service
│   │   ├── librarySync.js     Account cache, JSON sync, conflict merge, download
│   │   ├── profile.js         Header account image/initials
│   │   ├── ratings.js         Interactive community ratings
│   │   ├── theme.js           Dark/light mode
│   │   ├── ui.js              Small reusable presentation helpers
│   │   ├── pages.js           Reusable HTML section templates
│   │   ├── app.js             Shared button/link behavior
│   │   ├── router.js          Chooses and mounts a screen
│   │   ├── audioPlayer.js     Audio request/playback state
│   │   ├── components/        Canvas PixelCard implementation
│   │   └── views/             Seven page controllers
│   └── other static assets    Logos, images, media and public config
├── backend/
│   ├── index.js               Express entry point
│   ├── package.json           Backend dependencies and commands
│   ├── data/libraries/        Private account JSON files, created on save, ignored by Git
│   └── src/
│       ├── config/            Environment, database, narration voices
│       ├── models/            Book, Chapter and Rating schemas
│       ├── routes/            Catalog, ratings, library JSON, ingestion, narration APIs
│       ├── services/          JSON-file storage and text/provider processing
│       ├── utils/             Shared HTTP helpers
│       └── scripts/           Operator ingestion and live smoke checks
├── scripts/                   Local build/config/design utilities
├── tests/                     Automated checks
├── docs/                      Architecture and study documentation
├── Referance/                 Design references; not the app entry point
├── components/                Design/component source; not a React SPA
├── motion/, promo/            Separate promotional video work
├── scratch-*/                 Experiments; not the core web application
├── archive/                   Old snapshots/backups
├── node_modules/              Installed packages; not your application logic
├── package.json               Frontend/tooling dependencies and commands
├── package-lock.json          Exact resolved dependency versions
├── index.html                 Redirects to frontend/index.html
└── AGENTS.md, hidden config    Development/assistant instructions/settings
```

The presence of a `.tsx` file in a support folder does not make the running website React. The active app uses vanilla JavaScript and ordinary script tags. Legacy assistant folders are not application logic or useful revision material.

Environment files contain configuration and may contain secrets. Explain their purpose without displaying their contents. Generated `frontend/js/env.js` and `frontend/env.json` carry selected public configuration, not database passwords or narration secrets.

### CSS files

| File | Purpose |
| --- | --- |
| `site.css` | Generated Tailwind utility classes. Rebuilt with `npm run build:css`. |
| `app.css` | Shared application-specific styling. |
| `shell.css` | Shared navigation, header controls and shell details. |
| `theme.css` | Theme variables and light-mode overrides. |
| `home.css` | Home catalog/card presentation. |
| `landing.css` | Landing background, bookshelf layout and 3D effects. |
| `reader.css` | Reader pages, book spread, turning leaf and responsive rules. |
| `ratings.css` | Rating summary, distribution and star controls. |
| `audio-player.css` | Persistent audio player appearance. |
| `pixel-card.css` | Canvas upload-card container/effects. |
| `library-sync.css` | Reading-plan form, sync/download controls, saved shelf and mobile layout. |

The shell loads both the Tailwind CDN runtime/config and generated `site.css`, alongside custom CSS. Do not describe the current setup as a completely offline, build-only Tailwind setup.

## 4. How the application starts

Read `frontend/index.html` near its final script tags, then `router.js`.

```text
Browser requests frontend/index.html
  → CSS and JS scripts load in their written order
  → data.js installs window.NovelCast and starts fetching catalog data
  → view files register objects in window.NovelCastViews
  → DOMContentLoaded fires when the HTML has been parsed
  → profile.init() registers account-header updates
  → await auth.init() restores the initial session
  → NovelCastLibrary.init() selects the account cache and schedules JSON sync
  → router.init() renders the current hash route
```

The shell now awaits initial authentication before routing, preventing an early library redirect before session restoration. Library JSON loading continues asynchronously and refreshes the view when ready.

**Why script order matters:** `pages.js` needs the data/UI helpers. The router's route table needs the view objects. A later script can use a global created by an earlier script.

`window` is the browser's global object. `window.NovelCast` is a shared service object, comparable to a namespace containing related functions. `document` represents the HTML document.

### What an SPA is

SPA means **single-page application**. One HTML document stays loaded while JavaScript replaces its main content.

Example:

```text
http://127.0.0.1:3000/#/book?book=dracula
                        └──── hash route ────┘
```

- `#/book` selects the details screen.
- `book=dracula` identifies the selected book.
- The router inserts that view into `#app-view`.
- Changing the hash raises `hashchange`; browser Back/Forward also changes the hash.
- The hash is handled in the browser rather than sent as part of the HTTP resource path.

### All seven screens

| Route | View file | Purpose and links |
| --- | --- | --- |
| `#/landing` | `landingView.js` | Entrance with interactive bookshelf; links into the app and book details. Default route. |
| `#/home` | `homeView.js` | Featured/popular books, audio showcase, genre links. |
| `#/search` | `searchView.js` | Search and genre filters; result cards link to details. |
| `#/book?book=dracula` | `bookDetailsView.js` | Description, chapter list, ratings, recommendations. |
| `#/reader?book=dracula&chapter=1` | `readerView.js` | Read a selected chapter and navigate pages/chapters. |
| `#/login` | `loginView.js` | Sign-in/sign-up form and account feedback. |
| `#/library` | `libraryView.js` | Reading-plan form, saved catalog books, manuscript metadata, account sync and JSON download. Requires sign-in. |

```text
Landing → Home → Search → Book details → Reader
    └────────────→ Book details
Library → Login when signed out → Library after successful sign-in
Book details → Login when a guest wants to submit a rating
```

The router hides the shared sidebar/header on landing and login. Other views use the application shell.

### The view lifecycle: render, init, destroy

Most views expose:

```javascript
window.NovelCastViews.example = {
  render: function () {
    return '<button id="example-button">Click</button>';
  },
  init: function () {
    // Find the newly inserted button and attach behavior.
  }
};
```

This is a teaching example of the project's pattern.

- `render()` returns an HTML string; it does not itself attach that string to the document.
- The router assigns `container.innerHTML = view.render()`.
- `init()` runs after insertion, so its elements exist.
- Some views assign `this.destroy` in `init()` to cancel requests, timers, animations or global listeners when leaving.
- The router calls the old view's `destroy()` before replacing its markup.

Replacing `innerHTML` replaces descendant elements, so the new buttons need handlers again. This explains the repeated calls to `bindInteractiveElements()` after rerendering.

## 5. JavaScript through Python, C and Java

### Syntax bridge

| Familiar concept | JavaScript | Meaning |
| --- | --- | --- |
| Variable | `let count = 0;` | Reassignable binding. |
| Fixed binding | `const book = { title: 'Dracula' };` | Cannot reassign `book`; object properties can still change. Not an immutable object. |
| Boolean/null | `true`, `false`, `null` | Comparable to Python `True`, `False`, `None`. |
| Unset/missing value | `undefined` | Common for missing object properties or absent return values. |
| List/array | `const ids = ['dracula', 'moby-dick'];` | Dynamic array; indexing starts at zero. |
| Dict/object | `const book = { title: 'Dracula', chapters: 27 };` | Key/value properties; access with `book.title` or `book['title']`. |
| Function | `function add(a, b) { return a + b; }` | No parameter type declarations required. |
| Lambda | `book => book.title` | Arrow function, similar to Python `lambda book: book['title']`. |
| String interpolation | `` `Chapter ${number}` `` | Comparable to Python `f'Chapter {number}'`; requires backticks. |
| Ternary | `signedIn ? 'Library' : 'Sign in'` | Java/C conditional expression. |
| Strict equality | `score === 5` | Checks equality without implicit type coercion. |
| Safe optional access | `auth?.getUser()` | Stops with `undefined` if `auth` is null/undefined. |
| Fallback | `name || 'Guest'` | Uses fallback for any falsy value, including `''`, `0`, `false`. |
| Nullish fallback | `value ?? defaultValue` | Falls back only for `null`/`undefined`. |
| Spread | `{ ...settings, fontSize: 20 }` | Makes a shallow copy and sets/overrides a property. |
| Destructuring | `const { path, params } = parseHash();` | Extracts named properties into variables. |
| Exception handling | `try { ... } catch (error) { ... }` | Familiar exception flow. `finally` runs after success or failure. |

JavaScript in this application is dynamically typed. You can write familiar loops and conditions, but browser APIs such as `document`, `localStorage` and `fetch` are new tools.

`const NC = window.NovelCast` is just a shorter local name for the same service object. It does not create a separate copy of the application.

### Arrays you must understand

From the project's patterns:

```javascript
const trending = books.filter(book => book.trending);
const selected = books.find(book => book.id === 'dracula');
const cards = books.map(book => NCPage.popularCard(book)).join('');
const firstSix = books.slice(0, 6);
```

- `filter`: keep every item whose callback returns truthy. Like a conditional list comprehension.
- `find`: return the first match or `undefined`.
- `map`: transform every item; here objects become HTML strings.
- `join('')`: concatenate those strings with no separator. Without it an array converted to text can introduce commas.
- `slice(0, 6)`: take the first six; does not remove them from the source.
- `forEach`: perform an action for each item, often attaching handlers.
- `some`: return true if any item matches.

### DOM: how JS changes HTML

The **Document Object Model** is the browser's tree of HTML elements.

```javascript
const button = document.getElementById('font-increase');
button.addEventListener('click', () => {
  document.getElementById('font-size-label').textContent = '18px';
});
```

Teaching example based on reader controls:

1. Find the button by its ID.
2. Register a callback; do not execute it immediately.
3. On a later click, the browser executes that callback.
4. Change another element's text.

`handler()` calls now. Passing `handler` supplies a function to call later. This difference explains `addEventListener('click', stop)` versus accidentally writing `stop()`.

| API/property | Use in this project |
| --- | --- |
| `getElementById('x')` | Find one element by ID. |
| `querySelector('.x')` | Find first CSS selector match. |
| `querySelectorAll('[data-book-link]')` | Find all elements carrying that attribute. |
| `textContent` | Read/write plain text. Preferred for untrusted messages. |
| `innerHTML` | Parse and insert HTML markup; escape dynamic text first. |
| `classList.add/remove/toggle` | Change classes, hence appearance/visibility. |
| `element.style.fontSize` | Set an inline CSS property. |
| `input.value` | Read the user's current input. |
| `button.disabled = true` | Prevent interaction while an operation runs. |
| `closest('a')` | Walk from clicked child to a matching ancestor. |
| `dataset.bookId` | Read `data-book-id` from HTML. |

`data-*` attributes connect markup to behavior. For example, a button can hold `data-favorite-toggle="dracula"`; its handler knows which book to update without a separate handler function for every book.

### Events and propagation

| Event | Concrete example |
| --- | --- |
| `click` | Favorite, theme toggle, next page. |
| `input` | Update search after typing. |
| `change` | Select file or choose a rating radio button. |
| `submit` | Login/signup form. |
| `keydown` | Reader arrows, Escape to clear search. |
| `scroll` | Scrolling-reader percentage. |
| `dragover`, `drop` | Library file drop area. |
| `hashchange` | Route navigation. |
| `DOMContentLoaded` | Start after HTML parsing. |

`event.preventDefault()` cancels a browser default action: form reload/navigation, link navigation or opening a dropped file. It does not cancel the remainder of your function.

`event.stopPropagation()` prevents the event bubbling to ancestor handlers. The browse-file button uses this so clicking it does not also trigger the enclosing upload card's file-picker handler.

**Event delegation:** attach one handler to a parent and inspect `event.target.closest(...)`. Theme switching and several route interactions use this pattern. It also works for descendants created later.

### Async, await and fetch

```javascript
// Simplified teaching example of data.js's catalog request.
async function loadBooks() {
  try {
    const response = await fetch('/api/books');
    if (!response.ok) throw new Error('Could not load books');
    const data = await response.json();
    return data.books;
  } catch (error) {
    console.error(error.message);
    return [];
  }
}
```

`fetch` starts an HTTP request and returns a **Promise**: a future completion or failure. `await` pauses this async function until that promise settles; it does not freeze the whole browser. `response.json()` asynchronously reads and parses the body. A 404/500 response needs an explicit status check; it is not automatically a network exception.

The real app uses its configured `API_BASE`, because frontend and backend normally run on different ports. The short relative URL above only illustrates the syntax.

`AbortController` can cancel a request or remove event listeners registered with its signal. It helps prevent a response updating a screen after the user has left it.

### Scope, closures and the module pattern

Many files wrap themselves in `(function () { ... })();`: define a function and invoke it immediately. Local variables stay private; a deliberate public object is placed on `window`.

A **closure** lets a callback remember surrounding variables. The login handler remembers `isSignUp` and `submitting`; the search callbacks remember `searchVersion`. This is why those variables still matter when a later event occurs.

In `render: function () { ... }`, the function is an object's method. When called as `view.render()`, `this` normally refers to that view. Arrow functions capture surrounding `this`, which helps callbacks use the enclosing view object.

## 6. CSS you need to explain

### Rule anatomy

Real example from `frontend/css/shell.css`:

```css
.nc-header-actions {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  gap: .75rem;
}
```

- `.nc-header-actions` selects elements with that class.
- `display: flex` arranges children using Flexbox; default direction is a row.
- `align-items: center` centers them across the row's perpendicular axis.
- `flex-shrink: 0` stops that item shrinking in its parent flex layout.
- `gap` separates children.

### Selectors, cascade and box model

| Syntax | Meaning |
| --- | --- |
| `.card` | Class selector. |
| `#app-view` | ID selector. |
| `.card img` | Image descendants of `.card`. |
| `.button:hover` | Pointer-hover state. |
| `button:disabled` | Disabled buttons. |
| `[aria-current="page"]` | Attribute selector, used for active navigation. |

The browser combines applicable rules using the **cascade**: importance, specificity and source order matter. An ID selector generally outranks a class selector; equally specific competing declarations usually resolve to the later declaration. The project uses some `!important` theme overrides.

An element's box has **content → padding → border → margin**. Padding is inside its border; margin is outside. A rounded corner is `border-radius`, a shadow is `box-shadow`, and `overflow: hidden` clips children extending beyond the box.

`px` is a CSS pixel; `rem` scales with the root font size; `%` depends on context; `vh`/`vw` relate to viewport dimensions. `clamp(min, preferred, max)` keeps a responsive value within limits.

### Flexbox versus Grid

Flexbox is convenient for one-dimensional rows/columns such as header actions. Grid is convenient for arranging book cards in rows and columns.

An actual home-grid class list:

```html
<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
```

It means: two columns at the base size; progressively more columns when each breakpoint is reached; a consistent gap. Breakpoint rules continue to apply above their minimum width until a later applicable rule changes them.

### Tailwind is CSS expressed through utility classes

| Utility | Meaning |
| --- | --- |
| `flex`, `grid` | Choose layout system. |
| `flex-col` | Stack flex children vertically. |
| `items-center` | Align items across the flex cross axis. |
| `justify-between` | Distribute free space between items along the main axis. |
| `p-4`, `px-4`, `py-2` | Padding all around, horizontally or vertically. |
| `mt-4`, `gap-4` | Top margin or spacing between children. |
| `w-full` | Width 100%. |
| `rounded-xl` | Rounded corners. |
| `text-sm`, `font-bold` | Text size and weight. |
| `bg-goldAccent` | A project-configured background color. |
| `bg-[#161B24]` | An explicit arbitrary background color. |
| `hover:scale-110` | Scale on hover. |
| `transition-transform` | Animate transform changes. |
| `hidden` | `display: none`. Used by login tabs and reader modes. |
| `sr-only` | Visually hidden content available to screen readers. |

You do not need to memorize thousands of utility names. Be able to decode one card or button and say which classes control layout, spacing, typography, color and interaction.

### Responsive rules and 3D effects

`reader.css` changes the layout below 1024 CSS pixels, hiding the right page so narrow screens show one page. JavaScript's `buildSpreads()` uses the matching 1024px threshold to group one or two logical pages.

The reader's `perspective: 2200px`, `transform-style: preserve-3d`, and rotating leaf create a book-turn effect. Perspective changes perceived depth; `rotateY` turns around the vertical axis; transform origin places the hinge at a page edge. This is a CSS/browser effect, not an external 3D engine.

Landing animation combines CSS transforms and JavaScript-set values. A reduced-motion preference disables/reduces relevant movement. That is an accessibility feature for people who find animation uncomfortable.

### Theme variables

`theme.css` defines values such as `--nc-paper` and `--nc-ink` in `:root`. Rules read them with `var(--nc-paper)`. Light mode replaces their values under `html[data-theme="light"]` and adds overrides. `theme.js` changes that attribute and saves the selected theme.

## 7. File-by-file function map

Start with the first five files below. Audio internals and ingestion are lower priority tonight.

### `router.js`: screen navigation

| Function | Responsibility |
| --- | --- |
| `parseHash()` | Read the hash, choose a valid route, parse query parameters; fall back to landing. |
| `updateActiveNav()` | Set active navigation styling and `aria-current`. |
| `renderRoute()` | Guard the library, clean up old view, insert markup, initialize new view, bind controls. |
| `handleRouteChange()` | Render after hash changes; coordinate optional cover-to-page transition. |
| `interceptLinks()` | Convert old `.html` links into equivalent SPA hash routes. |
| `openBook()` | Store transition information and set the destination hash. |
| `navigate()` | Turn route name/parameters into a new hash. |
| `init()` | Register hashchange/click handling and render the initial screen. |

The client library guard improves navigation UX. Real protected server operations still need server-side identity verification.

### `data.js`: shared data and browser state

`window.NovelCast` is the main public object. It includes these groups:

| Functions/data | Responsibility |
| --- | --- |
| Metadata presets and baseline books | Curated display information so the app can initially show a shelf. |
| `cleanTitle()` | Simplify source titles for display. |
| `transformBackendBook()` | Convert an API book into the frontend's expected fields, genre, cover and duration estimate. |
| `loadSettings()`, `saveSettings()` | Read/write account settings through the library service, with defaults. Their existence does not prove every reader control calls them. |
| `loadState()`, `saveState()` | Read/write the active account cache through the library service, schedule JSON sync, and announce changes with `novelcast:state`. |
| `normalizeBook()` | Supply default display metadata to a private upload record. Generated default chapter labels are not extracted file content. |
| `resolveId()` | Handle known aliases/IDs. |
| `getExactBook()` | Return the requested catalog book or current user's upload record, otherwise null. |
| `getBook()` | Convenience lookup with first-book fallback. Use exact lookup when displaying a specific requested resource. |
| `bookUrl()` | Construct a link with encoded book/chapter parameters. |
| `readQuery()`, `setQuery()` | Read URL values or update URL query parameters. |
| `escapeHtml()` | Encode text characters such as `<` before insertion into HTML. |
| `starIcon()` | Generate a star icon fragment. |
| `ensureEntry()` | Create a default state record for a book if absent. |
| `saveBookState()` | Merge a partial change into a book's state and save it. |
| `libraryAllIds()`, `statusOf()` | Query generic catalog-state entries. |
| `toast()` | Show a short-lived message and replace any previous hide timer. |
| `getUserUploadsKey()`, `getUserUploads()` | Legacy key helper and current account-scoped metadata access; the active app delegates reads to the library service. |
| `addUserUpload()` | Add metadata to that list; report storage failure. |
| `updateUserUploadProgress()` | Set an upload's progress, bounded between 0 and 100. |
| `deleteUserUpload()` | Filter a record out of that list. |
| `fetchCatalog()` | Request books/ratings, update catalog indexes/cache and announce data arrival. |
| `fetchBookDetails()` | Fetch exact book metadata and chapter summaries. |
| `fetchChapter()` | Fetch exact chapter text; verify identity and reject unsuitable preview/mismatched content. |
| `searchCatalog()` | Request server search; return null on failure so existing local results remain useful. |
| `setBookRating()` | Update the in-memory rating shown by catalog components. |

Some displayed listening counts, narrator labels, genre counts and duration values are curated or estimated. They are not all live analytics. Community ratings have a separate real aggregation flow.

### `app.js`: bind shared interactions

- `syncFavorite()` sets icon/class/`aria-pressed` from saved state.
- `installBookLinks()` attaches navigation to elements carrying book-link attributes.
- `installFavoriteToggle()` flips `favorite`, saves state, displays feedback.
- `installLibraryToggle()` marks a catalog record saved in account state, which schedules JSON sync.
- `installAudioOffLinks()` delegates to the audio player's binding service; the name is historical.
- `bindInteractiveElements()` installs all shared behaviors for a document/subtree.
- `toggleAudio()` delegates playback to `NovelCastAudio`.

The `data-...-bound` markers prevent attaching the same handler twice to an existing element.

### `ui.js` and `pages.js`: reusable HTML

`ui.js` provides `stars()`, `cover()` and `findBook()`. Internally `safeCoverUrl()` checks cover URLs; `fallbackCoverSvg()` produces an illustrated replacement when needed.

`pages.js` exports `window.NCPage` with:

- `landingShelf()` — linked bookshelf books.
- `featuredCard()`, `popularCard()` — home/search book cards.
- `libraryHeroCard()`, `savedCard()` — reusable library-style card templates.
- `searchHighlight()`, `genreCard()` — search presentation helpers.
- `detailHero()` — book information and primary actions.
- `chapterList()` — links to reader chapters and chapter audio controls.
- `reviews()` — the container where `ratings.js` mounts real ratings.
- `likeRow()` — other catalog recommendations.

**Template helpers are not separate routes.** `libraryHeroCard()`, `savedCard()`, `searchHighlight()` and `genreCard()` have no current callers elsewhere in the frontend JavaScript. A function's existence is not evidence of a visible feature. Recommendations here are a simple selection of other books, not a personalized machine-learning system.

### All seven view controllers

| View | Important functions/behavior |
| --- | --- |
| `homeView` | `render()` selects featured/popular books and builds sections. `init()` binds controls and listens once for live catalog arrival, then rerenders. `destroy()` aborts that listener. |
| `searchView` | `selectFilter()` marks the active chip. `performSearch()` renders local matches, then merges server matches. `renderResults()` builds cards/empty state and rebinds them. Input uses a 180ms debounce; `searchVersion` rejects stale responses. |
| `bookDetailsView` | `render()` composes detailHero, chapterList, ratings and recommendations. `init()` fetches full chapter summaries and mounts ratings. Cleanup aborts listeners and unmounts ratings. |
| `libraryView` | `render()` builds the plan form, sync/download panel and metadata shelf; `renderSavedBooks()` builds saved catalog cards. `init()` attaches submit, retry, download, import, remove and file handlers. `paintStatus()` shows truthful sync feedback. `refresh()` rebuilds the view while retaining an unsaved plan draft. `handleFile()` records file metadata with timer-driven progress. `destroy()` cancels timers/listeners. |
| `loginView` | `activateSignIn()`/`activateSignUp()` change tabs and field visibility. `showAlert()`/`hideAlert()` handle feedback. Submit callback reads fields, locks controls, calls auth, handles confirmation or redirects, restores controls in finally. |
| `readerView` | `updateFont()` clamps size to 13–26px and repaginates. `setMode()` switches book/scroll layout. `formatPara()` escapes and formats prose. `paginateChapter()` measures text; `buildSpreads()` groups pages; `renderSpread()` updates visible content and turns; `goTo()` changes chapter. |
| `landingView` | `mountLandingBookDial()` manages carousel positions, selection, drag and keyboard controls. Helpers include `placeBooks`, `measure`, `select`, `snap`, `step`, `stop`, `endDrag`. `init()` manages background motion and cover-opening navigation. |

### `auth.js`: account service

| Function/group | Responsibility |
| --- | --- |
| `getEnvCredentials()` | Read public provider configuration. |
| `getClient()` | Lazily create/reuse the Supabase client. |
| `authFetch()` | Network wrapper with a 12-second abort timeout and signal cleanup. |
| `authError()` | Convert network/rate-limit failures to readable messages. |
| `authRequest()` | Call a provider method and normalize errors. |
| `getStoredUser()`, `setStoredUser()` | Read/write cached user metadata; not a password file. |
| `dispatchAuthChange()` | Notify registered callbacks and emit an account event. |
| `init()`, `restoreSession()` | Initialize once, subscribe before reading the session, and stop a late initial response from undoing a newer sign-out. |
| `getUser()`, `isAuthenticated()` | Provide current cached account information and a frontend auth check. |
| `getAccessToken()` | Obtain a token; detect a changed session account before a request can use the previous account cache. Return no token during sign-out. |
| `onAuthStateChange()` | Register a listener and immediately give it current state. |
| `signUp()` | Request an account; wait for email confirmation if no session is returned. |
| `signIn()` | Submit credentials; require a returned session before reporting success. |
| `resendConfirmation()` | Request another confirmation email. |
| `signOut()` | Clear private account state immediately, attempt remote sign-out, clear again and navigate home. |

Supabase handles credentials/session issuance. Your browser cache is for responsiveness; it is not authoritative server authorization. A cached user object can be edited locally, so both the ratings and library servers verify the token independently.

### `theme.js`, `profile.js`, `ratings.js`

`theme.js`: `normalizeTheme()` accepts supported names; `readSavedTheme()` reads browser preference; `setTheme()` changes root attributes/classes and saves; `getTheme()` returns active mode; `toggle()` switches; `syncToggles()` updates button labels and pressed states.

`profile.js`: `photoUrl()` chooses a safe provider image; `initials()` derives fallback letters; `init()` listens for account changes and updates the header link/photo. Broken images leave initials visible.

`ratings.js`: `request()` gets a token and sends GET or PUT; `mount()` installs a widget; inner `load()` fetches ratings and `paint()` builds summary/distribution/star controls. A change listener submits the selected score. The returned cleanup function aborts pending activity.

### `audioPlayer.js`: lower-priority internals

Main idea: request manageable pieces of chapter narration, play one, prepare one next piece, then advance.

| Function/group | Responsibility |
| --- | --- |
| `toPlainText()`, `takeChunk()`, `chunkText()` | Clean text and split bounded narration passages. |
| `findBook()`, `getState()`, `render()` | Resolve requested book and expose/display player status. |
| `playBook()`, `toggle()` | Start/select a book or pause/resume an existing session. |
| `request()` | Fetch JSON/audio with cancellation/error handling. |
| `passage()` | Get exact chapter content, take a passage, request `/tts`, build an audio track. |
| `prefetch()` | Prepare one upcoming track. |
| `advance()`, `installCurrent()`, `playCurrent()`, `played()` | Move playback forward and manage the active track. |
| `pause()`, `resume()`, `retry()` | User playback controls and recovery. |
| `alive()` | Reject work belonging to an old playback session/epoch. |
| `fail()` | Set an honest playback error state. |
| `release()`, `abortRequests()`, `stop()` | Release audio/object URLs, cancel requests and clear playback. |
| `bind()`, `init()` | Connect book audio buttons and shared player controls. |

The first passage is about 350 characters and later passages about 900. This helps the first audio start sooner while limiting future work. Audio synthesis goes through the backend; it is not the browser's built-in speechSynthesis API. Legacy `data-audio-stub` naming does not mean all playback is a stub.

### `components/pixelCard.js`: Canvas animation

`Pixel` represents one animated square, with `draw()`, `appear()`, `disappear()` and `shimmer()`. `PixelCardInstance` manages the canvas, pixels, resize/events and animation loop. Its `initPixels()`, `doAnimate()`, `handleAnimation()` and `destroy()` set up, run and clean up the effect. `getEffectiveSpeed()` adjusts speed for reduced motion. `PixelCard.init()` creates an instance; `autoInit()` scans a scope.

Canvas draws pixels inside an HTML `<canvas>`; it does not create a separate HTML element for every square. This visual effect is independent of whether a selected book's contents are actually imported.

## 8. Trace the important flows completely

### A. Login form: the best second-evaluation explanation

Read `loginView.js` around lines 148–180 and 397–480.

1. Form markup declares required email and password fields.
2. `type="email"` gives native email-format checking; `minlength="6"` constrains entered password length. These are basic format checks, not proof of account identity or password strength.
3. For normal user submission, invalid fields prevent the browser's normal submission process. No network request is necessary to show this validation.
4. The submit event handler calls `e.preventDefault()` so the browser does not perform the form's default navigation/reload.
5. It reads `.value`; email/name use `.trim()` to remove surrounding whitespace.
6. It checks `submitting`/`disposed` to avoid duplicates or outdated work.
7. It disables buttons and shows the spinner.
8. Sign-up calls `auth.signUp(email, password, { data: { full_name: fullname } })`; sign-in calls `auth.signIn(email, password)`.
9. The auth service submits through the Supabase client and checks errors/session results.
10. A sign-up requiring confirmation shows a confirmation notice rather than claiming a signed-in session.
11. A successful sign-in navigates to the redirect route or library.
12. `catch` displays readable errors; `finally` restores controls.

Although the markup says `method="POST"` and `action="#authenticate"`, **the active JavaScript intercepts submission**. The form action is not an Express authentication endpoint in this application.

### B. Search: event handling and asynchronous safety

```text
Typing → input event → reset 180ms timer
  → performSearch()
  → filter current books → render immediately
  → await backend search → merge by ID → render if still current
```

Debouncing delays work until typing pauses briefly. Clearing the previous timeout prevents every keystroke starting its own delayed search. `searchVersion` solves a different problem: an older slow response must not overwrite a newer query's results.

### C. Favorite: a small state-persistence example

The essential code in `app.js` follows this sequence:

```javascript
const state = window.NovelCast.loadState();
const entry = window.NovelCast.ensureEntry(state, id);
const isFav = !entry.favorite;
entry.favorite = isFav;
if (isFav && !entry.status) entry.status = 'saved';
window.NovelCast.saveState(state);
```

Read it as: load → find/create record → flip boolean → update → save. `saveState` delegates account caching and scheduled JSON synchronization to the library service, then emits an event; listeners synchronize favorite icons.

The state helper now writes through `librarySync.js`: the account's browser cache updates immediately, then the authenticated API saves the account JSON file. The library displays saved catalog books as well as manuscript metadata.

### D. File selection: be precise

Browse button or drop event → obtain `File` object → `handleFile(file)` → validate extension → calculate display size → timer animates progress → create metadata object → `addUserUpload()` updates the account cache and schedules JSON sync → refresh.

An example record contains `id`, `title`, `author`, `format`, `size`, `progress`, `uploadedAt`, `lastRead`. It does not contain the original manuscript. Selecting an allowed extension also does not verify file contents. A `.btn-quick-progress` handler exists to add 20 percentage points, but the current template does not render that button. Do not promise a visible progress control or measured reading completion.

### E. Reader: data, layout and algorithm

Route identifies book/chapter → `fetchChapter()` requests backend → verify result → split text into paragraphs → paginate → group spreads → render and attach navigation.

The pagination algorithm creates an invisible measuring element with the target width/font. It adds text and compares `scrollHeight` with available height. If a paragraph is too long, binary search finds how many words fit. Remaining words continue on the next page. The measuring element is removed afterward.

Why not simply “500 words per page”? The same words occupy different heights when screen width, font size or word lengths change. Measuring the browser's rendered layout accounts for that.

Desktop uses two-page spreads; narrow screens use one. Font size or layout changes require repagination. Page turns and chapter changes are different actions: one changes the current spread; the other fetches a different chapter.

Scrolling percentage is approximately:

```javascript
100 * scrollTop / (scrollHeight - clientHeight)
```

`scrollTop` is distance already scrolled; `scrollHeight - clientHeight` is the maximum scrollable distance. The code handles the non-scrollable case rather than dividing by zero.

### F. Rating: form-like control plus real persistence

Select star radio button → change handler → obtain access token → PUT `{score}` to backend → backend verifies account with Supabase → validates integer 1–5 → upserts one Atlas record per user/book → returns average/count/distribution → repaint widget.

This is a strong example of frontend validation/UX plus server-side validation. It is still not local JSON-file saving.

## 9. Storage: JSON text is not a JSON file

| Mechanism | What it actually stores | Current use |
| --- | --- | --- |
| JS variable | In-memory data until context ends/reloads | Current search, loaded books, player state. |
| localStorage | Strings in browser storage for an origin/profile | Device theme, cached auth metadata, and separate library/plan/settings/upload caches per account, including pending edits. |
| Local `.json` file | Actual file on disk containing JSON text | Submitted reading plans and library data in private backend files; Download JSON provides a user copy. |
| Supabase | Account/session information through an external service | Sign-up/sign-in. |
| MongoDB Atlas | Hosted database documents | Books, chapters, ratings. |

**Origin includes scheme, hostname and port.** `localhost:3000` and `127.0.0.1:3000` have separate browser storage. Use one consistently in the demo.

```javascript
const record = { title: 'Dracula', progress: 20 };
const text = JSON.stringify(record); // object → JSON string
const restored = JSON.parse(text);   // JSON string → object
```

After `stringify`, `text` is a string. It is not automatically downloaded or written anywhere.

Example browser-state shape:

```json
{
  "library": {
    "dracula": {
      "status": "saved",
      "favorite": true,
      "chapter": 1,
      "page": 0,
      "bookmarks": []
    }
  },
  "collections": []
}
```

The existence of fields such as `bookmarks` in a default object does not establish a complete bookmark UI.

### How the file requirement is now satisfied

The application now implements both parts:

1. The reading-plan form validates daily minutes and favorite genre. Download JSON exports the current library and plan as a real file.
2. The account service submits the document to `PUT /api/me/library`; Express verifies identity, validates fields, and writes a private per-account file using Node's filesystem API. `GET /api/me/library` restores it. This also provides evidence for the third evaluation's local JSON API requirement.

Ordinary webpage JavaScript cannot silently write arbitrary project files on your computer. It can offer a download or use supported file-access mechanisms with the required user interaction. Node can write files on the server machine. “Local” for a deployed backend means the server filesystem, not automatically the visitor's laptop.

Generating `frontend/env.json` still does not count as submitted-data storage. Use the reading-plan submission and its account library file as your evidence. Passwords/session credentials are excluded from the stored document and download.

### The flow to explain

```text
HTML form
  → browser constraints (required, min, max, step, maxlength)
  → submit event + preventDefault()
  → saveReadingPlan() checks the values again
  → account-scoped localStorage cache (immediate, works while API is unavailable)
  → debounced authenticated GET /api/me/library
  → compare cached edits with the latest server document
  → PUT /api/me/library with the expected revision
  → Supabase verifies the Bearer token and supplies the account identity
  → server validates the entire submitted document
  → Node writes a temporary JSON file and atomically renames it
  → server replies with an increased revision
  → browser updates cache and displays synced status
```

**Why both storage mechanisms?** localStorage gives immediate access and holds pending edits. The backend JSON file restores the account's data in another browser/device that reaches the same backend. A download gives the user a separate, portable copy. localStorage itself is still not a `.json` file.

**Where is “local”?** The account file is local to the backend machine. With a locally running backend, it is on this computer. A visitor's downloaded JSON goes to their own downloads folder. Cross-device sync requires both devices to reach the same backend; a localhost backend is not automatically reachable from another computer.

### Files and key functions

| File | Responsibility |
| --- | --- |
| `frontend/js/views/libraryView.js` | Render plan form, validate/submit, display sync status, trigger download, show/remove saved books. Preserve an unsaved form draft when synced data refreshes the page. |
| `frontend/js/librarySync.js` | Hold the active account's document, cache locally, migrate old account upload metadata, schedule network sync, merge conflicts, export JSON. |
| `frontend/js/data.js` | Existing library/settings/upload helpers delegate to the new account service. Catalog fetching stays separate. |
| `frontend/js/auth.js` | Restore a session once; notify changes; obtain tokens; clear private state immediately on sign-out. |
| `frontend/index.html` | Wait for initial session restoration, initialize account storage, then start routing. |
| `frontend/js/router.js` | Rerender account-dependent screens when identity changes; remove private library DOM when signed out. |
| `backend/src/routes/libraryRoutes.js` | GET/PUT routes, server-side identity verification, safe HTTP errors. |
| `backend/src/services/libraryJsonStore.js` | Validate allowed fields, hash filenames, read/write actual JSON, serialize writes, compare revisions. |

Important functions in `librarySync.js`:

- `switchAccount()` cancels old requests, changes cache, emits refresh, and schedules a fresh load. A response from an older account cannot replace the current account's data.
- `change()` changes a section, marks it pending, writes the browser cache, and schedules sync.
- `synchronize()` reads the server copy, merges local edits, submits changes, and updates the displayed status.
- `merge()` / `combine()` compare the last acknowledged server copy, local edits and new server data. Unchanged fields take the remote value; locally edited fields win if the same field changed in both places. Uploads merge by ID; deletions are retained.
- `download()` serializes the current device snapshot with `JSON.stringify`, creates a JSON `Blob`, clicks a temporary download link, and releases the temporary object URL.

Important backend ideas:

- **Authentication:** the backend asks Supabase to verify the token. It does not trust an account ID submitted by the browser.
- **Validation:** unknown fields such as `password`, `access_token`, or `userId` are rejected. Text lengths, numbers, arrays, identifiers and file size are bounded.
- **Revision check:** if another save already changed revision 4 to 5, a request expecting 4 receives HTTP **409 Conflict** with the latest document. The browser merges and retries instead of blindly overwriting.
- **Atomic save:** write and flush a temporary file before renaming it over the previous file. A failed save is reported as failed; a corrupt existing JSON file is not silently replaced with an empty library.

### Data stored

The document contains `schemaVersion`, `revision`, `state` (saved books/favorites and existing state fields), `uploads` (metadata only), `settings`, and `readingPlan`.

Each browser cache uses `novelcast.library.v1.<account-id>`, holding the document, last acknowledged server copy, and pending flag. Guests use a separate `guest` key. Old account-keyed upload metadata is migrated. The old shared `novelcast.state.v1` bookmarks stay with the guest/device because their account ownership cannot be established; they are not silently assigned to the next person who signs in. **Add my older device bookmarks** explicitly copies missing entries into the current account without replacing its existing entries. Use it only for your own older bookmarks.

The active reader still does not save every page turn or font-size change through the generic storage helpers. This change does not implement manuscript contents/parsing, JSON import, password storage, or full MongoDB CRUD.


### Trace the reading-plan submit handler line by line

The following is a shortened teaching version of the real handler in libraryView.js:

```javascript
planForm.addEventListener('submit', event => {
  event.preventDefault();
  if (!ownsView() || !planForm.reportValidity()) return;
  const saved = service.saveReadingPlan({
    dailyMinutes: Number(planForm.elements.dailyMinutes.value),
    favoriteGenre: planForm.elements.favoriteGenre.value.trim()
  });
  // The real handler shows local-save feedback or a failure message.
});
```

1. Register the callback for form submission, including Enter-key submission.
2. Stop normal navigation/reload with preventDefault.
3. ownsView checks that this view still belongs to the current account. reportValidity checks the HTML constraints and displays a browser message if invalid.
4. Input values are strings. Number converts minutes into a number; trim removes surrounding whitespace from genre.
5. saveReadingPlan checks that minutes is an integer from 5 through 240 and genre is a string no longer than 80 characters.
6. It updates the account document and writes the browser cache immediately, then schedules network sync. Its boolean result describes the local save; it does not mean the backend has finished.
7. Sync emits novelcast:library-sync; paintStatus updates the status text. It emits novelcast:library-loaded when merged data is ready; the view refreshes without discarding an unsaved draft.

A programmatically dispatched submit event can bypass the browser's usual submission path, which is why the handler explicitly calls reportValidity as well. Backend validation is still necessary because someone can send HTTP requests without this page.

### Read the JSON shape

```json
{
  "schemaVersion": 1,
  "revision": 1,
  "state": { "library": {}, "collections": [] },
  "uploads": [],
  "settings": {},
  "readingPlan": { "dailyMinutes": 35, "favoriteGenre": "Mystery" }
}
```

schemaVersion identifies the data format; revision identifies the save version. state.library holds book entries, uploads holds manuscript metadata, settings holds values saved through the settings helpers, and readingPlan holds the submitted fields. The cache also holds a base document (the last server copy acknowledged) and pending flag. The download contains the library document, not this entire cache envelope or auth storage.

### Explain a conflict with an example

Both tabs start from revision 4. Tab A saves a favorite and receives revision 5. Tab B submits its reading-goal change expecting 4: the server replies 409 with revision 5. The client compares its original base, local document and latest server document; it keeps A's favorite and B's goal, then retries against revision 5. The successful result is revision 6. When both sides edit the same field, the local edit wins in this merge policy. This is bounded retry, not a claim that every simultaneous edit has a perfect outcome.

### Function names for the new service

| Function | Explain it simply |
| --- | --- |
| init | Subscribe once to account changes, storage updates, focus and connectivity. |
| getSection / setSection | Read a copy of state/settings or change an allowed document section. |
| getUploads / setUploads | Read/write metadata only for the current owner. |
| getReadingPlan / saveReadingPlan | Read plan values or validate and save submitted values. |
| getStatus | Return the current phase/message for the UI. |
| sync | Start a sync, or reuse the one already in progress. |
| loadCache / persist | Read/write the account cache, handling malformed or unavailable browser storage. |
| validSnapshot / equal | Check document shape; compare values without depending on object-key order. |
| schedule / request | Debounce synchronization; request the API with token, timeout and account checks. |
| publish / loaded | Dispatch events to update status and render newly available data. |
| hasDeviceBookmarks / importDeviceBookmarks | Offer an explicit copy of older guest bookmarks, preserving existing account entries. |

### Authentication sync: three cases to explain

- **Reload:** await initial session restoration before selecting the account cache and routing. This prevents redirecting an existing signed-in user too early.
- **Sign in/account switch:** the account event changes the cache, aborts the previous request and schedules a new load outside Supabase's synchronous callback. A generation counter identifies old responses so they cannot overwrite the next account's data.
- **Sign out, including another tab:** clear private state immediately and rerender/guard the library route. A slow remote sign-out or late session response must not restore the old private screen. The browser's storage event updates same-origin tabs; Supabase also supplies session-change events.

There is no continuous background polling. Sign-in, edits, focus, reconnect and Sync now trigger checks. The JSON store coordinates writes within one backend process. Production hosting needs durable disk and shared coordination for multiple writer processes. These limits do not turn a failed request into a successful save.

## 10. Backend overview for later evaluation

### Vocabulary

- **Node.js:** runtime that executes JavaScript outside the browser. Provides server capabilities such as filesystem access.
- **Express:** library for HTTP routes and middleware, running on Node.
- **API endpoint:** an HTTP method plus path that accepts/returns a defined kind of data.
- **MongoDB Atlas:** hosted MongoDB database service.
- **Mongoose:** library defining document schemas, constraints and database queries.
- **Middleware:** function in a request-processing chain, e.g. JSON parsing, CORS or logging.
- **CORS:** browser-enforced rules for cross-origin access; it is not an authentication mechanism.

### Server startup and request flow

`backend/index.js` creates `express()`, configures CORS/logging, mounts operator ingestion with its authorization/parser order, installs general JSON parsing, and mounts health/catalog/ratings/library/audio routes. Unknown paths receive 404; error middleware formats failures.

`start()` opens the HTTP listener (default 4000) and begins the Atlas connection. The server can be listening while the database is disconnected. `/api/health` distinguishes healthy from degraded with a status code and connection information. Signals close the listener/database gracefully.

```text
Browser fetch → Express route → validate request
  → Mongoose model → Atlas → JSON response → browser renders HTML
```

`req.params` holds values from paths such as `/books/:id`. `req.query` holds `?search=...`. `req.body` holds parsed JSON submissions. `res.status(...).json(...)` sends the response.

### Actual endpoints

| Method/path | Purpose |
| --- | --- |
| `GET /api/health` | Database-aware health. |
| `GET /api/me/library` | Verify the account and retrieve its JSON library, or defaults before its first save. |
| `PUT /api/me/library` | Verify identity, validate and save its JSON library with a revision check. |
| `GET /api/books` | Catalog search/filter/sort/pagination. |
| `GET /api/books/:id` | Metadata and chapter summaries. |
| `GET /api/books/:id/chapters/:chapterNum` | Exact chapter text and navigation. |
| `GET /api/ratings` | Rating summaries for catalog cards. |
| `GET /api/books/:id/ratings` | One book's summary and optional account rating. |
| `PUT /api/books/:id/ratings` | Create/update verified user's score. |
| `GET /api/ingest/curated` | Curated import definition. |
| `POST /api/ingest` | Authorized operator imports a book. |
| `POST /api/ingest/curated` | Authorized curated import. |
| `POST /api/tts` | Generate narration audio for a text passage and book. |

GET retrieves; POST commonly submits/creates/triggers work; PUT here saves a user's rating or replaces the account library document using a revision check. No DELETE route is currently exposed. Removing a saved book changes the document and sends PUT; it is not an HTTP DELETE request.

### Models

| Model | Main stored information | Why separate? |
| --- | --- | --- |
| Book | Identity/slug, source ID, title, author, cover, subjects, description, totals, saved narration voice | Lightweight catalog and metadata. |
| Chapter | Book reference, chapter number/title, content, word count/order | Browse books without downloading entire novels; fetch one chapter. |
| Rating | Book slug, verified user ID, integer 1–5 | One editable rating per user/book, enforced by compound unique index. |

A **slug** is a readable URL identifier such as `pride-and-prejudice`. A Mongo `_id` is a database document identifier. A source ID identifies a book at its provider. They serve different purposes.

### Routes, services and utilities

| File | Important functions/purpose |
| --- | --- |
| `config/env.js` | Read/normalize config. `lookup()` implements config lookup; secrets remain on server. |
| `config/db.js` | `connectDB()`, retry handling, `disconnectDB()`, `connectionState()`. |
| `routes/catalogRoutes.js` | `normalizeBookId()`, `idQuery()`, `positiveInteger()`, `boundedFilter()` validate requests; `toChapterSummary()`/`toCatalogPage()` shape responses; Gutenberg loaders/cache support exact curated fallback text. |
| `routes/libraryRoutes.js` | `verifiedUser()` checks Supabase identity; `createLibraryRouter()` handles authenticated GET/PUT and safe errors. |
| `services/libraryJsonStore.js` | `normalizeDocument()` validates data; `createLibraryJsonStore()` returns `read()`/`save()` with hashed filenames, serialized writes and revision checks. |
| `routes/ratingRoutes.js` | `verifiedUser()` validates token with Supabase; `findBook()` resolves book; `summary()` calculates rating statistics. |
| `routes/ingestRoutes.js` | Restrict imports to authorized operators, parse bounded inputs and invoke services. |
| `routes/ttsRoutes.js` | `createTtsRouter()` validates input, limits concurrency and streams narration. |
| `services/ingestService.js` | `ingestBook()` coordinates metadata/text/import/save; `ingestCurated()` imports selected shelf books sequentially. |
| `services/gutendexService.js` | Obtain source catalog metadata/text locations. |
| `services/openLibraryService.js` | Match cover/description metadata. |
| `services/textCleaner.js` | `cleanGutenbergText()` removes source wrappers/front matter and cleans paragraphs/typography. |
| `services/chapterParser.js` | `parseChapters()` detects chapter boundaries with fallback strategies. |
| `services/fishAudioService.js` | `validateTtsText()` bounds text; `requestFishAudio()` calls synthesis provider. |
| `services/narrationVoiceService.js` | `createNarrationVoiceResolver()` resolves/reuses a saved per-book voice. |
| `config/narrationVoices.js` and saved voice JSON | Voice catalog/assignments for consistent narration. Not submitted form storage. |
| `utils/httpClient.js` | `request()`, `fetchText()`, `fetchJson()` centralize timeouts/retries/decoding. |

Route code decides whether a request is acceptable and how to respond. Service code performs reusable work. Model code describes/query stored records. This separation prevents every endpoint from duplicating import/network/database logic.

### Ingestion flow

Operator request/seed → source metadata → download original text → clean → parse chapters → find cover/description → upsert Book → replace its Chapter records → save totals/voice assignment → return import result.

This changes stored data. It is not needed for ordinary startup or a casual demonstration.

### Narration flow

Browser obtains chapter → splits passage → POST `{text, bookId}` → backend resolves saved book voice → Fish Audio synthesis using fixed `s2.1-pro-free` → MP3 response → browser Audio playback → prepare next passage.

The API key stays on the backend. Voice identity is reused across chunks. Audio success depends on backend/provider availability; it is not a guaranteed offline feature.

### Third-evaluation readiness

| Requirement | Current position |
| --- | --- |
| External APIs | Present in source for books/covers/auth/narration. |
| Node and Express | Present. |
| Save/fetch records via local JSON APIs | Implemented through GET/PUT `/api/me/library` with per-account disk files. |
| MongoDB CRUD | Reads plus create/update through ingestion/ratings exist; complete user-facing CRUD is missing. |

CRUD means Create, Read, Update, Delete. Removing an upload record from localStorage is not MongoDB deletion. Internal `deleteMany()` during reimport is not a demonstrated HTTP DELETE workflow for users. Do not claim full CRUD until the complete intended resource operations are implemented and demonstrated.

## 11. Tooling and tests

`package.json` defines commands and dependencies. Root tooling serves/builds/tests the frontend; `backend/package.json` manages the server's dependencies and scripts. Lockfiles make dependency installation reproducible.

| Utility | Purpose |
| --- | --- |
| `scripts/generate-env.js` | Copies selected public configuration into generated browser files. Runs before frontend start/dev. |
| `scripts/build-css.js` | Scans HTML/JS/component sources; generates Tailwind through PostCSS/autoprefixer into `site.css`. |
| `scripts/inspect.js`, `screenshots.js` | Development inspection/screenshots. |
| Design-import scripts | Help import reference material; not part of normal reader/login runtime. |
| `backend/src/scripts/seedCurated.js` | Imports curated catalog data; modifies Atlas. |
| `backend/src/scripts/smokeTest.js` | Checks a running API; depends on network/services. |

`node:test` supplies the test runner. JSDOM simulates a browser document for isolated JS/DOM checks. Playwright automates a real browser. A mocked isolated test can verify behavior without proving the live provider is available.

The implementation was verified with **26 passing checks**: 7 authentication reliability checks, 4 JSON API/file checks, 12 browser-cache/sync checks, 2 ratings checks, and 1 full browser-flow check. The full browser flow used desktop and mobile sizes, fake accounts and temporary real JSON files; it checked form validation, disk writes, cache recovery, downloads, offline retry, older-bookmark import, account separation and cross-tab sign-out. This does not prove that live Supabase, Atlas or narration providers are reachable on evaluation day. No live accounts were created or verification emails sent for these tests.

| Command | What it checks |
| --- | --- |
| `npm run test:library` | Isolated JSON API/file and frontend sync tests. |
| `npm run test:auth:reliability` | Session restoration, sign-out, errors, timeout and form reliability. |
| `npm run test:library:browser` | Full local browser-to-file/download workflow with simulated accounts; installed Chrome required. |
| `npm run test:ratings` | Rating API and interface regressions. |

## 12. Run and demonstrate the project

From the repository root, use two terminals if the servers are not already running:

```powershell
npm run dev
```

```powershell
npm --prefix backend run dev
```

Frontend: `http://127.0.0.1:3000/`. Health: `http://127.0.0.1:4000/api/health`. Check existing listeners before starting duplicates. Use the server rooted at `frontend/`; do not serve the whole repository because it contains local configuration.

If dependencies are absent, the project commands are `npm ci` and `npm --prefix backend ci`. Do not reinstall them unnecessarily before a working demo.

### Suggested 7-minute demonstration

1. **Landing:** explain HTML/CSS/JS roles; use shelf controls and open a book.
2. **Home/search:** show linked routes, type a title, change a genre, clear search. Explain the input event and debounce.
3. **Details:** explain route parameter, reusable templates and chapter links.
4. **Reader:** turn a page, change font size, switch scrolling mode. Explain one/two-page responsiveness. Do not describe the scrolling layout as a real PDF engine.
5. **Login validation:** submit blank fields, malformed email and too-short password. These demonstrate native validation without creating an account or sending an email.
6. **Submission:** if a working existing demo account is available, sign in once. Explain disabled controls, spinner, await, catch/finally and success redirect. Do not create accounts/send emails just to rehearse validation.
7. **Reading-plan validation:** open My Library, enter 4 minutes, and attempt submission. Explain `min="5"`, `max="240"`, `step="1"` and `required`. Enter 35 and “Mystery”, then submit. Explain the submit event, preventDefault, field values and saveReadingPlan.
8. **Actual disk saving:** wait for “Your library is synced to your account.” Show the new file in `backend/data/libraries/`, opening only that library file. Point out `readingPlan.dailyMinutes`, `favoriteGenre` and `revision`. The file is first created after a successful changed-data save; merely signing in does not create an empty file.
9. **Download:** click Download JSON, open the downloaded file, and show the plan and saved-book data. Explain that it comes from the current device snapshot and includes pending edits; it is not proof of a successful server save by itself.
10. **Persistence:** reload and show the plan remains. If time allows, sign out/back in or use another existing account to demonstrate separation. Both devices must reach the same backend for cross-device recovery.
11. **Optional metadata demo:** select a harmless file and explain that title/format/size are stored, not its contents. Older shared bookmarks require the explicit import button. Do not overwrite/delete valuable personal data during the demo.

You may omit audio from the core second-evaluation demo. If shown, present it as an extra backend/provider integration and test availability beforehand.

### Debugging checklist for yourself

- Console: runtime JS errors; Network: failed requests/statuses; Application/Storage: localStorage.
- If cards show but chapters fail, check API health and the chapter request. A rendered card does not prove text is available.
- If sign-in fails, show the truthful error. Client validation cannot repair a service/network failure.
- If a click does nothing after rerendering, inspect whether handlers were rebound.
- If state seems absent after changing hostname, check origin differences.
- If layout looks wrong after adding utility classes, rebuild CSS and check which rule wins.
- Never display environment secrets, session tokens or real passwords while explaining the project.

## 13. Viva questions with answers to understand

| Likely question | Core answer |
| --- | --- |
| Why is it called a single-page app if you have seven pages? | Seven logical screens share one HTML shell; the router replaces `app-view` based on the hash. |
| Where is your JavaScript entry point? | The shell loads service/view scripts in order; DOMContentLoaded initializes profile, awaits auth restoration, initializes library storage, then starts routing. |
| What connects pages? | Hash links/navigation update the URL; hashchange asks the router to render the matching view. |
| What are render and init? | render creates HTML; init attaches behavior after insertion. |
| Why destroy? | Cancel old listeners/requests/timers/animations to prevent leaks or stale updates after navigation. |
| Give one JS interaction. | Search input with debounced filtering, password visibility, reader font controls, theme toggle or rating selection. Trace one completely. |
| What validates your form? | Login uses required/email/minlength and provider checks. Reading plan uses required/min/max/step/maxlength, JavaScript checks and server validation. |
| What does preventDefault do? | Stops the browser's default action; lets JS handle submission/navigation. |
| Why stopPropagation? | Stops a child click also triggering an enclosing handler. |
| Why async/await? | Network work completes later; await expresses dependent steps without blocking the whole UI. |
| What is a callback? | A function supplied to another operation to execute later, e.g. on click. |
| What is the DOM? | The browser's object tree for reading/changing HTML elements. |
| textContent vs innerHTML? | Plain text versus parsed markup; escape untrusted text before HTML insertion. |
| What does map do in your templates? | Turns book objects into card HTML; join concatenates it. |
| Why const if fields change? | const fixes the variable's binding, not all properties of an object. |
| Why use Tailwind? | Reuse small CSS utilities for layout, spacing, colors and responsive rules; custom CSS handles specialized effects. |
| How is the site responsive? | Breakpoint utility classes/media queries change layout; reader JS groups pages by viewport width. |
| How do page turns work? | Browser/CSS 3D transforms and animation around a page edge, with reduced-motion handling. |
| Where is submitted login data saved? | Account handling goes through Supabase; the app does not save a local password JSON file. |
| Where is upload data saved? | Metadata in the account browser cache and, after successful sync, its backend JSON file. The original file is not imported. |
| Is localStorage a JSON file? | No. It stores strings in browser storage. JSON.stringify supplies the serialized string. |
| Does the project fulfill the local JSON requirement? | Yes: the reading-plan form is saved to a private backend JSON file, and users can download their library snapshot. |
| Why both localStorage and a JSON file? | Browser cache gives immediate access and holds offline edits; server JSON persists the account copy; download supplies a user-owned file. |
| What is a 409 conflict? | The submitted revision is old because another save changed the file; merge with the latest document and retry. |
| How do you stop account mixing? | Separate account caches, verified server identity, canceled old requests and generation checks that ignore old responses. |
| Do you store passwords in JSON? | No. Supabase handles credentials; only validated library/plan fields enter this file. |
| What does atomic saving mean? | Write/flush a temporary file, then rename it over the previous file to reduce partial-write risk. |
| Does Download JSON mean the server saved? | No. The download is the current device copy; the sync status confirms the server save. |
| Supabase vs MongoDB? | Supabase handles accounts/session identity; Atlas holds books, chapters and ratings. |
| Node vs Express? | Node runs JS outside the browser; Express handles HTTP routing/middleware on Node. |
| Frontend validation enough? | No. It helps users; the backend must validate data and identity because requests can bypass the UI. |
| What is an API? | A defined interface; here HTTP method/path requests exchange JSON or audio with the server. |
| Why separate Book and Chapter? | Fetch small metadata for browsing, full text only for the chosen chapter. |
| What prevents duplicate ratings? | Verified account identity plus unique book/user index and create-or-update logic. |
| Is all CRUD complete? | No. Reads and create/update paths exist, but complete user-facing deletion/general CRUD remains. |
| How do you handle backend failure? | Catalog metadata/cache can keep some UI useful; unavailable content/services show errors. Not fully offline operation. |

## 14. A focused revision order for tonight

Treat these times as a study budget, not a promise that you must memorize every line.

| Time | Task | Check yourself |
| --- | --- | --- |
| 20 min | Sections 1–4: requirements, folders, routes, startup | Draw the flow from landing to reader without looking. |
| 40 min | Section 5: JS syntax, DOM, callbacks, events, async | Explain an event listener and map/filter in your own words. |
| 30 min | Section 6: CSS/Tailwind | Decode a real card's class list; explain flex/grid and a breakpoint. |
| 45 min | Login/search/favorite flows in sections 7–8 | Trace input → event → function → state/service → UI. |
| 25 min | Storage and limitations | Explain why localStorage and `.json` files differ. |
| 20 min | Backend overview | Identify Node, Express, Mongoose, Atlas and Supabase responsibilities. |
| 30 min | Rehearse demo and viva aloud | Demonstrate without overclaiming incomplete behavior. |

If time is short, prioritize routing, form submission, DOM/events, CSS layout and the local-JSON demo before narration internals or ingestion parsing.

### Active recall: answer before checking

1. You press a favorite button. Which file attaches its handler, which function saves state, and what does the save notify?
2. Why does a second search response sometimes need to be ignored even though it succeeded?
3. Why must a view call init after its render HTML is inserted?
4. What data does selecting a PDF actually persist in the current library?
5. Does the presence of `saveSettings()` prove the reader saves a changed font size?

Answers:

1. `app.js` attaches it through `installFavoriteToggle`; `data.js`'s `saveState` delegates to the library service for account caching and scheduled JSON sync, then dispatches `novelcast:state`.
2. It may belong to an older query; `searchVersion` and `disposed` guard against stale updates.
3. The element lookups/listeners need the new DOM elements to exist.
4. Filename-derived title, format, size and other metadata; not the PDF contents.
5. No. Trace the caller. Active `updateFont()` changes the display and repaginates without calling it.

For any unfamiliar function, use this reading method: **Who calls it? What inputs does it receive? What does it change or request? What does it return? What happens if it fails?** Being able to trace one feature using those questions is more valuable than memorizing function names.

## 15. Last ten minutes: recall without looking

**Four marking points:** linked screens; JavaScript interactions/validation; form submission; actual JSON files. Show all four with the reading plan as your main submission example.

**Remember these paths:** frontend/index.html is the shell; router.js chooses the screen; views/libraryView.js owns the form; librarySync.js coordinates cache/sync/download; backend/src/routes/libraryRoutes.js verifies and routes requests; backend/src/services/libraryJsonStore.js writes the file.

**Say the flow aloud:** “Input → validation → submit event → preventDefault → read fields → account cache → authenticated API → server checks → JSON file → success response → status update.”

**CSS answer:** “HTML supplies structure, CSS controls presentation, JavaScript supplies behavior. Flexbox handles rows/columns, Grid handles card layouts, media queries/Tailwind breakpoints adapt the layout, and transforms animate the reader. Custom variables hold theme colors.”

**Honest boundaries:** metadata selection is not manuscript import; scroll mode is not a PDF engine; page turns and font size are not automatically saved by the reader; a device download is not proof of server sync; JSON-file removal is not MongoDB deletion; all services are not guaranteed offline.

**Self-test:** Explain why localStorage is not a JSON file; explain why the backend verifies identity; explain 409; point to the actual form handler; demonstrate a bad input, a successful save and a download. If you can do those without reading, you understand the evaluation's central flow.
