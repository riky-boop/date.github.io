/* Dati del negozio e del database: config.js */
const SHOP = window.DISCOSTAR.shop;

const FORMATS = { LP: "Vinili", CD: "CD", DVD: "DVD" };
let items = [];
const $ = (sel) => document.querySelector(sel);

const state = { format: "", query: "", genre: "", decade: "", sort: "artist", inStock: false };

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const norm = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const euro = (n) => n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
const decadeOf = (y) => Math.floor(y / 10) * 10;

function hash(str) {
  let h = 2166136261;
  for (const ch of str) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

/* Copertina generata dal nome: niente immagini protette da copyright. */
function coverStyle(item) {
  const h = hash(item.artist + item.title);
  const hue = h % 360;
  const hue2 = (hue + 30 + (h >> 9) % 120) % 360;
  const patterns = [
    `linear-gradient(${h % 180}deg, hsl(${hue} 70% 45%), hsl(${hue2} 75% 25%))`,
    `radial-gradient(circle at ${20 + (h % 60)}% ${20 + ((h >> 4) % 60)}%, hsl(${hue2} 90% 60%) 0 18%, transparent 19%), linear-gradient(160deg, hsl(${hue} 55% 30%), hsl(${hue} 60% 14%))`,
    `repeating-linear-gradient(${(h >> 3) % 180}deg, hsl(${hue} 70% 50%) 0 14px, hsl(${hue2} 70% 30%) 14px 28px)`,
    `conic-gradient(from ${h % 360}deg at 70% 30%, hsl(${hue} 80% 55%), hsl(${hue2} 70% 35%), hsl(${hue} 60% 20%), hsl(${hue} 80% 55%))`,
  ];
  return { bg: patterns[h % patterns.length], label: `hsl(${hue2} 85% 60%)`, hue };
}

function availability(stock) {
  if (stock === 0) return `<span class="avail out">Esaurito</span>`;
  if (stock === 1) return `<span class="avail low">Ultimo pezzo</span>`;
  return `<span class="avail">Disponibile</span>`;
}

/* Copertina originale da Discogs, se presente; se non carica resta quella generata. */
const httpsUrl = (u) => (/^https:\/\//.test(u || "") ? u : "");
function artHTML(item) {
  const url = httpsUrl(item.cover_url);
  return `
    <div class="cover-glyph">${esc(item.artist.replace(/^the /i, "")[0])}</div>
    <div class="cover-text"><b>${esc(item.title)}</b><span>${esc(item.artist)}</span></div>
    ${url ? `<img class="cover-img" src="${esc(url)}" alt="Copertina di ${esc(item.title)}" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()" />` : ""}`;
}

function coverHTML(item) {
  const c = coverStyle(item);
  const badges = [
    item.isNew ? `<span class="badge new">Novità</span>` : "",
  ].join("");
  return `
    <div class="cover-wrap">
      ${item.format === "LP" ? `<div class="disc" style="--disc-label:${c.label}"></div>` : ""}
      <div class="cover" style="background:${c.bg}">${artHTML(item)}</div>
      <div class="badges"><span class="badge">${item.format}</span>${badges}</div>
    </div>`;
}

function cardHTML(item, i = 0) {
  return `
    <button class="card${item.stock === 0 ? " soldout" : ""}" data-id="${item.id}" data-format="${item.format}" style="animation-delay:${Math.min(i, 12) * 30}ms">
      ${coverHTML(item)}
      <div class="meta">
        <span class="title">${esc(item.title)}</span>
        <span class="artist">${esc(item.artist)} · ${item.year}</span>
        <div class="row"><span class="price">${euro(item.price)}</span>${availability(item.stock)}</div>
      </div>
    </button>`;
}

function filtered() {
  const q = norm(state.query.trim());
  const list = items.filter((it) =>
    (!state.format || it.format === state.format) &&
    (!state.genre || it.genre === state.genre) &&
    (!state.decade || decadeOf(it.year) === +state.decade) &&
    (!state.inStock || it.stock > 0) &&
    (!q || norm(`${it.artist} ${it.title} ${it.label} ${it.genre} ${it.year}`).includes(q))
  );
  const by = {
    artist: (a, b) => a.artist.localeCompare(b.artist, "it") || a.year - b.year,
    title: (a, b) => a.title.localeCompare(b.title, "it"),
    "year-desc": (a, b) => b.year - a.year,
    "year-asc": (a, b) => a.year - b.year,
    "price-asc": (a, b) => a.price - b.price,
    "price-desc": (a, b) => b.price - a.price,
  };
  return list.sort(by[state.sort]);
}

function render() {
  const list = filtered();
  $("#grid").innerHTML = list.map(cardHTML).join("");
  $("#empty").hidden = list.length > 0;
  $("#resultCount").textContent = `${list.length} ${list.length === 1 ? "titolo" : "titoli"}`;
  document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.dataset.format === state.format));
}

