/* Gestione catalogo: ogni modifica viene salvata subito su Supabase. */
const FIELDS = ["format", "artist", "title", "year", "genre", "label", "price", "stock", "isNew"];
const $ = (sel) => document.querySelector(sel);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const norm = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const round2 = (n) => Math.round(n * 100) / 100;

const { supabaseUrl, supabaseAnonKey } = window.DISCOSTAR;
let db = null;
let items = [];
let editingId = null;
let canEdit = false;
const view = { search: "", format: "", onlyOut: false, sort: "artist", desc: false };

function show(id) {
  for (const v of ["setupView", "loginView", "appView"]) $("#" + v).hidden = v !== id;
  $("#logoutBtn").hidden = id !== "appView";
}

function toast(text) {
  const t = $("#toast");
  t.textContent = text;
  t.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (t.hidden = true), 2400);
}

function saveState(text, cls = "") {
  const s = $("#saveState");
  s.textContent = text;
  s.className = "save-state " + cls;
}

/* Le scritture vengono eseguite una alla volta, nell'ordine dei clic. */
let queue = Promise.resolve();
let pending = 0;
function write(label, op) {
  pending++;
  saveState("Salvataggio…");
  const run = queue.then(async () => {
    const { data, error } = await op();
    if (error) throw error;
    return data;
  });
  queue = run.catch(() => {});
  return run
    .then((data) => { if (--pending === 0) saveState("Salvato ✓", "ok"); return data; })
    .catch((err) => {
      pending--;
      saveState("Errore di salvataggio", "err");
      toast(`${label}: non salvato (${err.message || err})`);
      throw err;
    });
}

/* ---------- Avvio e accesso ---------- */
async function start() {
  if (!supabaseUrl || !supabaseAnonKey || !window.supabase) return show("setupView");
  db = window.supabase.createClient(supabaseUrl, supabaseAnonKey);
  const { data } = await db.auth.getSession();
  if (data.session) enterApp();
  else show("loginView");
}

$("#loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = e.target.elements;
  $("#loginError").hidden = true;
  const { error } = await db.auth.signInWithPassword({ email: f.email.value.trim(), password: f.password.value });
  if (error) {
    $("#loginError").textContent = "Email o password non corretti.";
    $("#loginError").hidden = false;
    return;
  }
  f.password.value = "";
  enterApp();
});

$("#logoutBtn").addEventListener("click", async () => {
  await db.auth.signOut();
  items = [];
  saveState("");
  show("loginView");
});

async function enterApp() {
  show("appView");
  $("#rows").innerHTML = `<tr><td colspan="9" class="muted">Caricamento…</td></tr>`;
  const { data: isAdmin } = await db.rpc("is_admin");
  canEdit = !!isAdmin;
  $("#notAdmin").hidden = canEdit;
  $("#appView").classList.toggle("readonly", !canEdit);
  try {
    items = await fetchAll();
  } catch (err) {
    $("#rows").innerHTML = `<tr><td colspan="9" class="error">Impossibile caricare il catalogo: ${esc(err.message)}</td></tr>`;
    return;
  }
  render();
}

async function fetchAll() {
  const PAGE = 1000, all = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db.from("items").select("*").order("id").range(from, from + PAGE - 1);
    if (error) throw error;
    all.push(...data.map(clean));
    if (data.length < PAGE) return all;
  }
}

