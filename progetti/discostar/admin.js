/* Gestione catalogo: ogni modifica viene salvata subito su Supabase. */
const FIELDS = ["format", "barcode", "artist", "title", "year", "genre", "label", "price", "stock", "isNew"];
const $ = (sel) => document.querySelector(sel);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const norm = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const round2 = (n) => Math.round(n * 100) / 100;
const DG_EMPTY = { discogs_id: null, discogs_type: null, cover_url: null, thumb_url: null, tracklist: [] };

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
  // Senza Supabase: modalità locale (catalogo nel browser, pubblicazione scaricando catalog.js).
  if (!supabaseUrl || !supabaseAnonKey) {
    db = createLocalClient();
    $("#localMode").hidden = false;
    await enterApp();
    $("#logoutBtn").hidden = true;
    return;
  }
  if (!window.supabase) {
    toast("Impossibile caricare Supabase: controlla la connessione");
    return show("setupView");
  }
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
  $("#rows").innerHTML = `<tr><td colspan="10" class="muted">Caricamento…</td></tr>`;
  const { data: isAdmin } = await db.rpc("is_admin");
  canEdit = !!isAdmin;
  $("#notAdmin").hidden = canEdit;
  $("#appView").classList.toggle("readonly", !canEdit);
  $("#dgNoToken").hidden = Discogs.enabled() || !canEdit;
  $("#dgFillBtn").hidden = !canEdit;
  $("#dgFillBtn").disabled = !Discogs.enabled();
  try {
    items = await fetchAll();
  } catch (err) {
    $("#rows").innerHTML = `<tr><td colspan="10" class="error">Impossibile caricare il catalogo: ${esc(err.message)}</td></tr>`;
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

const clean = (i) => ({ ...i, price: +i.price, year: +i.year || 0, stock: +i.stock || 0, barcode: i.barcode || "", tracklist: i.tracklist || [] });
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
      <td class="thumb">${i.thumb_url
        ? `<img src="${esc(i.thumb_url)}" alt="" loading="lazy" />`
        : `<span class="nothumb" title="Nessun dato Discogs">♪</span>`}</td>
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
    </tr>`).join("") || `<tr><td colspan="10" class="muted">Nessun articolo trovato.</td></tr>`;

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
  const before = Object.fromEntries(Object.keys(changes).map((k) => [k, item[k]]));
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
  dgPending = undefined;
  $("#dgResults").innerHTML = "";
  renderDgCurrent(item || DG_EMPTY);
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
    barcode: el.barcode.value.replace(/\s/g, ""),
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
  const data = { ...formData(), ...(dgPending || {}) };
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

/* ---------- Modalità locale: pubblicazione con catalog.js ---------- */
function catalogJS() {
  const keep = ["id", ...FIELDS, "discogs_id", "discogs_type", "cover_url", "thumb_url", "tracklist"];
  const lines = [...items]
    .sort((a, b) => a.id - b.id)
    .map((i) => "  " + JSON.stringify(Object.fromEntries(keep
      .filter((k) => i[k] !== undefined && i[k] !== null && i[k] !== "" && !(Array.isArray(i[k]) && !i[k].length))
      .map((k) => [k, i[k]]))));
  return `/*
  CATALOGO DISCOSTAR
  Generato dall'area gestione il ${new Date().toLocaleString("it-IT")}.
  Per aggiornarlo usa admin.html e sostituisci questo file con quello scaricato.
*/
window.CATALOG = [
${lines.join(",\n")}
];
`;
}

$("#downloadJsBtn").addEventListener("click", () => {
  download("catalog.js", catalogJS(), "text/javascript");
  toast("catalog.js scaricato: sostituiscilo nella cartella del sito");
});

$("#resetLocalBtn").addEventListener("click", async () => {
  if (!confirm("Annullare tutte le modifiche fatte in questo browser e ricaricare il catalogo da catalog.js?")) return;
  db.reset();
  items = await fetchAll();
  render();
  toast("Catalogo ricaricato da catalog.js");
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
      barcode: (o.barcode || "").replace(/\s/g, ""),
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

/* ---------- Discogs: copertina e tracklist ---------- */
let dgPending;      // dati Discogs scelti nell'editor, salvati con "Salva"
let dgCandidates = [];
let dgRunning = false, dgStop = false;
let dgReview = [];

function renderDgCurrent(src) {
  const linked = !!src.discogs_id;
  const tracks = (src.tracklist || []).filter((t) => !t.heading).length;
  $("#dgCurrent").innerHTML = linked
    ? `${src.thumb_url ? `<img src="${esc(src.thumb_url)}" alt="" />` : ""}
       <div><b>${tracks} brani</b>${src.cover_url ? " · copertina" : ""}${dgPending ? ` · <em>da salvare</em>` : ""}<br />
       <a href="${Discogs.pageUrl(src)}" target="_blank" rel="noopener">Vedi su Discogs ↗</a></div>`
    : `<span class="muted">${Discogs.enabled() ? "Nessun disco Discogs collegato." : "Discogs non collegato: inserisci il token in discogs-token.js."}</span>`;
  $("#dgClearBtn").hidden = !linked || !canEdit;
  $("#dgSearchBtn").disabled = !Discogs.enabled() || !canEdit;
}

async function dgSearch() {
  const query = formData();
  if (!query.artist || !query.title) return toast("Inserisci prima artista e titolo");
  $("#dgResults").innerHTML = `<p class="muted">Cerco su Discogs…</p>`;
  try {
    dgCandidates = await Discogs.search(query);
  } catch (err) {
    $("#dgResults").innerHTML = `<p class="error">${esc(err.message)}</p>`;
    return;
  }
  $("#dgResults").innerHTML = dgCandidates.length
    ? `<p class="muted">Scegli l'edizione giusta:</p>` + dgCandidates.map((c, n) => `
        <button type="button" class="dg-result${Discogs.matches(query, c) ? " sure" : ""}" data-pick="${n}">
          ${c.thumb ? `<img src="${esc(c.thumb)}" alt="" loading="lazy" />` : `<span class="nothumb">♪</span>`}
          <span><b>${esc(c.title)}</b><small>${[
            c.unofficial ? "⚠ Non ufficiale" : c.short ? "Singolo / EP" : c.type === "master" ? "Album originale" : "Edizione",
            c.year, c.country, c.format,
            c.have ? `${c.have.toLocaleString("it-IT")} collezionisti` : "",
          ].filter(Boolean).map(esc).join(" · ")}</small></span>
        </button>`).join("")
    : `<p class="muted">Nessun risultato. Prova a correggere artista/titolo o a inserire il barcode.</p>`;
}

$("#dgSearchBtn").addEventListener("click", dgSearch);

$("#dgResults").addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-pick]");
  if (!btn) return;
  $("#dgResults").innerHTML = `<p class="muted">Scarico tracklist e copertina…</p>`;
  try {
    dgPending = await Discogs.details(dgCandidates[+btn.dataset.pick]);
    $("#dgResults").innerHTML = "";
    renderDgCurrent(dgPending);
  } catch (err) {
    $("#dgResults").innerHTML = `<p class="error">${esc(err.message)}</p>`;
  }
});

$("#dgClearBtn").addEventListener("click", () => {
  dgPending = { ...DG_EMPTY };
  renderDgCurrent(DG_EMPTY);
  $("#dgCurrent").insertAdjacentHTML("beforeend", ` <em class="muted">(rimozione da salvare)</em>`);
});

/* Completa tutti gli articoli senza dati Discogs. */
function dgProgress(done, total, matched) {
  $("#dgProgressText").textContent = dgRunning
    ? `Discogs: ${done} di ${total} · ${matched} abbinati automaticamente`
    : `Discogs completato: ${matched} abbinati automaticamente su ${done}`;
  $("#dgBar").style.width = `${total ? Math.round((done / total) * 100) : 100}%`;
  $("#dgStopBtn").textContent = dgRunning ? "Interrompi" : "Chiudi";
}

function renderReview() {
  dgReview = dgReview.filter((i) => !i.discogs_id && items.includes(i));
  $("#dgReview").innerHTML = dgReview.length
    ? `<p><b>${dgReview.length} da verificare</b>: artista o titolo non coincidono esattamente con Discogs, scegli tu l'edizione.</p>
       <ul>${dgReview.map((i) => `
         <li><span class="fmt-pill">${i.format}</span> ${esc(i.artist)} — ${esc(i.title)}
         <button class="link" data-review="${i.id}">Scegli</button></li>`).join("")}</ul>`
    : "";
}

$("#dgReview").addEventListener("click", (e) => {
  const id = e.target.dataset.review;
  if (!id) return;
  openEditor(items.find((i) => i.id === +id));
  dgSearch();
});

$("#dgStopBtn").addEventListener("click", () => {
  if (dgRunning) dgStop = true;
  else $("#dgPanel").hidden = true;
});

async function fillFromDiscogs() {
  if (dgRunning) return;
  const todo = items.filter((i) => !i.discogs_id);
  if (!todo.length) return toast("Tutti gli articoli hanno già i dati Discogs");
  const minutes = Math.max(1, Math.ceil((todo.length * 2 * 1.1) / 60));
  if (!confirm(`Cercare su Discogs ${todo.length} articoli?\nTempo stimato: circa ${minutes} min. Intanto puoi continuare a lavorare, ma tieni aperta la pagina.`)) return;
  dgRunning = true; dgStop = false; dgReview = [];
  $("#dgPanel").hidden = false;
  $("#dgFillBtn").disabled = true;
  renderReview();
  let done = 0, matched = 0;
  for (const item of todo) {
    if (dgStop) break;
    dgProgress(done, todo.length, matched);
    try {
      const best = (await Discogs.search(item)).find((c) => Discogs.matches(item, c));
      if (best) {
        await patch(item, await Discogs.details(best));
        if (item.discogs_id) matched++;
      } else dgReview.push(item);
    } catch (err) {
      if (/token/i.test(err.message)) { toast(err.message); break; }
      dgReview.push(item);
    }
    done++;
  }
  dgRunning = false;
  $("#dgFillBtn").disabled = false;
  dgProgress(done, todo.length, matched);
  renderReview();
}

$("#dgFillBtn").addEventListener("click", fillFromDiscogs);

start();