function setupFilters() {
  const count = (f) => items.filter((i) => !f || i.format === f).length;
  $("#formatTabs").innerHTML = [["", "Tutto"], ...Object.entries(FORMATS)]
    .map(([f, label]) => `<button class="tab" role="tab" data-format="${f}">${label}<small>${count(f)}</small></button>`)
    .join("");
  $("#formatTabs").addEventListener("click", (e) => {
    const tab = e.target.closest(".tab");
    if (!tab) return;
    state.format = tab.dataset.format;
    render();
  });

  const genres = [...new Set(items.map((i) => i.genre))].sort((a, b) => a.localeCompare(b, "it"));
  $("#genre").innerHTML = `<option value="">Tutti i generi</option>` + genres.map((g) => `<option>${esc(g)}</option>`).join("");

  const decades = [...new Set(items.map((i) => decadeOf(i.year)))].sort((a, b) => b - a);
  $("#decade").innerHTML = `<option value="">Tutti gli anni</option>` + decades.map((d) => `<option value="${d}">Anni ${String(d).slice(2)}${d >= 2000 ? ` (${d})` : ""}</option>`).join("");

  for (const key of ["genre", "decade", "sort"]) {
    $("#" + key).addEventListener("change", (e) => { state[key] = e.target.value; render(); });
  }
  $("#query").addEventListener("input", (e) => { state.query = e.target.value; render(); });
  $("#inStock").addEventListener("change", (e) => { state.inStock = e.target.checked; render(); });

  $("#heroSearch").addEventListener("submit", (e) => {
    e.preventDefault();
    state.query = $("#heroQuery").value;
    $("#query").value = state.query;
    render();
    $("#catalogo").scrollIntoView({ behavior: "smooth" });
  });
}

/* Ogni formato ha la sua scheda: vinile caldo, CD argento, DVD cinema. */
const DETAIL = {
  LP:  { kicker: "Vinile · LP", specs: ['12"', "33⅓ giri", "Lato A · Lato B"], disc: "33⅓", cta: "Prenota il vinile" },
  CD:  { kicker: "Compact Disc", specs: ["CD audio", "12 cm", "Jewel case"], disc: "", cta: "Prenota il CD" },
  DVD: { kicker: "DVD Video", specs: ["DVD Video", "Live & film musicali", "Custodia DVD"], disc: "DVD", cta: "Prenota il DVD" },
};

/* Tracklist da Discogs: i vinili divisi per lato (A1, A2… → Lato A). */
function tracklistHTML(it) {
  const list = Array.isArray(it.tracklist) ? it.tracklist : [];
  const count = list.filter((t) => !t.heading).length;
  if (!count) return "";
  let side = null, rows = "";
  for (const t of list) {
    if (t.heading) { rows += `<li class="tl-head">${esc(t.title)}</li>`; continue; }
    const letter = it.format === "LP" ? (String(t.position).match(/^[A-Z]/i) || [""])[0].toUpperCase() : "";
    if (letter && letter !== side) { side = letter; rows += `<li class="tl-head">Lato ${letter}</li>`; }
    rows += `<li><span class="tl-pos">${esc(t.position)}</span><span class="tl-title">${esc(t.title)}</span><span class="tl-dur">${esc(t.duration)}</span></li>`;
  }
  return `
    <details class="tracklist" open>
      <summary>${it.format === "DVD" ? "Scaletta" : "Tracklist"} <small>${count} ${count === 1 ? "brano" : "brani"}</small></summary>
      <ol>${rows}</ol>
    </details>`;
}

function discogsCredit(it) {
  if (!it.discogs_id) return "";
  const type = it.discogs_type === "master" ? "master" : "release";
  return `<a class="dg-credit" href="https://www.discogs.com/${type}/${+it.discogs_id}" target="_blank" rel="noopener">Tracklist e copertina: Discogs ↗</a>`;
}

