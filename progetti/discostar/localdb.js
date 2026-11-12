/*
  Modalità locale (senza Supabase): stesso funzionamento dell'area gestione, ma il catalogo
  è salvato in questo browser. Per pubblicarlo si scarica catalog.js e si sostituisce il file.
  Imita le poche funzioni di supabase-js usate da admin.js.
*/
const LOCAL_KEY = "discostar-local-catalog";

function createLocalClient() {
  const load = () => {
    try { const saved = JSON.parse(localStorage.getItem(LOCAL_KEY)); if (Array.isArray(saved)) return saved; } catch {}
    return JSON.parse(JSON.stringify(window.CATALOG || []));
  };
  let rows = load();
  const persist = () => localStorage.setItem(LOCAL_KEY, JSON.stringify(rows));
  const nextId = () => rows.reduce((m, r) => Math.max(m, r.id), 0) + 1;
  const copy = (o) => JSON.parse(JSON.stringify(o));

  function from() {
    const q = { op: "select", filters: [], payload: null, range: null, single: false };
    const api = {
      select() { return api; },
      order() { return api; },
      range(a, b) { q.range = [a, b]; return api; },
      eq(col, v) { q.filters.push([col, v]); return api; },
      single() { q.single = true; return api; },
      insert(p) { q.op = "insert"; q.payload = p; return api; },
      update(p) { q.op = "update"; q.payload = p; return api; },
      upsert(p) { q.op = "upsert"; q.payload = p; return api; },
      delete() { q.op = "delete"; return api; },
      then(ok, ko) { return Promise.resolve().then(() => run(q)).then(ok, ko); },
    };
    return api;
  }

  function run(q) {
    try {
      const match = (r) => q.filters.every(([c, v]) => r[c] === v);
      if (q.op === "select") {
        const all = [...rows].sort((a, b) => a.id - b.id);
        return { data: copy(q.range ? all.slice(q.range[0], q.range[1] + 1) : all), error: null };
      }
      if (q.op === "insert") {
        const added = [];
        for (const p of Array.isArray(q.payload) ? q.payload : [q.payload]) {
          const r = { ...copy(p), id: nextId() };
          rows.push(r);
          added.push(r);
        }
        persist();
        return { data: copy(q.single ? added[0] : added), error: null };
      }
      if (q.op === "update") {
        rows.filter(match).forEach((r) => Object.assign(r, copy(q.payload)));
        persist();
        return { data: null, error: null };
      }
      if (q.op === "upsert") {
        for (const p of q.payload) {
          const r = rows.find((x) => x.id === p.id);
          if (r) Object.assign(r, copy(p)); else rows.push(copy(p));
        }
        persist();
        return { data: copy(q.payload), error: null };
      }
      if (q.op === "delete") {
        rows = rows.filter((r) => !match(r));
        persist();
        return { data: null, error: null };
      }
    } catch (err) {
      // es. spazio del browser esaurito
      return { data: null, error: { message: err.message } };
    }
  }

  return {
    local: true,
    from,
    rpc: async () => ({ data: true, error: null }),
    auth: {
      getSession: async () => ({ data: { session: { local: true } } }),
      signInWithPassword: async () => ({ error: null }),
      signOut: async () => {},
    },
    reset() { localStorage.removeItem(LOCAL_KEY); rows = load(); },
    hasDraft: () => localStorage.getItem(LOCAL_KEY) !== null,
  };
}
