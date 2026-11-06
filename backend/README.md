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
| `INGEST_ADMIN_TOKEN` | unset | Optional server-only secret for both HTTP ingestion routes. Use a random token of 32–512 characters with no whitespace. Without it, HTTP ingestion is disabled; the operator CLI is unchanged. |
| `MONGODB_DB_NAME` | URI path, else `novelcast` | Database name. |
| `MONGODB_DNS_SERVERS` | `8.8.8.8,1.1.1.1` | Resolvers used **only** when the machine's own DNS refuses the SRV lookup that `mongodb+srv://` needs (VPN clients and local DNS stubs commonly do). Set to an empty string to disable. |
| `FISH_AUDIO_API_KEY` | — | Server-only Fish Audio narration key. `FISH_API_KEY` and the existing `Fish_Audio` name are also accepted, using the same source precedence as above. |
| `FISH_AUDIO_REFERENCE_ID` | unset | Optional voice override for books with no saved narrator. It is saved as the book's choice on first listen; existing choices stay unchanged. |

Keep Fish Audio settings in the root `.env` or the hosting environment. Never
put the key in browser configuration. The model is fixed to `s2.1-pro-free` in
server code; no model environment variable or browser override is supported.

---

## Scripts

| Command | What it does |
|---|---|
| `npm start` | Serve the API and connect to Atlas. The built-in catalog remains readable from its available public sources while Atlas is offline. |
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
Query params: `search` (up to 160 characters), `genre` (up to 80), `page` (default 1),
`limit` (default 20, capped at 100), and `sort` (`popular` | `newest` | `title`).
Requests may skip at most 10,000 results.

```json
{
  "books": [ { "slug": "pride-and-prejudice", "title": "Pride and Prejudice", "author": "Jane Austen", "totalChapters": 62, "coverUrl": "..." } ],
  "pagination": { "page": 1, "limit": 20, "total": 8, "totalPages": 1, "hasNext": false, "hasPrev": false }
}
```
Book documents never contain chapter text — that lives in its own collection.

### `GET /api/books/:id`
`:id` accepts an exact Mongo `_id` or slug, or a Gutenberg ID for a built-in title.
Returns the book plus its chapter table of contents:
```json
{ "book": { "...": "..." }, "chapters": [ { "chapterNumber": 1, "title": "Chapter I: Down the Rabbit-Hole", "wordCount": 2181 } ] }
```

### `GET /api/books/:id/chapters/:chapterNum`
Returns one chapter's full text, ready for the reader, plus prev/next navigation.
If Atlas cannot supply a built-in title's text, the backend tries the matching
Project Gutenberg edition. A confirmed missing book or chapter returns `404`;
temporarily unavailable text returns `503`. The API never substitutes another
book or chapter. Built-in book details can still return metadata with an empty
table of contents while the source text is unavailable.

### `POST /api/ingest`

Requires `Authorization: Bearer <INGEST_ADMIN_TOKEN>` and an Atlas connection.
Keep the token in server and operator configuration; browser code does not use it.

```bash
curl -X POST http://localhost:4000/api/ingest \
  -H "Authorization: Bearer $INGEST_ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d '{"gutendexId": 84}'
```
Provide a positive integer `gutendexId` or a nonempty `search` string of up to
160 characters. The response contains `{ book, stats }`. Concurrent imports in
the same server process receive `409`.

### `POST /api/ingest/curated`
Requires the same operator token. Imports the curated shelf, or accepts a JSON
object such as `{ "only": [84, 11] }` for an exact subset. Prefer `npm run seed`
for a deliberate CLI import. `GET /api/ingest/curated` is public and read-only.

### `POST /api/tts`

Accepts JSON `{ "text": "A short passage to narrate.", "bookId": "frankenstein" }`. The
book ID must be an exact catalog slug or Atlas ObjectId; local uploads and unknown
IDs cannot borrow another book's narrator. A missing book ID returns `400`.
Text must be nonempty
and at most 1,200 JavaScript string characters (UTF-16 code units), including
surrounding whitespace. A successful response streams MP3 bytes with
`Content-Type: audio/mpeg`, `Cache-Control: no-store`, and
`X-TTS-Model: s2.1-pro-free`, `X-TTS-Voice-Id`, and `X-TTS-Voice-Name`.
The voice name is URL-percent-encoded; clients can decode it for display.
These headers are exposed to cross-origin clients.

