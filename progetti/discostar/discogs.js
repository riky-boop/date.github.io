/* Ricerca su Discogs: usato solo dall'area gestione. Il token è in discogs-token.js. */
const Discogs = (() => {
  const API = "https://api.discogs.com";
  const FORMAT = { LP: "Vinyl", CD: "CD", DVD: "DVD" };
  const GAP = 1100; // ~55 richieste al minuto: sotto il limite di 60 con token
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  let last = 0;
  let chain = Promise.resolve();

  const token = () => String(window.DISCOGS_TOKEN || "").trim();
  const enabled = () => token().length > 0;

  async function request(path, params) {
    const query = Object.entries({ ...params, token: token() })
      .filter(([, v]) => v !== undefined && v !== null && v !== "")
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join("&");
    for (let attempt = 0; attempt < 3; attempt++) {
      const delay = last + GAP - Date.now();
      if (delay > 0) await wait(delay);
      last = Date.now();
      const res = await fetch(`${API}${path}?${query}`);
      if (res.status === 429) { await wait(60000); continue; }
      if (res.status === 401) throw new Error("Token Discogs non valido: controlla discogs-token.js");
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`Discogs ha risposto ${res.status}`);
      return res.json();
    }
    throw new Error("Troppe richieste a Discogs: riprova tra un minuto");
  }

  /* Le richieste partono una alla volta, distanziate. */
  function get(path, params = {}) {
    const run = chain.then(() => request(path, params));
    chain = run.catch(() => {});
    return run;
  }

  const candidate = (r) => ({
    id: r.id,
    type: r.type,
    title: r.title || "",
    year: r.year || "",
    country: r.country || "",
    format: (r.format || []).filter((f, i, a) => a.indexOf(f) === i).slice(0, 3).join(", "),
    thumb: r.thumb || "",
    cover: r.cover_image || "",
  });

  /* Barcode: ricerca esatta. LP/CD: prima la "master" (l'album originale), poi le edizioni. DVD: edizioni DVD. */
  async function search(item) {
    const by = { artist: item.artist, release_title: item.title };
    const attempts = item.barcode
      ? [{ type: "release", barcode: item.barcode }, { type: "release", ...by, format: FORMAT[item.format] }]
      : item.format === "DVD"
        ? [{ type: "release", ...by, format: "DVD" }, { type: "master", ...by }]
        : [{ type: "master", ...by }, { type: "release", ...by, format: FORMAT[item.format] }];
    for (const params of attempts) {
      const data = await get("/database/search", { ...params, per_page: 8 });
      if (data && data.results && data.results.length) return data.results.map(candidate);
    }
    return [];
  }

  async function details(c) {
    const d = await get(`/${c.type}s/${c.id}`);
    if (!d) throw new Error("Disco non trovato su Discogs");
    const images = d.images || [];
    const img = images.find((i) => i.type === "primary") || images[0];
    return {
      discogs_id: c.id,
      discogs_type: c.type,
      cover_url: img ? img.uri : c.cover || null,
      thumb_url: img ? img.uri150 : c.thumb || null,
      tracklist: (d.tracklist || [])
        .filter((t) => t.title)
        .map((t) => ({ position: t.position || "", title: t.title, duration: t.duration || "", heading: t.type_ === "heading" })),
    };
  }

  /* "Artist (2)*" → "artist"; toglie accenti, "the", punteggiatura. */
  const simplify = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/\(\d+\)|\*/g, "").replace(/^the\s+/, "").replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ").trim();

  /* Abbinamento sicuro: stesso titolo e stesso artista (il risultato è "Artista - Titolo"). */
  function matches(item, c) {
    const cut = c.title.indexOf(" - ");
    if (cut < 0) return false;
    const artist = simplify(c.title.slice(0, cut)), title = simplify(c.title.slice(cut + 3));
    const a = simplify(item.artist), t = simplify(item.title);
    return title === t && !!artist && (artist === a || artist.includes(a) || a.includes(artist));
  }

  const pageUrl = (item) => `https://www.discogs.com/${item.discogs_type}/${item.discogs_id}`;

  return { enabled, search, details, matches, pageUrl, simplify };
})();
