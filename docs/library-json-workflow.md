# JSON saving and account sync: evaluation demo

## What to demonstrate

1. Run the frontend (`npm run dev`) and backend (`npm --prefix backend run dev`) in separate terminals. Use the same browser address consistently, such as `http://127.0.0.1:3000/`.
2. Sign in with an existing confirmed account and open **My Library**.
3. In **Your reading plan**, enter an invalid daily goal, such as 4. The browser refuses submission. Valid values are whole numbers from 5 to 240; genre is optional and limited to 80 characters.
4. Enter a valid goal and genre; click **Save reading plan**. Wait for **Your library is synced to your account**.
5. Show the JSON file under `backend/data/libraries/`. The filename is a hash of the verified account ID. The submitted plan is inside `readingPlan`; the revision increases after each successful write. These private files are ignored by Git and are outside the frontend's public folder.
6. Click **Download JSON**. Open the downloaded file to show the same plan and the current device's saved books/manuscript metadata.
7. Save a catalog book or bookmark it; return to the library and show **Saved catalog books**. Remove it to demonstrate another persisted change.
8. Reload or sign out and back in: your account's library returns. A different account has its own library.
9. If the API becomes unavailable, the status reports a failed/pending sync. Edits remain in the account's browser cache. Once available again, **Sync now** retries; returning focus or browser connectivity also schedules a check.

Do not expose authentication tokens in developer tools during the demo. Passwords and session credentials are never written to the library JSON or download.

## The flow to explain

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

## Files and key functions

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

## Data stored

The document contains `schemaVersion`, `revision`, `state` (saved books/favorites and existing state fields), `uploads` (metadata only), `settings`, and `readingPlan`.

Each browser cache uses `novelcast.library.v1.<account-id>`, holding the document, last acknowledged server copy, and pending flag. Guests use a separate `guest` key. Old account-keyed upload metadata is migrated. The old shared `novelcast.state.v1` bookmarks stay with the guest/device because their account ownership cannot be established; they are not silently assigned to the next person who signs in. **Add my older device bookmarks** explicitly copies missing entries into the current account without replacing its existing entries. Use it only for your own older bookmarks.

The active reader still does not save every page turn or font-size change through the generic storage helpers. This change does not implement manuscript contents/parsing, JSON import, password storage, or full MongoDB CRUD.

## Verification and operating limits

Run `npm run test:library`, `npm run test:auth:reliability`, and `npm run test:library:browser`. The browser test uses installed Chrome (`channel: 'chrome'`), temporary files, and fake accounts; it does not create Supabase accounts or write Atlas data.

The file store targets one backend process. Production hosting needs durable disk storage and shared coordination if multiple backend processes write the same files. There is no background polling: sign-in, edits, focus, reconnect and **Sync now** trigger checks. Closing the browser before sync completes leaves pending edits in that browser's cache for the next visit.
