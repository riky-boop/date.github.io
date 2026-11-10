/*
  CATALOGO DISCOSTAR
  ------------------
  Per aggiungere un articolo copia una riga e modifica i campi:
    format:    "LP" | "CD" | "DVD"
    condition: "Nuovo" | "Usato"
    stock:     pezzi disponibili (0 = esaurito)
    isNew:     true se è un nuovo arrivo
  I dati qui sotto sono di ESEMPIO: sostituiscili con l'inventario reale.
*/
window.CATALOG = [
  { id: 1,  format: "LP",  artist: "Pink Floyd",           title: "The Dark Side of the Moon",   year: 1973, genre: "Rock",           label: "Harvest",             price: 32.90, condition: "Nuovo", stock: 4, isNew: false },
  { id: 2,  format: "LP",  artist: "Miles Davis",          title: "Kind of Blue",                year: 1959, genre: "Jazz",           label: "Columbia",            price: 27.50, condition: "Nuovo", stock: 3, isNew: true  },
  { id: 3,  format: "LP",  artist: "Lucio Battisti",       title: "Anima latina",                year: 1974, genre: "Italiana",       label: "Numero Uno",          price: 35.00, condition: "Usato", stock: 1, isNew: true  },
  { id: 4,  format: "LP",  artist: "Fleetwood Mac",        title: "Rumours",                     year: 1977, genre: "Rock",           label: "Warner Bros.",        price: 29.90, condition: "Nuovo", stock: 5, isNew: false },
  { id: 5,  format: "LP",  artist: "Daft Punk",            title: "Random Access Memories",      year: 2013, genre: "Elettronica",    label: "Columbia",            price: 44.90, condition: "Nuovo", stock: 2, isNew: false },
  { id: 6,  format: "LP",  artist: "Fabrizio De André",    title: "Crêuza de mä",                year: 1984, genre: "Italiana",       label: "Ricordi",             price: 28.00, condition: "Nuovo", stock: 3, isNew: false },
  { id: 7,  format: "LP",  artist: "John Coltrane",        title: "A Love Supreme",              year: 1965, genre: "Jazz",           label: "Impulse!",            price: 26.90, condition: "Nuovo", stock: 2, isNew: false },
  { id: 8,  format: "LP",  artist: "Radiohead",            title: "OK Computer",                 year: 1997, genre: "Rock",           label: "Parlophone",          price: 34.50, condition: "Nuovo", stock: 0, isNew: false },
  { id: 9,  format: "LP",  artist: "Kendrick Lamar",       title: "To Pimp a Butterfly",         year: 2015, genre: "Hip Hop",        label: "TDE",                 price: 39.90, condition: "Nuovo", stock: 2, isNew: true  },
  { id: 10, format: "LP",  artist: "Vasco Rossi",          title: "Bollicine",                   year: 1983, genre: "Italiana",       label: "Carosello",           price: 22.00, condition: "Usato", stock: 2, isNew: false },
  { id: 11, format: "LP",  artist: "Kraftwerk",            title: "Trans-Europa Express",        year: 1977, genre: "Elettronica",    label: "Kling Klang",         price: 27.90, condition: "Nuovo", stock: 1, isNew: false },
  { id: 12, format: "LP",  artist: "Stevie Wonder",        title: "Songs in the Key of Life",    year: 1976, genre: "Soul & Funk",    label: "Tamla",               price: 38.00, condition: "Usato", stock: 1, isNew: true  },
  { id: 13, format: "LP",  artist: "The Beatles",          title: "Abbey Road",                  year: 1969, genre: "Rock",           label: "Apple",               price: 31.90, condition: "Nuovo", stock: 6, isNew: false },
  { id: 14, format: "LP",  artist: "Ennio Morricone",      title: "C'era una volta il West",     year: 1968, genre: "Colonne sonore", label: "RCA",                 price: 24.90, condition: "Nuovo", stock: 2, isNew: false },
  { id: 15, format: "LP",  artist: "Nina Simone",          title: "I Put a Spell on You",        year: 1965, genre: "Jazz",           label: "Philips",             price: 25.00, condition: "Usato", stock: 1, isNew: false },
  { id: 16, format: "LP",  artist: "Franco Battiato",      title: "La voce del padrone",         year: 1981, genre: "Italiana",       label: "EMI",                 price: 26.50, condition: "Nuovo", stock: 3, isNew: false },
  { id: 17, format: "LP",  artist: "Nirvana",              title: "Nevermind",                   year: 1991, genre: "Rock",           label: "DGC",                 price: 29.90, condition: "Nuovo", stock: 4, isNew: false },
  { id: 18, format: "LP",  artist: "Aphex Twin",           title: "Selected Ambient Works 85–92", year: 1992, genre: "Elettronica",   label: "Apollo",              price: 33.00, condition: "Nuovo", stock: 1, isNew: true  },
  { id: 19, format: "LP",  artist: "Marvin Gaye",          title: "What's Going On",             year: 1971, genre: "Soul & Funk",    label: "Tamla",               price: 28.90, condition: "Nuovo", stock: 2, isNew: false },
  { id: 20, format: "LP",  artist: "Led Zeppelin",         title: "IV",                          year: 1971, genre: "Rock",           label: "Atlantic",            price: 45.00, condition: "Usato", stock: 1, isNew: false },
  { id: 21, format: "LP",  artist: "Mina",                 title: "Mina canta Battisti",         year: 1975, genre: "Italiana",       label: "PDU",                 price: 19.90, condition: "Usato", stock: 1, isNew: false },
  { id: 22, format: "LP",  artist: "Billie Eilish",        title: "Hit Me Hard and Soft",        year: 2024, genre: "Pop",            label: "Interscope",          price: 34.90, condition: "Nuovo", stock: 3, isNew: true  },
  { id: 23, format: "LP",  artist: "Taylor Swift",         title: "1989 (Taylor's Version)",     year: 2023, genre: "Pop",            label: "Republic",            price: 39.90, condition: "Nuovo", stock: 2, isNew: false },
  { id: 24, format: "LP",  artist: "Carlos Kleiber",       title: "Beethoven: Sinfonie 5 & 7",   year: 1975, genre: "Classica",       label: "Deutsche Grammophon", price: 27.00, condition: "Nuovo", stock: 2, isNew: false },

  { id: 25, format: "CD",  artist: "Nirvana",              title: "MTV Unplugged in New York",   year: 1994, genre: "Rock",           label: "DGC",                 price: 11.90, condition: "Nuovo", stock: 5, isNew: false },
  { id: 26, format: "CD",  artist: "Lucio Dalla",          title: "Dalla",                       year: 1980, genre: "Italiana",       label: "RCA",                 price: 9.90,  condition: "Nuovo", stock: 4, isNew: false },
  { id: 27, format: "CD",  artist: "Massive Attack",       title: "Mezzanine",                   year: 1998, genre: "Elettronica",    label: "Virgin",              price: 12.90, condition: "Nuovo", stock: 3, isNew: false },
  { id: 28, format: "CD",  artist: "Amy Winehouse",        title: "Back to Black",               year: 2006, genre: "Soul & Funk",    label: "Island",              price: 10.90, condition: "Nuovo", stock: 6, isNew: false },
  { id: 29, format: "CD",  artist: "Ligabue",              title: "Buon compleanno Elvis",       year: 1995, genre: "Italiana",       label: "WEA",                 price: 8.90,  condition: "Usato", stock: 2, isNew: true  },
  { id: 30, format: "CD",  artist: "Bill Evans Trio",      title: "Waltz for Debby",             year: 1962, genre: "Jazz",           label: "Riverside",           price: 13.50, condition: "Nuovo", stock: 2, isNew: false },
  { id: 31, format: "CD",  artist: "Nas",                  title: "Illmatic",                    year: 1994, genre: "Hip Hop",        label: "Columbia",            price: 11.50, condition: "Nuovo", stock: 3, isNew: false },
  { id: 32, format: "CD",  artist: "Luciano Pavarotti",    title: "The Essential Pavarotti",     year: 1990, genre: "Classica",       label: "Decca",               price: 9.90,  condition: "Usato", stock: 3, isNew: false },
  { id: 33, format: "CD",  artist: "Björk",                title: "Homogenic",                   year: 1997, genre: "Elettronica",    label: "One Little Indian",   price: 12.00, condition: "Nuovo", stock: 0, isNew: false },
  { id: 34, format: "CD",  artist: "Calcutta",             title: "Evergreen",                   year: 2018, genre: "Italiana",       label: "Bomba Dischi",        price: 12.90, condition: "Nuovo", stock: 2, isNew: true  },
  { id: 35, format: "CD",  artist: "Hans Zimmer",          title: "Interstellar OST",            year: 2014, genre: "Colonne sonore", label: "WaterTower",          price: 14.90, condition: "Nuovo", stock: 2, isNew: false },
  { id: 36, format: "CD",  artist: "Michael Jackson",      title: "Thriller",                    year: 1982, genre: "Pop",            label: "Epic",                price: 9.50,  condition: "Usato", stock: 4, isNew: false },
  { id: 37, format: "CD",  artist: "Pearl Jam",            title: "Ten",                         year: 1991, genre: "Rock",           label: "Epic",                price: 10.90, condition: "Nuovo", stock: 2, isNew: false },
  { id: 38, format: "CD",  artist: "Pino Daniele",         title: "Nero a metà",                 year: 1980, genre: "Italiana",       label: "EMI",                 price: 10.50, condition: "Nuovo", stock: 3, isNew: false },

  { id: 39, format: "DVD", artist: "Queen",                title: "Live at Wembley Stadium",     year: 1986, genre: "Rock",           label: "Parlophone",          price: 16.90, condition: "Nuovo", stock: 3, isNew: false },
  { id: 40, format: "DVD", artist: "Pink Floyd",           title: "Live at Pompeii",             year: 1972, genre: "Rock",           label: "Universal",           price: 18.90, condition: "Nuovo", stock: 2, isNew: true  },
  { id: 41, format: "DVD", artist: "Talking Heads",        title: "Stop Making Sense",           year: 1984, genre: "Rock",           label: "Palm Pictures",       price: 14.90, condition: "Usato", stock: 1, isNew: false },
  { id: 42, format: "DVD", artist: "Vasco Rossi",          title: "Modena Park 2017",            year: 2017, genre: "Italiana",       label: "Universal",           price: 19.90, condition: "Nuovo", stock: 5, isNew: true  },
  { id: 43, format: "DVD", artist: "Nirvana",              title: "Live at Reading",             year: 1992, genre: "Rock",           label: "Geffen",              price: 13.90, condition: "Nuovo", stock: 2, isNew: false },
  { id: 44, format: "DVD", artist: "Luciano Pavarotti",    title: "Pavarotti & Friends",         year: 1992, genre: "Classica",       label: "Decca",               price: 12.90, condition: "Usato", stock: 2, isNew: false },
  { id: 45, format: "DVD", artist: "Prince",               title: "Sign o' the Times",           year: 1987, genre: "Soul & Funk",    label: "Cineville",           price: 15.90, condition: "Nuovo", stock: 1, isNew: false },
  { id: 46, format: "DVD", artist: "The Band",             title: "The Last Waltz",              year: 1978, genre: "Rock",           label: "MGM",                 price: 11.90, condition: "Usato", stock: 1, isNew: false },
  { id: 47, format: "DVD", artist: "Buena Vista Social Club", title: "Buena Vista Social Club",  year: 1999, genre: "Jazz",           label: "Road Movies",         price: 10.90, condition: "Nuovo", stock: 2, isNew: false },
  { id: 48, format: "DVD", artist: "Daft Punk",            title: "Electroma",                   year: 2006, genre: "Elettronica",    label: "Daft Arts",           price: 17.90, condition: "Nuovo", stock: 0, isNew: false }
];
