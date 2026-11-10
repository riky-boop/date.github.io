/* Dati del negozio e del database: config.js */
const SHOP = window.DISCOSTAR.shop;

const FORMATS = { LP: "Vinili", CD: "CD", DVD: "DVD" };
let items = [];
const $ = (sel) => document.querySelector(sel);

const state = { format: "", query: "", genre: "", decade: "", condition: "", sort: "artist", inStock: false };

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
  return { bg: patterns[h % patterns.length], label: `hsl(${hue2} 85% 60%)` };
}

function availability(stock) {
  if (stock === 0) return `<span class="avail out">Esaurito</span>`;
  if (stock === 1) return `<span class="avail low">Ultimo pezzo</span>`;
  return `<span class="avail">Disponibile</span>`;
}

function coverHTML(item) {
  const c = coverStyle(item);
  const badges = [
    item.isNew ? `<span class="badge new">Novità</span>` : "",
    item.condition === "Usato" ? `<span class="badge used">Usato</span>` : "",
  ].join("");
  return `
    <div class="cover-wrap">
      ${item.format === "LP" ? `<div class="disc" style="--disc-label:${c.label}"></div>` : ""}
      <div class="cover" style="background:${c.bg}">
        <div class="cover-glyph">${esc(item.artist.replace(/^the /i, "")[0])}</div>
        <div class="cover-text"><b>${esc(item.title)}</b><span>${esc(item.artist)}</span></div>
      </div>
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
    (!state.condition || it.condition === state.condition) &&
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

  for (const key of ["genre", "decade", "condition", "sort"]) {
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

function openDetail(id) {
  const it = items.find((i) => i.id === id);
  if (!it) return;
  const msg = encodeURIComponent(`Ciao Discostar! È disponibile "${it.title}" di ${it.artist} (${it.format})?`);
  $("#modalBody").innerHTML = `
    <div class="detail card" data-format="${it.format}">
      ${coverHTML(it)}
      <div class="detail-info">
        <span class="fmt">${FORMATS[it.format].toUpperCase()} · ${it.condition.toUpperCase()}</span>
        <h3>${esc(it.title)}</h3>
        <p class="by">${esc(it.artist)}</p>
        <dl class="specs">
          <dt>Anno</dt><dd>${it.year}</dd>
          <dt>Genere</dt><dd>${esc(it.genre)}</dd>
          <dt>Etichetta</dt><dd>${esc(it.label)}</dd>
          <dt>Stato</dt><dd>${availability(it.stock)}</dd>
        </dl>
        <span class="detail-price">${euro(it.price)}</span>
        <a class="cta" target="_blank" rel="noopener" href="https://wa.me/${SHOP.whatsapp}?text=${msg}">
          ${it.stock > 0 ? "Prenota su WhatsApp" : "Chiedi quando torna"}
        </a>
      </div>
    </div>`;
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
  setupStatic();
  setupFilters();
  render();
}

init();
