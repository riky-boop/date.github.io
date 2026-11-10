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
- **Modifica** per gli altri campi, **Duplica** per un'altra copia (es. usato), **Elimina**.
- **Esporta CSV** → modifica in Excel → **Importa CSV**: le righe con `id` vengono aggiornate, quelle senza vengono aggiunte; l'importazione non elimina nulla.

## Pubblicazione
Carica la cartella su GitHub Pages, Netlify o qualunque hosting statico.
