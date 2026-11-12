# Discostar — sito catalogo

Sito statico (HTML/CSS/JS) per scoprire vinili, CD e DVD del negozio Discostar di Modena.

| File | Cosa contiene |
|---|---|
| `config.js` | **dati del negozio** (indirizzo, mappa, orari, contatti) e chiavi del database |
| `index.html`, `app.js`, `styles.css` | sito pubblico |
| `admin.html`, `admin.js`, `admin.css` | gestione catalogo (con accesso) |
| `data.js` | carica il catalogo dal database |
| `catalog.js` | catalogo **di esempio**, usato finché il database non è collegato |
| `supabase/schema.sql` | struttura del database e regole di sicurezza |

## Attivare la gestione online (una volta sola)
Il catalogo vive in un database gratuito [Supabase](https://supabase.com): da `admin.html` si modifica e il sito si aggiorna subito, senza caricare file.

1. Crea un account su supabase.com e un nuovo progetto (regione Europe).
2. **SQL Editor** → incolla `supabase/schema.sql` → **Run**.
3. **Authentication → Users → Add user**: email e password dell'amministratore.
4. SQL Editor: `insert into admins (email) values ('email-amministratore');`
5. **Authentication → Sign In / Providers**: disattiva *Allow new users to sign up*.
6. **Project Settings → API**: copia *Project URL* e *anon public key* in `config.js`.
7. Apri `admin.html`, accedi e premi **Carica il catalogo di esempio** (o importa un CSV).

La *anon key* è pubblica per natura: chiunque può **leggere** il catalogo, solo le email nella tabella `admins` possono **modificarlo**.

## Usare la gestione
- Prezzo e pezzi si modificano direttamente in tabella (+/−); "Novità" con la spunta.
- **Modifica** per gli altri campi, **Duplica** per un articolo simile, **Elimina**.
- **Esporta CSV** → modifica in Excel → **Importa CSV**: le righe con `id` vengono aggiornate, quelle senza vengono aggiunte; l'importazione non elimina nulla.

## Accesso all'area gestione
- **Senza Supabase (modalità locale)**: al primo accesso `admin.html` chiede di creare una password (min. 8 caratteri). La password non viene salvata: serve a **cifrare il token Discogs** (AES-256-GCM, chiave PBKDF2-SHA256 con 310.000 iterazioni), conservato cifrato nel browser. Ad ogni apertura della scheda va reinserita; **Esci** blocca di nuovo, **Password** la cambia. Se la dimentichi, "Password dimenticata?" ne crea una nuova (il token va reinserito, il catalogo resta).
  Dopo aver creato la password puoi **svuotare `discogs-token.js`**: il token resta cifrato nel browser.
  Limite: senza server la schermata di blocco si può aggirare con gli strumenti del browser, ma chi lo fa non ottiene il token e può solo modificare una copia del catalogo nel proprio browser, che non viene pubblicata.
  Serve aprire la pagina da `http://localhost` o `https://` (non come file): il browser abilita la cifratura solo lì.
- **Con Supabase**: accesso con email e password verificato dal server; solo le email nella tabella `admins` possono modificare il catalogo. Se il token Discogs è stato cifrato con la stessa password, viene sbloccato automaticamente all'accesso.

## Copertine e tracklist da Discogs
1. Incolla il tuo token Discogs in **`discogs-token.js`**: `window.DISCOGS_TOKEN = "il-tuo-token";`
   (se il file manca, copia `discogs-token.example.js` e rinominalo).
2. Esegui di nuovo `supabase/schema.sql` nello SQL Editor (aggiunge le colonne per copertina, tracklist e barcode).
3. In `admin.html`:
   - **Completa da Discogs**: cerca tutti gli articoli senza copertina. Se artista e titolo coincidono li abbina da solo, gli altri finiscono in **"da verificare"** con il pulsante **Scegli**. Circa 30 articoli al minuto (limite Discogs: 60 richieste/minuto); tieni la pagina aperta.
   - **Modifica → Cerca su Discogs**: scegli a mano l'edizione giusta. Con il **barcode** (EAN) la ricerca è esatta.

Sul sito pubblico compaiono la copertina originale (se non carica resta quella generata) e la tracklist nella scheda del disco (vinili divisi per Lato A/B), con il link a Discogs.

> **Sicurezza del token**: `discogs-token.js` è escluso da git (`.gitignore`), quindi non finisce su GitHub né sul sito pubblicato. Usalo sul computer del negozio. Non caricarlo su un hosting pubblico: il token dà accesso al tuo account Discogs.
> I testi delle tracklist Discogs sono CC0 (liberi); le immagini sono soggette ai [termini API di Discogs](https://support.discogs.com/hc/en-us/articles/360009334593): per questo il sito cita sempre Discogs come fonte.

## Pubblicazione
Carica la cartella su GitHub Pages, Netlify o qualunque hosting statico.
