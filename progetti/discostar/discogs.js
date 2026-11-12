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

  const candidate = (r) => {
    const formats = (r.format || []).filter((f, i, a) => a.indexOf(f) === i);
    return {
      id: r.id,
      type: r.type,
      title: r.title || "",
      year: r.year || "",
      country: r.country || "",
      format: formats.filter((f) => f !== "Unofficial Release").slice(0, 3).join(", "),
      unofficial: formats.includes("Unofficial Release"), // bootleg
      // 45 giri / singolo / EP: stesso titolo dell'album ma non è l'album
      short: formats.some((f) => ["Single", "Maxi-Single", "EP", '7"'].includes(f)) && !formats.some((f) => f === "LP" || f === "Album"),
      have: (r.community && r.community.have) || 0,       // quanti collezionisti lo possiedono
      thumb: r.thumb || "",
      cover: r.cover_image || "",
    };
  };

  /* Discogs ordina per pertinenza, non per importanza: un 45 giri promo può precedere l'album.
     Mettiamo prima le uscite ufficiali, poi gli album (non singoli) per LP/CD, poi le più diffuse tra i collezionisti. */
  const rank = (list, item) => {
    const album = item.format !== "DVD";
    return [...list].sort((a, b) => (a.unofficial - b.unofficial) || (album ? a.short - b.short : 0) || (b.have - a.have));
  };

  /* Barcode: ricerca esatta. LP/CD: prima la "master" (l'album originale), poi le edizioni. DVD: edizioni DVD.
     Se un tentativo non dà un abbinamento sicuro si prova il successivo, unendo i risultati. */
  async function search(item) {
    const by = { artist: item.artist, release_title: item.title };
    const attempts = item.barcode
      ? [{ type: "release", barcode: item.barcode }, { type: "release", ...by, format: FORMAT[item.format] }]
      : item.format === "DVD"
        ? [{ type: "release", ...by, format: "DVD" }, { type: "master", ...by }]
        : [{ type: "master", ...by }, { type: "release", ...by, format: FORMAT[item.format] }];
    const found = [];
    for (const params of attempts) {
      const data = await get("/database/search", { ...params, per_page: 10 });
      for (const r of (data && data.results) || []) {
        if (!found.some((f) => f.id === r.id && f.type === r.type)) found.push(candidate(r));
      }
      if (params.barcode && found.length) break; // il barcode identifica già l'edizione
      if (found.some((c) => matches(item, c))) break;
    }
    return rank(found, item);
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
      // "index" = brano diviso in parti (sub_tracks): titolo come intestazione, poi le parti
      tracklist: (d.tracklist || []).flatMap((t) =>
        t.type_ === "index" && (t.sub_tracks || []).length ? [{ ...t, type_: "heading" }, ...t.sub_tracks] : [t])
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
    if (c.unofficial) return false;
    if (c.short && item.format !== "DVD") return false;
    const cut = c.title.indexOf(" - ");
    if (cut < 0) return false;
    const artist = simplify(c.title.slice(0, cut)), title = simplify(c.title.slice(cut + 3));
    const a = simplify(item.artist), t = simplify(item.title);
    return title === t && !!artist && (artist === a || artist.includes(a) || a.includes(artist));
  }

  const pageUrl = (item) => `https://www.discogs.com/${item.discogs_type}/${item.discogs_id}`;

  return { enabled, search, details, matches, pageUrl, simplify };
})();
