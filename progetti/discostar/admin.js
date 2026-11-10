/* Gestione catalogo: le modifiche restano in bozza nel browser finché non scarichi catalog.js. */
const DRAFT_KEY = "discostar-catalog-draft";
const FIELDS = ["format", "artist", "title", "year", "genre", "label", "price", "condition", "stock", "isNew"];
const $ = (sel) => document.querySelector(sel);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const norm = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const euro = (n) => n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });

const fromFile = () => JSON.parse(JSON.stringify(window.CATALOG || []));
let items = loadDraft() || fromFile();
let editingId = null;
const view = { search: "", format: "", onlyOut: false, sort: "artist", desc: false };

function loadDraft() {
  try { return JSON.parse(localStorage.getItem(DRAFT_KEY)); } catch { return null; }
}

function save(message) {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(items));
  render();
  if (message) toast(message);
}

function toast(text) {
  const t = $("#toast");
  t.textContent = text;
  t.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (t.hidden = true), 2200);
}

function nextId() {
  return items.reduce((max, i) => Math.max(max, i.id), 0) + 1;
}

/* ---------- Tabella ---------- */
function visible() {
  const q = norm(view.search.trim());
  return items
    .filter((i) =>
      (!view.format || i.format === view.format) &&
      (!view.onlyOut || i.stock === 0) &&
      (!q || norm(`${i.artist} ${i.title} ${i.label} ${i.genre} ${i.year}`).includes(q)))
    .sort((a, b) => {
      const x = a[view.sort], y = b[view.sort];
      const r = typeof x === "number" ? x - y : String(x).localeCompare(String(y), "it");
      return view.desc ? -r : r;
    });
}

function render() {
  const list = visible();
  $("#rows").innerHTML = list.map((i) => `
    <tr data-id="${i.id}" class="${i.stock === 0 ? "out" : ""}">
      <td><span class="fmt-pill">${i.format}</span></td>
      <td>${esc(i.artist)}</td>
      <td class="title">${esc(i.title)}</td>
      <td>${i.year}</td>
      <td>${esc(i.genre)}</td>
      <td>${i.condition}</td>
      <td class="num">${euro(i.price)}</td>
      <td class="num"><span class="stock">
        <button data-act="dec" aria-label="Diminuisci">−</button>
        <b class="${i.stock === 0 ? "zero" : ""}">${i.stock}</b>
        <button data-act="inc" aria-label="Aumenta">+</button>
      </span></td>
      <td><input type="checkbox" data-act="new" ${i.isNew ? "checked" : ""} aria-label="Nuovo arrivo" /></td>
      <td><button class="btn small" data-act="edit">Modifica</button></td>
    </tr>`).join("") || `<tr><td colspan="10" class="muted">Nessun articolo trovato.</td></tr>`;

  const count = (f) => items.filter((i) => i.format === f).length;
  const out = items.filter((i) => i.stock === 0).length;
  $("#summary").textContent = `${items.length} articoli · ${count("LP")} LP · ${count("CD")} CD · ${count("DVD")} DVD · ${out} esauriti`;
  $("#draftNotice").hidden = !localStorage.getItem(DRAFT_KEY);
  document.querySelectorAll("th[data-sort]").forEach((th) => {
    th.classList.toggle("sorted", th.dataset.sort === view.sort);
    th.classList.toggle("desc", th.dataset.sort === view.sort && view.desc);
  });
  $("#genreList").innerHTML = [...new Set(items.map((i) => i.genre))].sort().map((g) => `<option value="${esc(g)}">`).join("");
}

$("#rows").addEventListener("click", (e) => {
  const act = e.target.dataset.act;
  const row = e.target.closest("tr[data-id]");
  if (!act || !row) return;
  const item = items.find((i) => i.id === +row.dataset.id);
  if (act === "inc") item.stock++;
  if (act === "dec") item.stock = Math.max(0, item.stock - 1);
  if (act === "new") item.isNew = e.target.checked;
  if (act === "edit") return openEditor(item);
  save();
});

document.querySelector("thead").addEventListener("click", (e) => {
  const key = e.target.dataset.sort;
  if (!key) return;
  view.desc = view.sort === key ? !view.desc : false;
  view.sort = key;
  render();
});

$("#search").addEventListener("input", (e) => { view.search = e.target.value; render(); });
$("#fFormat").addEventListener("change", (e) => { view.format = e.target.value; render(); });
$("#fOut").addEventListener("change", (e) => { view.onlyOut = e.target.checked; render(); });

/* ---------- Editor ---------- */
const form = $("#form");

function openEditor(item) {
  editingId = item ? item.id : null;
  $("#formTitle").textContent = item ? "Modifica articolo" : "Nuovo articolo";
  $("#deleteBtn").hidden = !item;
  const data = item || { format: "LP", condition: "Nuovo", year: new Date().getFullYear(), stock: 1, isNew: true };
  for (const f of FIELDS) {
    const input = form.elements[f];
    if (input.type === "checkbox") input.checked = !!data[f];
    else input.value = data[f] ?? "";
  }
  $("#editor").showModal();
  form.elements.artist.focus();
}

