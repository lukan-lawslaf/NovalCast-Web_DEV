// Keep each account cache separate, sync its JSON document, and export a user download.
/* Account-scoped browser cache + authenticated, revisioned JSON-file persistence. */
(function () {
  const NC = window.NovelCast;
  const PREFIX = 'novelcast.library.v1.';
  const clone = value => JSON.parse(JSON.stringify(value));
  const object = value => value && typeof value === 'object' && !Array.isArray(value);
  // Compare data recursively so object-key ordering does not create a false pending change.
  function equal(a, b) {
    if (a === b) return true;
    if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((value, i) => equal(value, b[i]));
    if (!object(a) || !object(b)) return false;
    const keys = Object.keys(a);
    return keys.length === Object.keys(b).length && keys.every(key => Object.hasOwn(b, key) && equal(a[key], b[key]));
  }
  const empty = () => ({ schemaVersion: 1, revision: 0, state: { library: {}, collections: [] },
    uploads: [], settings: {}, readingPlan: { dailyMinutes: 20, favoriteGenre: '' } });
  // Check the expected document shape before trusting a browser cache or server response.
  function validSnapshot(value) {
    return value?.schemaVersion === 1 && Number.isSafeInteger(value.revision) && value.revision >= 0 &&
      object(value.state?.library) && Object.values(value.state.library).every(object) &&
      Array.isArray(value.state.collections) && Array.isArray(value.uploads) &&
      value.uploads.every(book => object(book) && typeof book.id === 'string') && object(value.settings) &&
      Number.isInteger(value.readingPlan?.dailyMinutes) && value.readingPlan.dailyMinutes >= 5 &&
      value.readingPlan.dailyMinutes <= 240 && typeof value.readingPlan.favoriteGenre === 'string' &&
      value.readingPlan.favoriteGenre.length <= 80;
  }
  let owner = null, envelope = { document: empty(), base: empty(), pending: false };
  let generation = 0, mutation = 0, timer, flight, requestController;
  let status = { phase: 'guest', message: 'Saved on this device. Sign in to sync your library.' };

  // Three-way merge: untouched fields take the server's value; local edits win conflicts.
  // Comparing against the last acknowledged base also preserves local deletions.
  function merge(base, local, remote) {
    if (equal(base, local)) return remote === undefined ? undefined : clone(remote);
    if (object(local) && object(remote)) {
      const result = Object.create(null);
      for (const key of new Set([...Object.keys(base || {}), ...Object.keys(local), ...Object.keys(remote)])) {
        if (['__proto__', 'prototype', 'constructor'].includes(key)) continue;
        const value = merge(base?.[key], local[key], remote[key]);
        if (value !== undefined) result[key] = value;
      }
      return result;
    }
    return local === undefined ? undefined : clone(local);
  }
  // Merge uploads by book ID and adopt the latest server revision.
  function combine(base, local, remote) {
    const result = merge(base, local, remote);
    const byId = rows => Object.fromEntries((rows || []).map(row => [row.id, row]));
    result.uploads = Object.values(merge(byId(base.uploads), byId(local.uploads), byId(remote.uploads)));
    result.schemaVersion = 1;
    result.revision = remote.revision;
    return result;
  }
  function sameData(a, b) { return equal({ ...a, revision: 0 }, { ...b, revision: 0 }); }
  function publish(phase, message) {
    status = { phase, message };
    document.dispatchEvent(new CustomEvent('novelcast:library-sync', { detail: status }));
  }
  // Save the account cache locally; a storage error must not be reported as a successful cache save.
  function persist() {
    try {
      localStorage.setItem(PREFIX + (owner || 'guest'), JSON.stringify(envelope));
      return true;
    } catch {
      publish('pending', 'Device storage is full or unavailable. Keep this page open and download a JSON copy.');
      return false;
    }
  }
  // Wait briefly after edits so several quick changes can share one sync.
  function schedule() {
    clearTimeout(timer);
    if (owner) timer = setTimeout(() => sync(), 250);
  }
  // Update one document section immediately, then schedule its remote save.
  function change(section, value) {
    envelope.document[section] = clone(value);
    envelope.pending = true;
    mutation++;
    const saved = persist();
    if (saved) publish(owner ? 'pending' : 'guest', owner
      ? 'Saved on this device; waiting to sync.' : 'Saved on this device. Sign in to use your account library.');
    schedule();
    return saved;
  }
  // Load this account only; old shared bookmarks remain separate until explicitly imported.
  function loadCache(id) {
    const blank = empty();
    try {
      const cached = JSON.parse(localStorage.getItem(PREFIX + (id || 'guest')) || 'null');
      if (validSnapshot(cached?.document) && validSnapshot(cached?.base)) return cached;
      // Preserve the existing account-keyed upload metadata. Shared legacy bookmarks stay guests'.
      const suffix = id ? `.${id}` : '';
      const state = JSON.parse(localStorage.getItem('novelcast.state.v1' + suffix) || 'null');
      const settings = JSON.parse(localStorage.getItem('novelcast.settings.v1' + suffix) || 'null');
      const uploads = JSON.parse(localStorage.getItem('novelcast.uploads.' + (id || 'guest')) || '[]');
      if (object(state?.library)) blank.state = { library: state.library, collections: Array.isArray(state.collections) ? state.collections : [] };
      if (object(settings)) blank.settings = settings;
      if (Array.isArray(uploads)) blank.uploads = uploads.filter(book => book && typeof book.id === 'string');
    } catch { /* Malformed old caches cannot select a different account or replace server records. */ }
    return { document: blank, base: empty(), pending: !sameData(blank, empty()) };
  }
  function loaded() {
    document.dispatchEvent(new CustomEvent('novelcast:state'));
    document.dispatchEvent(new CustomEvent('novelcast:library-loaded'));
  }
  // Cancel old work, select the new account cache and reject late responses using a generation number.
  function switchAccount(user) {
    const next = user?.id && window.NovelCastAuth.isAuthenticated() ? user.id : null;
    if (next === owner && initialized) { if (next) schedule(); return; }
    initialized = true;
    clearTimeout(timer);
    requestController?.abort();
    generation++;
    mutation++;
    flight = null;
    owner = next;
    envelope = loadCache(owner);
    publish(owner ? 'loading' : 'guest', owner ? 'Loading your account library…' : 'Saved on this device. Sign in to sync your library.');
    loaded();
    schedule(); // Outside Supabase's synchronous auth callback (avoids its session lock).
  }
  // Send an authenticated, bounded API request and recognize a revision-conflict response.
  async function request(method, payload, context) {
    const token = await window.NovelCastAuth.getAccessToken();
    if (context.generation !== generation) throw new Error('Account changed.');
    if (!token) throw new Error('Sign in again to sync your library.');
    requestController = new AbortController();
    // Capture controller: a late timeout must never abort another account's request.
    const controller = requestController;
    const requestTimer = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(`${NC.API_BASE}/me/library`, {
        method, cache: 'no-store', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        ...(payload ? { body: JSON.stringify(payload) } : {}), signal: controller.signal,
      });
      const data = await response.json();
      if (context.generation !== generation) throw new Error('Account changed.');
      if (response.status === 409 && validSnapshot(data.document)) return { conflict: true, document: data.document };
      if (!response.ok) throw new Error(data.error || 'Library sync is unavailable.');
      if (!validSnapshot(data)) {
        throw new Error('The server returned an invalid library.');
      }
      return { document: data };
    } finally { clearTimeout(requestTimer); }
  }
  // Fetch the newest document, merge local edits, then retry bounded revision conflicts.
  async function synchronize(context) {
    try {
      publish('loading', 'Checking your saved library…');
      const response = await request('GET', null, context);
      const remote = response.document;
      envelope.document = combine(envelope.base, envelope.document, remote);
      envelope.base = clone(remote);
      envelope.pending = !sameData(envelope.document, remote);
      persist();
      loaded();
      for (let attempt = 0; envelope.pending && attempt < 4; attempt++) {
        const sent = clone(envelope.document);
        const sentMutation = mutation;
        publish('saving', 'Saving your library…');
        const result = await request('PUT', sent, context);
        const current = result.document;
        envelope.document = combine(result.conflict ? envelope.base : sent, envelope.document, current);
        envelope.base = clone(current);
        envelope.pending = !sameData(envelope.document, current);
        persist();
        if (result.conflict || mutation !== sentMutation) loaded();
      }
      if (envelope.pending) {
        publish('pending', 'Your changes are saved on this device. Retry sync to finish saving your account library.');
        return false;
      }
      publish('synced', 'Your library is synced to your account.');
      return true;
    } catch (error) {
      if (context.generation !== generation) return false;
      publish('pending', `${error.name === 'AbortError' ? 'Library sync timed out.' : error.message} Your device copy is still available; retry sync.`);
      return false;
    }
  }
  // Reuse an in-progress sync rather than launching overlapping saves.
  function sync() {
    clearTimeout(timer);
    if (!owner) return Promise.resolve(false);
    if (flight) return flight;
    const context = { generation };
    const task = synchronize(context).finally(() => { if (flight === task) flight = null; });
    flight = task;
    return task;
  }
  let initialized = false;
  window.NovelCastLibrary = {
    // Account, browser-tab and connectivity events decide when to refresh this cache.
    init() {
      if (initialized) return;
      window.NovelCastAuth.onAuthStateChange(switchAccount);
      window.addEventListener('online', schedule);
      window.addEventListener('focus', schedule);
      window.addEventListener('storage', event => {
        if (event.key !== PREFIX + (owner || 'guest') || !event.newValue) return;
        envelope = loadCache(owner);
        mutation++;
        loaded();
        publish(owner ? 'pending' : 'guest', 'Library updated in another tab.');
        schedule();
      });
    },
    getSection(section) { return clone(envelope.document[section]); },
    setSection(section, value) {
      if (!['state', 'settings', 'readingPlan'].includes(section)) return false;
      return change(section, value);
    },
    getUploads(userId) { return userId === owner || (!owner && !userId) ? clone(envelope.document.uploads) : []; },
    setUploads(userId, rows) { return userId === owner && change('uploads', rows); },
    getStatus() { return { ...status }; },
    getReadingPlan() { return clone(envelope.document.readingPlan); },
    hasDeviceBookmarks() {
      if (!owner) return false;
      const guest = loadCache(null).document.state.library;
      return Object.keys(guest).some(id => !Object.hasOwn(envelope.document.state.library, id));
    },
    // Copy only missing guest entries after the user explicitly claims the older bookmarks.
    importDeviceBookmarks() {
      if (!owner) return false;
      const state = clone(envelope.document.state);
      const guest = loadCache(null).document.state.library;
      for (const [id, entry] of Object.entries(guest)) {
        if (!['__proto__', 'prototype', 'constructor'].includes(id) && !Object.hasOwn(state.library, id)) state.library[id] = clone(entry);
      }
      const saved = change('state', state);
      loaded();
      return saved;
    },
    // Validate form values again before caching; remote sync happens separately.
    saveReadingPlan(plan) {
      if (!Number.isInteger(plan.dailyMinutes) || plan.dailyMinutes < 5 || plan.dailyMinutes > 240 ||
          typeof plan.favoriteGenre !== 'string' || plan.favoriteGenre.length > 80) return false;
      return change('readingPlan', { dailyMinutes: plan.dailyMinutes, favoriteGenre: plan.favoriteGenre.trim() });
    },
    sync,
    async download() {
      // An export is a device snapshot; it includes pending edits even when the API is offline.
      const snapshot = clone(envelope.document);
      const blob = new Blob([JSON.stringify(snapshot, null, 2) + '\n'], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `novelcast-library-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
  };
})();
