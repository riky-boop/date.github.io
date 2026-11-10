# Discostar — sito catalogo

Sito statico (HTML/CSS/JS, nessuna dipendenza) per scoprire vinili, CD e DVD del negozio Discostar di Modena.

## Aprire il sito
Doppio clic su `index.html`, oppure pubblicalo così com'è su GitHub Pages / Netlify.

## Aggiornare il catalogo
Apri `admin.html` (non è linkata dal sito pubblico):
- aggiungi, modifica, elimina articoli; +/− sui pezzi disponibili; spunta "Novità";
- importa/esporta il catalogo in CSV (apribile con Excel);
- clicca **Scarica catalog.js** e sostituisci il file `catalog.js` del sito.

Le modifiche restano in bozza nel browser finché non sostituisci il file.
I dati attuali sono **di esempio**.

> Nota: il sito è statico, quindi `admin.html` non salva nulla sul server e non serve una password: chi la apre può solo scaricare un file, non cambiare il sito.

## Dati del negozio
In cima a `app.js` c'è l'oggetto `SHOP` (indirizzo, orari, telefono, email, numero WhatsApp): sostituisci i segnaposto con quelli reali.
