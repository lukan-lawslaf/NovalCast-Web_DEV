# NovelCast Backend

Node.js/Express service that ingests real public-domain books into MongoDB Atlas
and serves the catalog + reading API the SPA consumes.

It pulls metadata and full text from Gutendex / Project Gutenberg, enriches each
book with cover art and a synopsis from Open Library, strips the Gutenberg
licence boilerplate, splits the prose into chapters, and stores books and
chapters in two separate collections.

---

## Quick start

```bash
cd backend
npm install

npm run seed     # ingest the 20 curated classics into Atlas
npm start        # serve the API on http://localhost:4000
```

Verify:

```bash
npm run smoke    # boots the app in-process and exercises every endpoint
curl http://localhost:4000/api/books
curl http://localhost:4000/api/books/frankenstein/chapters/1
```

---

## Environment

`MONGODB_URI` is resolved in this order, first non-empty value wins:

1. `process.env.MONGODB_URI`
2. `atlas-credentials.env` (repo root)
3. `.env` (repo root)

| Variable | Default | Purpose |
|---|---|---|
| `MONGODB_URI` | — | Atlas connection string. Required. |
| `PORT` | `4000` | HTTP port. |
| `CORS_ORIGIN` | `*` | Comma-separated allow-list, or `*`. |
| `MONGODB_DB_NAME` | URI path, else `novelcast` | Database name. |
| `MONGODB_DNS_SERVERS` | `8.8.8.8,1.1.1.1` | Resolvers used **only** when the machine's own DNS refuses the SRV lookup that `mongodb+srv://` needs (VPN clients and local DNS stubs commonly do). Set to an empty string to disable. |

---

## Scripts

| Command | What it does |
|---|---|
| `npm start` | Serve the API (connects to Atlas first; exits if it cannot). |
| `npm run dev` | Same, with `--watch`. |
| `npm run seed` | Ingest the 20 curated classics. Idempotent — re-running upserts books and replaces their chapters. |
| `npm run seed -- --only=84,11` | Ingest a subset by Gutendex id or slug. |
| `npm run smoke` | End-to-end check of every endpoint, plus every book's table of contents and first chapter. |

---

## API

Base URL `http://localhost:4000`.

### `GET /api/health`
```json
{ "status": "ok", "database": "connected", "connectionState": "connected", "uptimeSeconds": 42 }
```
Returns `503` with `"status": "degraded"` when Atlas is not reachable, so the
endpoint is never a false positive.

### `GET /api/books`
Query params: `search`, `genre`, `page` (default 1), `limit` (default 20, max 100), `sort` (`popular` | `newest` | `title`).

```json
{
  "books": [ { "slug": "pride-and-prejudice", "title": "Pride and Prejudice", "author": "Jane Austen", "totalChapters": 62, "coverUrl": "..." } ],
  "pagination": { "page": 1, "limit": 20, "total": 8, "totalPages": 1, "hasNext": false, "hasPrev": false }
}
```
Book documents never contain chapter text — that lives in its own collection.

### `GET /api/books/:id`
`:id` accepts a Mongo `_id` or a slug. Returns the book plus its chapter table of contents:
```json
{ "book": { "...": "..." }, "chapters": [ { "chapterNumber": 1, "title": "Chapter I: Down the Rabbit-Hole", "wordCount": 2181 } ] }
```

### `GET /api/books/:id/chapters/:chapterNum`
Returns one chapter's full text, ready for the reader, plus prev/next navigation.

### `POST /api/ingest`
```bash
curl -X POST http://localhost:4000/api/ingest -H "Content-Type: application/json" -d '{"gutendexId": 84}'
curl -X POST http://localhost:4000/api/ingest -H "Content-Type: application/json" -d '{"search": "The Picture of Dorian Gray"}'
```
Ingests the book and returns `{ book, stats }`. Concurrent ingests are rejected
with `409` so the volunteer services behind Gutendex are never hammered.

### `POST /api/ingest/curated`
Seeds the whole curated shelf over HTTP (takes a few minutes — `npm run seed` is
the better tool for this).

---

## Ingestion pipeline

```
metadata  ->  text download  ->  clean  ->  chapter parse  ->  upsert  ->  chapters
```

**1. Metadata — `services/gutendexService.js`**
Gutendex is the primary source. It is volunteer-run and does hang, so every call
falls back to `gutenberg.org` (same data, plain HTML) and both paths return one
normalised shape. Text is fetched from `gutenberg.org/cache/epub/{id}/pg{id}.txt`.

**2. Cleaning — `services/textCleaner.js`**
Slices between the `*** START OF THE PROJECT GUTENBERG EBOOK ... ***` markers,
drops the title page, contents listing, illustration lists and transcriber
notices, unwraps hard-wrapped lines back into paragraphs, and normalises curly
quotes / dashes. Short publisher prefaces are dropped; long ones (Wilde's
preface to Dorian Gray) are kept as `The Preface`.

The contents listing is skipped until the body repeats its *first* entry — a
table of contents always opens with the same chapter the text does, which makes
that repeat an unambiguous end-of-listing marker.

