/* Carica il catalogo: da Supabase se configurato, altrimenti dai dati di esempio in catalog.js. */
window.loadCatalog = async function () {
  const { supabaseUrl, supabaseAnonKey } = window.DISCOSTAR;
  if (!supabaseUrl || !supabaseAnonKey) return window.CATALOG || [];

  const PAGE = 1000; // limite di righe per richiesta di Supabase
  const all = [];
  try {
    for (let from = 0; ; from += PAGE) {
      const res = await fetch(`${supabaseUrl}/rest/v1/items?select=*&order=id`, {
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
          Range: `${from}-${from + PAGE - 1}`,
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const page = await res.json();
      all.push(...page.map((i) => ({ ...i, price: +i.price })));
      if (page.length < PAGE) return all;
    }
  } catch (err) {
    console.warn("Catalogo online non raggiungibile, uso i dati di esempio:", err);
    return window.CATALOG || [];
  }
};