const clean = (i) => ({ ...i, price: +i.price, year: +i.year || 0, stock: +i.stock || 0 });
const pick = (o) => Object.fromEntries(FIELDS.map((f) => [f, o[f]]));

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
      <td>${i.year || ""}</td>
      <td>${esc(i.genre)}</td>
      <td class="num"><input class="cell-input" type="number" step="0.01" min="0" data-act="price" value="${i.price.toFixed(2)}" aria-label="Prezzo" /></td>
      <td class="num"><span class="stock">
        <button data-act="dec" aria-label="Diminuisci">−</button>
        <input class="cell-input${i.stock === 0 ? " zero" : ""}" type="number" min="0" data-act="stock" value="${i.stock}" aria-label="Pezzi" />
        <button data-act="inc" aria-label="Aumenta">+</button>
      </span></td>
      <td><input type="checkbox" data-act="new" ${i.isNew ? "checked" : ""} aria-label="Nuovo arrivo" /></td>
      <td><button class="btn small" data-act="edit">Modifica</button></td>
    </tr>`).join("") || `<tr><td colspan="9" class="muted">Nessun articolo trovato.</td></tr>`;

  const count = (f) => items.filter((i) => i.format === f).length;
  const out = items.filter((i) => i.stock === 0).length;
  $("#summary").textContent = `${items.length} articoli · ${count("LP")} LP · ${count("CD")} CD · ${count("DVD")} DVD · ${out} esauriti`;
  $("#emptyDb").hidden = items.length > 0 || !canEdit;
  document.querySelectorAll("th[data-sort]").forEach((th) => {
    th.classList.toggle("sorted", th.dataset.sort === view.sort);
    th.classList.toggle("desc", th.dataset.sort === view.sort && view.desc);
  });
  $("#genreList").innerHTML = [...new Set(items.map((i) => i.genre))].sort().map((g) => `<option value="${esc(g)}">`).join("");
}

/* Modifica di un campo con aggiornamento immediato e ripristino in caso di errore. */
function patch(item, changes) {
  const before = pick(item);
  Object.assign(item, changes);
  render();
  return write(`${item.title}`, () => db.from("items").update(changes).eq("id", item.id))
    .catch(() => { Object.assign(item, before); render(); });
}

$("#rows").addEventListener("click", (e) => {
  const act = e.target.dataset.act;
  const row = e.target.closest("tr[data-id]");
  if (!act || !row) return;
  const item = items.find((i) => i.id === +row.dataset.id);
  if (act === "inc") patch(item, { stock: item.stock + 1 });
  if (act === "dec" && item.stock > 0) patch(item, { stock: item.stock - 1 });
  if (act === "new") patch(item, { isNew: e.target.checked });
  if (act === "edit") openEditor(item);
});

$("#rows").addEventListener("change", (e) => {
  const act = e.target.dataset.act;
  if (act !== "price" && act !== "stock") return;
  const item = items.find((i) => i.id === +e.target.closest("tr").dataset.id);
  const value = act === "price" ? round2(+e.target.value) : Math.floor(+e.target.value);
  if (!(value >= 0)) return render();
  if (value !== item[act]) patch(item, { [act]: value });
});

$("#rows").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && e.target.classList.contains("cell-input")) e.target.blur();
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

function openEditor(item, prefill) {
  editingId = item ? item.id : null;
  $("#formTitle").textContent = item ? "Modifica articolo" : "Nuovo articolo";
  $("#deleteBtn").hidden = $("#duplicateBtn").hidden = !item || !canEdit;
  const data = item || prefill || { format: "LP", year: new Date().getFullYear(), stock: 1, isNew: true };
  for (const f of FIELDS) {
    const input = form.elements[f];
    if (input.type === "checkbox") input.checked = !!data[f];
    else input.value = data[f] ?? "";
  }
  $("#editor").showModal();
  form.elements.artist.focus();
}

function formData() {
  const el = form.elements;
  return {
    format: el.format.value,
    artist: el.artist.value.trim(),
    title: el.title.value.trim(),
    year: +el.year.value,
    genre: el.genre.value.trim(),
    label: el.label.value.trim(),
    price: round2(+el.price.value),
    stock: Math.floor(+el.stock.value),
    isNew: el.isNew.checked,
  };
}

form.addEventListener("submit", async () => {
  const data = formData();
  if (editingId) {
    await patch(items.find((i) => i.id === editingId), data);
    return toast("Articolo aggiornato");
  }
  try {
    const row = await write("Nuovo articolo", () => db.from("items").insert(data).select().single());
    items.push(clean(row));
    render();
    toast("Articolo aggiunto");
  } catch {}
});

$("#cancelBtn").addEventListener("click", () => $("#editor").close());

$("#duplicateBtn").addEventListener("click", () => {
  const copy = formData();
  $("#editor").close();
  openEditor(null, copy);
});

$("#deleteBtn").addEventListener("click", async () => {
  const item = items.find((i) => i.id === editingId);
  if (!confirm(`Eliminare "${item.title}" di ${item.artist}?`)) return;
  $("#editor").close();
  try {
    await write("Eliminazione", () => db.from("items").delete().eq("id", item.id));
    items = items.filter((i) => i.id !== item.id);
    render();
    toast("Articolo eliminato");
  } catch {}
});

$("#addBtn").addEventListener("click", () => openEditor(null));

async function insertMany(rows) {
  const saved = [];
  for (let i = 0; i < rows.length; i += 500) {
    saved.push(...await write("Importazione", () => db.from("items").insert(rows.slice(i, i + 500)).select()));
  }
  return saved.map(clean);
}

$("#seedBtn").addEventListener("click", async () => {
  try {
    items = await insertMany((window.CATALOG || []).map(pick));
    render();
    toast(`${items.length} articoli di esempio caricati`);
  } catch {}
});

/* ---------- CSV ---------- */
function download(name, content, type) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([content], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

$("#exportCsv").addEventListener("click", () => {
  const cols = ["id", ...FIELDS];
  const cell = (v) => (/[;"\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : v);
  const rows = items.map((i) => cols.map((f) =>
    f === "price" ? String(i.price).replace(".", ",") : f === "isNew" ? (i.isNew ? "si" : "no") : cell(i[f])).join(";"));
  download(`catalogo-discostar-${new Date().toISOString().slice(0, 10)}.csv`, "﻿" + [cols.join(";"), ...rows].join("\n"), "text/csv");
});

function parseCSV(text) {
  text = text.replace(/^﻿/, "");
  const first = text.split("\n")[0];
  const sep = (first.match(/;/g) || []).length >= (first.match(/,/g) || []).length ? ";" : ",";
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
    const item = {
      format,
      artist: o.artist,
      title: o.title,
      year: parseInt(o.year) || null,
      genre: o.genre || "Altro",
      label: o.label || "",
      price: round2(parseFloat(String(o.price).replace(/[€\s]/g, "").replace(",", ".")) || 0),
      stock: Math.max(0, parseInt(o.stock) || 0),
      isNew: /^(si|sì|s|true|1|x|yes)$/i.test(o.isNew),
    };
    if (parseInt(o.id) > 0) item.id = parseInt(o.id);
    ok.push(item);
  });
  return { ok, skipped };
}

$("#importCsv").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  e.target.value = "";
  if (!file) return;
  let parsed;
  try {
    parsed = rowsToItems(parseCSV(await file.text()));
    if (!parsed.ok.length) throw new Error("Nessuna riga valida trovata.");
  } catch (err) {
    return alert("Importazione non riuscita: " + err.message);
  }
  const known = new Set(items.map((i) => i.id));
  const updates = parsed.ok.filter((i) => known.has(i.id));
  const inserts = parsed.ok.filter((i) => !known.has(i.id)).map(pick);
  const skippedNote = parsed.skipped.length
    ? `\n${parsed.skipped.length} righe non valide verranno saltate (righe ${parsed.skipped.slice(0, 10).join(", ")}${parsed.skipped.length > 10 ? "…" : ""}).`
    : "";
  if (!confirm(`${updates.length} articoli da aggiornare, ${inserts.length} da aggiungere.${skippedNote}\nProcedere?`)) return;
  try {
    for (let i = 0; i < updates.length; i += 500) {
      await write("Importazione", () => db.from("items").upsert(updates.slice(i, i + 500)).select());
    }
    await insertMany(inserts);
    items = await fetchAll();
    render();
    toast(`Importati: ${updates.length} aggiornati, ${inserts.length} aggiunti`);
  } catch {
    items = await fetchAll().catch(() => items);
    render();
  }
});

start();
