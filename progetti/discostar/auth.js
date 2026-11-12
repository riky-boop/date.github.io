/*
  Protezione dell'area gestione senza server.
  La password non viene salvata: serve a cifrare (AES-256-GCM, chiave PBKDF2-SHA256) il token Discogs,
  conservato cifrato in questo browser. Se la password è sbagliata la decifratura fallisce.
  Chi aggira la schermata di blocco non ottiene il token e modifica solo una copia locale del catalogo.
*/
const Vault = (() => {
  const KEY = "discostar-admin-vault";
  const SESSION = "discostar-admin-session";
  const ITERATIONS = 310000;
  const enc = { encode: (s) => new TextEncoder().encode(s) };
  const dec = { decode: (b) => new TextDecoder().decode(b) };
  const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
  const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

  const supported = () => !!(window.crypto && window.crypto.subtle && window.isSecureContext !== false);
  const exists = () => localStorage.getItem(KEY) !== null;

  async function deriveKey(password, salt, iterations) {
    const base = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey(
      { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
      base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  }

  async function create(password, token) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(password, salt, ITERATIONS);
    const data = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(JSON.stringify({ token: token || "" })));
    localStorage.setItem(KEY, JSON.stringify({ v: 1, iter: ITERATIONS, salt: b64(salt), iv: b64(iv), data: b64(data) }));
    startSession(token || "");
  }

  /* Restituisce il token se la password è giusta, altrimenti lancia un errore. */
  async function unlock(password) {
    const box = JSON.parse(localStorage.getItem(KEY));
    const key = await deriveKey(password, unb64(box.salt), box.iter);
    let plain;
    try {
      plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(box.iv) }, key, unb64(box.data));
    } catch {
      throw new Error("Password non corretta");
    }
    const { token } = JSON.parse(dec.decode(plain));
    startSession(token);
    return token;
  }

  // La sessione dura finché la scheda resta aperta.
  function startSession(token) { sessionStorage.setItem(SESSION, JSON.stringify({ token })); }
  function session() {
    try { return JSON.parse(sessionStorage.getItem(SESSION)); } catch { return null; }
  }
  function lock() { sessionStorage.removeItem(SESSION); }
  function reset() { localStorage.removeItem(KEY); lock(); }

  return { supported, exists, create, unlock, session, lock, reset };
})();