function openDetail(id) {
  const it = items.find((i) => i.id === id);
  if (!it) return;
  const c = coverStyle(it);
  const d = DETAIL[it.format];
  const msg = encodeURIComponent(`Ciao Discostar! È disponibile "${it.title}" di ${it.artist} (${it.format})?`);
  $("#modal").dataset.format = it.format;
  $("#modalBody").innerHTML = `
    <article class="detail" data-format="${it.format}" style="--h:${c.hue}">
      <div class="detail-art">
        ${it.format === "DVD" ? `<div class="screen" style="--cover:${c.bg}"><span class="play" aria-hidden="true">▶</span></div>` : ""}
        <div class="detail-object">
          <div class="detail-disc"><div class="disc-spin" style="--disc-label:${c.label}"><span>${d.disc}</span></div></div>
          <div class="detail-cover" style="background:${c.bg}">${artHTML(it)}</div>
        </div>
      </div>
      <div class="detail-info">
        <span class="fmt">${d.kicker}${it.isNew ? ` · <em>Novità</em>` : ""}</span>
        <h3>${esc(it.title)}</h3>
        <p class="by">${esc(it.artist)}</p>
        <ul class="spec-pills">${d.specs.map((s) => `<li>${s}</li>`).join("")}</ul>
        <dl class="specs">
          <dt>Anno</dt><dd>${it.year}</dd>
          <dt>Genere</dt><dd>${esc(it.genre)}</dd>
          <dt>Etichetta</dt><dd>${esc(it.label)}</dd>
        </dl>
        ${tracklistHTML(it)}
        <div class="buy">
          <span class="detail-price">${euro(it.price)}</span>
          ${availability(it.stock)}
        </div>
        <a class="cta" target="_blank" rel="noopener" href="https://wa.me/${SHOP.whatsapp}?text=${msg}">
          ${it.stock > 0 ? d.cta : "Avvisami quando torna"}
        </a>
        ${discogsCredit(it)}
      </div>
    </article>`;
  $("#modal").showModal();
}

function setupModal() {
  document.addEventListener("click", (e) => {
    const card = e.target.closest(".card[data-id]");
    if (card) openDetail(+card.dataset.id);
  });
  $("#modalClose").addEventListener("click", () => $("#modal").close());
  $("#modal").addEventListener("click", (e) => { if (e.target.id === "modal") $("#modal").close(); });
}

function setupStatic() {
  $("#stats").innerHTML = Object.entries(FORMATS)
    .map(([f, label]) => `<div class="stat"><b>${items.filter((i) => i.format === f).length}</b><span>${label}</span></div>`)
    .join("");
  $("#newRail").innerHTML = items.filter((i) => i.isNew).map(cardHTML).join("");
  if (items.some((i) => i.discogs_id)) {
    $("#credits").innerHTML = `Copertine e tracklist: <a href="https://www.discogs.com" target="_blank" rel="noopener">Discogs</a> · `;
  }
  $("#shopInfo").innerHTML = `
    <dt>Indirizzo</dt><dd>${esc(SHOP.address)}</dd>
    <dt>Orari</dt><dd>${esc(SHOP.hours)}</dd>
    <dt>Telefono</dt><dd><a href="tel:${SHOP.phone.replace(/\s/g, "")}">${esc(SHOP.phone)}</a></dd>
    <dt>Email</dt><dd><a href="mailto:${SHOP.email}">${esc(SHOP.email)}</a></dd>`;
}

function setupMap() {
  const q = encodeURIComponent(SHOP.mapQuery);
  $("#mapFrame").src = `https://www.google.com/maps?q=${q}&z=16&output=embed`;
  $("#mapLink").href = `https://www.google.com/maps/search/?api=1&query=${q}`;
  $("#year").textContent = new Date().getFullYear();
}

async function init() {
  setupMap();
  setupModal();
  items = await window.loadCatalog();
  if (window.CATALOG_SOURCE === "draft") {
    document.body.insertAdjacentHTML("afterbegin",
      `<div class="draft-bar">Anteprima della bozza dell'area gestione (solo in questo browser). Il sito pubblico mostra catalog.js finché non lo sostituisci.</div>`);
  }
  setupStatic();
  setupFilters();
  render();
}

init();