**3. Chapters — `services/chapterParser.js`**
Strategies are tried in order of confidence; the first that finds two or more
chapters wins:

1. `CHAPTER | ACT | SCENE | BOOK | PART | LETTER | ADVENTURE` + numeral or number word
2. numeral headings with a title — `I. A Scandal in Bohemia`
3. numeral headings without one — `I`, `II`
4. standalone ALL-CAPS headings — `STORY OF THE DOOR` (Dr Jekyll)
5. ~2,500-word sections, for texts with no markers at all

A heading with no inline title takes it from the next line, producing entries
like `Chapter I: Down the Rabbit-Hole`.

**4. Enrichment — `services/openLibraryService.js`**
Cover art (`covers.openlibrary.org/b/id/{id}-L.jpg`) and a synopsis from the
Open Library work record. Both are optional: a failure here never fails an
ingest, and the description falls back to a blurb built only from data we
actually have — no invented plot summaries.

Verified against all 20 curated titles: every one parses with zero untitled
chapters, and `npm run smoke` re-checks the whole shelf against live data.

| Genre | Book | Chapters | Words |
|---|---|---|---|
| Adventure, Sea & Travel | Moby Dick | 149 | 207,673 |
| | Around the World in Eighty Days | 36 | 61,185 |
| | Treasure Island | 34 | 67,712 |
| Science Fiction | The War of the Worlds | 27 | 59,755 |
| | Twenty Thousand Leagues Under the Sea | 46 | 104,071 |
| Mystery & Suspense | The Hound of the Baskervilles | 15 | 59,043 |
| | The Works of Edgar Allan Poe, Vol. 1 | 9 | 90,277 |
| Romance & Drama | Jane Eyre | 39 | 185,267 |
| | Wuthering Heights | 34 | 115,872 |
| Literary & Psychological | A Tale of Two Cities | 45 | 135,433 |
| | The Great Gatsby | 10 | 48,130 |
| | The Metamorphosis | 3 | 21,932 |
| Gothic & Horror | Dracula | 27 | 160,907 |
| | Frankenstein; or, the Modern Prometheus | 28 | 74,919 |
| | Dr. Jekyll and Mr. Hyde | 10 | 25,529 |
| Classic Detective | The Adventures of Sherlock Holmes | 12 | 104,346 |
| | Pride and Prejudice | 62 | 127,156 |
| | The Picture of Dorian Gray | 20 | 78,505 |
| Children's & Fantasy | Alice's Adventures in Wonderland | 12 | 26,371 |
| Early Science Fiction | The Time Machine | 16 | 32,311 |

634 chapters, 1,786,394 words in total.

**Two known quirks in the source texts**, both visible only as extra entries in
a table of contents:

- Moby Dick reports 149 chapters rather than 135: Melville numbers the whale
  taxonomy inside "Cetology" with its own `CHAPTER I–IV` markers, and those are
  indistinguishable from real chapter headings.
- The Poe volume is a short-story collection, so its "chapters" are the
  individual stories. Gutenberg has no standalone edition of *The Murders in the
  Rue Morgue*; ID 2147 is the volume that contains it.

---

## Collections

**`books`** — catalog metadata: `slug` (unique), `gutendexId` (unique), `title`,
`author`, `subjects[]`, `languages[]`, `coverUrl`, `description`,
`totalChapters`, `totalWordCount`, `downloadCount`, `featured`, timestamps.

**`chapters`** — `bookId` (ref `Book`), `chapterNumber`, `title`, `content`,
`wordCount`, `order`, timestamps. Unique compound index on
`{ bookId, chapterNumber }` so a re-ingest can never duplicate a chapter.

---

## Layout

```
backend/
├── index.js                      Express app, health check, boot sequence
└── src/
    ├── config/env.js             Env resolution + precedence
    ├── config/db.js              Atlas connection, retries, DNS fallback
    ├── models/Book.js            Catalog metadata
    ├── models/Chapter.js         Reading content
    ├── services/gutendexService.js    Gutendex + gutenberg.org fallback
    ├── services/openLibraryService.js Cover art + synopsis
    ├── services/textCleaner.js        Boilerplate removal, paragraph reflow
    ├── services/chapterParser.js      Chapter boundary detection
    ├── services/ingestService.js      End-to-end pipeline + curated shelf
    ├── routes/catalogRoutes.js        Catalog, detail, chapter read
    ├── routes/ingestRoutes.js         Ingestion triggers
    ├── scripts/seedCurated.js         `npm run seed`
    ├── scripts/smokeTest.js           `npm run smoke`
    └── utils/httpClient.js            Timeout + retry wrapper over fetch
```

---

## Troubleshooting

**`querySrv ECONNREFUSED _mongodb._tcp...`** — the local DNS resolver refuses
SRV queries. The service retries automatically with public resolvers (see
`MONGODB_DNS_SERVERS` above).

**`[gutendex] id 84 unavailable ... using gutenberg.org`** — normal. Gutendex
goes down regularly; the fallback path produces the same result and is reported
as `stats.source` in the ingest response.