form.addEventListener("submit", () => {
  const el = form.elements;
  const data = {
    format: el.format.value,
    artist: el.artist.value.trim(),
    title: el.title.value.trim(),
    year: +el.year.value,
    genre: el.genre.value.trim(),
    label: el.label.value.trim(),
    price: Math.round(+el.price.value * 100) / 100,
    condition: el.condition.value,
    stock: +el.stock.value,
    isNew: el.isNew.checked,
  };
  if (editingId) Object.assign(items.find((i) => i.id === editingId), data);
  else items.push({ id: nextId(), ...data });
  save(editingId ? "Articolo aggiornato" : "Articolo aggiunto");
});

$("#cancelBtn").addEventListener("click", () => $("#editor").close());
$("#deleteBtn").addEventListener("click", () => {
  const item = items.find((i) => i.id === editingId);
  if (!confirm(`Eliminare "${item.title}" di ${item.artist}?`)) return;
  items = items.filter((i) => i.id !== editingId);
  $("#editor").close();
  save("Articolo eliminato");
});
$("#addBtn").addEventListener("click", () => openEditor(null));

$("#resetBtn").addEventListener("click", () => {
  if (!confirm("Annullare tutte le modifiche non pubblicate e ricaricare il catalogo dal file?")) return;
  localStorage.removeItem(DRAFT_KEY);
  items = fromFile();
  render();
  toast("Catalogo ricaricato dal file");
});

/* ---------- Esportazione catalog.js ---------- */
function download(name, content, type) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([content], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function catalogJS() {
  const lines = [...items]
    .sort((a, b) => a.id - b.id)
    .map((i) => "  " + JSON.stringify({ id: i.id, ...Object.fromEntries(FIELDS.map((f) => [f, i[f]])) }));
  return `/*
  CATALOGO DISCOSTAR
  Generato da admin.html il ${new Date().toLocaleString("it-IT")}.
  Per modificarlo apri admin.html, poi sostituisci questo file con quello scaricato.
*/
window.CATALOG = [
${lines.join(",\n")}
];
`;
}

$("#downloadBtn").addEventListener("click", () => {
  download("catalog.js", catalogJS(), "text/javascript");
  toast("catalog.js scaricato: sostituiscilo sul sito");
});

/* ---------- CSV ---------- */
$("#exportCsv").addEventListener("click", () => {
  const cell = (v) => (/[;"\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : v);
  const rows = items.map((i) => FIELDS.map((f) =>
    f === "price" ? String(i.price).replace(".", ",") : f === "isNew" ? (i.isNew ? "si" : "no") : cell(i[f])).join(";"));
  download("catalogo-discostar.csv", "﻿" + [FIELDS.join(";"), ...rows].join("\n"), "text/csv");
});

function parseCSV(text) {
  text = text.replace(/^﻿/, "");
  const sep = (text.split("\n")[0].match(/;/g) || []).length >= (text.split("\n")[0].match(/,/g) || []).length ? ";" : ",";
  const rows = [];
  let row = [], cur = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') quoted = false;
      else cur += c;
    } else if (c === '"') quoted = true;
    else if (c === sep) { row.push(cur); cur = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cur); rows.push(row); row = []; cur = "";
    } else cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows.filter((r) => r.some((v) => v.trim()));
}

function rowsToItems(rows) {
  const head = rows[0].map((h) => h.trim());
  const missing = ["format", "artist", "title"].filter((f) => !head.includes(f));
  if (missing.length) throw new Error(`Colonne mancanti: ${missing.join(", ")}`);
  const ok = [], skipped = [];
  rows.slice(1).forEach((r, n) => {
    const o = Object.fromEntries(head.map((h, i) => [h, (r[i] ?? "").trim()]));
    const format = o.format.toUpperCase();
    if (!["LP", "CD", "DVD"].includes(format) || !o.artist || !o.title) return skipped.push(n + 2);
    ok.push({
      id: ok.length + 1,
      format,
      artist: o.artist,
      title: o.title,
      year: parseInt(o.year) || 0,
      genre: o.genre || "Altro",
      label: o.label || "",
      price: parseFloat(String(o.price).replace(/[€\s]/g, "").replace(",", ".")) || 0,
      condition: /^usat/i.test(o.condition) ? "Usato" : "Nuovo",
      stock: parseInt(o.stock) || 0,
      isNew: /^(si|sì|s|true|1|x|yes)$/i.test(o.isNew),
    });
  });
  return { ok, skipped };
}

$("#importCsv").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  e.target.value = "";
  if (!file) return;
  try {
    const { ok, skipped } = rowsToItems(parseCSV(await file.text()));
    if (!ok.length) throw new Error("Nessuna riga valida trovata.");
    const note = skipped.length ? `\n${skipped.length} righe non valide verranno saltate (righe ${skipped.slice(0, 10).join(", ")}${skipped.length > 10 ? "…" : ""}).` : "";
    if (!confirm(`Importare ${ok.length} articoli? Il catalogo attuale verrà sostituito.${note}`)) return;
    items = ok;
    save(`${ok.length} articoli importati`);
  } catch (err) {
    alert("Importazione non riuscita: " + err.message);
  }
});

render();