On a book's first listen, the backend deterministically matches its title,
synopsis, and subjects to a verified English Fish Audio library voice. Known
classic titles take precedence over incidental words in a synopsis: Holmes uses
a detective voice, Moby Dick a reflective literary voice, Treasure Island a
pirate voice, and scientific adventures an expressive exploration voice. Other
themes include Gothic, romance, children, and classic wit. An English book
without a more specific match receives the literary voice, with that general
choice explained in its saved reason. Books explicitly marked only in an
unsupported language return `503` rather than using an unsuitable voice.

The result is saved in `Book.narrationVoice` as
`{ referenceId, name, reason, profile, selectedAt }`. A conditional atomic write
keeps the first saved choice if concurrent requests or server processes race.
Every later passage, session, and server restart reuses that saved reference;
changing the shortlist or environment override does not silently replace it.
Only choices confirmed by this backend process in Atlas are cached, with
concurrent selection shared per book. If Atlas is unavailable, an exact slug
from the built-in public catalog can use its previously saved voice from the
bundled Atlas export. This does not select a new voice or write metadata. An
offline result is never cached over a healthy Atlas lookup. Books without a
confirmed voice remain unavailable until storage recovers. This metadata write
does not alter the book text.

The server makes one request to `https://api.fish.audio/v1/tts` with the literal
`model: s2.1-pro-free` header, MP3 output, balanced latency, and the saved
`reference_id` on every passage. A missing voice is an error; no random default
voice is requested. The model cannot
be selected by the client or by configuration. **There are no paid models,
fallback models, automatic retries, disk caches, or background generation.** If
Fish Audio refuses the free model or its account allowance, narration stops and
reports the error. It never switches models to keep playback going.

Clients should split chapter text into short passages, play the current passage,
and fetch at most one following passage after playback actually starts. Cancel
pending requests when playback pauses, stops, or changes books. A client
disconnect aborts the upstream request and stream. The server also stops each
request after 60 seconds or 8 MiB of audio. At most four requests are active per
server process; additional requests receive `429` immediately, without queuing.

Before audio starts, failures return JSON `{ "error": "...", "code": "..." }`:
invalid text or book ID returns `400`, an unknown book returns `404`,
missing/rejected server credentials or unavailable book/voice storage return `503`, an
upstream account/credit refusal returns `402`, upstream throttling or local
capacity exhaustion returns `429`, an upstream network/audio failure returns
`502`, and a timeout returns `504`. Fish Audio error bodies are never forwarded.
A failure after streaming begins closes the response so incomplete audio is
not presented as a completed narration. Narration only writes a book's initial
voice metadata; it does not change chapter text or ratings.

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

### Listen Now shows "Not found"

An older backend process may still be serving port 4000, even while a newer
process responds on the other loopback address. Verify both `127.0.0.1:4000`
and `localhost:4000` reach the current backend before testing narration.
`POST /api/tts` with an empty JSON object should return `400` with code
`TTS_INVALID_TEXT`, without calling Fish Audio; `404` means the running backend
does not have the narration route. Stop only the confirmed stale NovelCast
process, then use `npm --prefix backend run dev` for the current code.

### Reader ratings

Ratings live in the Atlas `ratings` collection, separate from books and chapters.
`GET /api/ratings` returns catalog averages, and `GET /api/books/:id/ratings`
returns a book's distribution. An optional bearer token includes the caller's vote.
`PUT /api/books/:id/ratings` accepts `{ "score": 1 }` through `{ "score": 5 }`.
It verifies the session with the existing Supabase Auth project before writing;
the account ID is never accepted from the request body. A unique compound index
allows one editable vote per account and book. No demo votes enter the averages.
Configure `SUPABASE_URL` and `SUPABASE_ANON_KEY` (legacy `Supabase_url` and
`Supabase_api` also work). An unavailable Auth project returns 503; votes are
never reported as saved on failure. Run `node --test tests/test-ratings-api.js`
from the repository root for the isolated HTTP integration test.

**`querySrv ECONNREFUSED _mongodb._tcp...`** — the local DNS resolver refuses
SRV queries. The service retries automatically with public resolvers (see
`MONGODB_DNS_SERVERS` above).

**`[gutendex] id 84 unavailable ... using gutenberg.org`** — normal. Gutendex
goes down regularly; the fallback path produces the same result and is reported
as `stats.source` in the ingest response.
