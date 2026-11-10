/*
  CONFIGURAZIONE DISCOSTAR — l'unico file da modificare a mano.
*/
window.DISCOSTAR = {
  shop: {
    address: "Via Leopoldo Nobili 36, 41126 Modena (MO)",
    mapQuery: "Discostar, Via Leopoldo Nobili 36, 41126 Modena",
    hours: "Mar–Sab 9:30–12:30 · 15:30–19:30", // DA VERIFICARE
    phone: "+39 059 000 0000",                  // DA SOSTITUIRE
    email: "info@discostar.it",                 // DA SOSTITUIRE
    whatsapp: "390000000000",                   // DA SOSTITUIRE: solo cifre, con prefisso 39
  },

  /*
    Database Supabase (vedi README, sezione "Attivare la gestione online").
    Finché questi due campi sono vuoti il sito usa i dati di esempio in catalog.js.
    La "anon key" è pubblica per natura: la sicurezza è garantita dalle regole in supabase/schema.sql.
  */
  supabaseUrl: "",
  supabaseAnonKey: "",
};
