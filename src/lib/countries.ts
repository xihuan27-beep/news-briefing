export interface OutletConfig {
  name: string;
  rssUrl: string;
}

export interface CountryConfig {
  id: string;
  flag: string;
  name: string;
  language: string;
  outlets: string;
  outletEntries: OutletConfig[];
}

export const COUNTRIES: CountryConfig[] = [
  {
    id: "usa",
    flag: "🇺🇸",
    name: "미국",
    language: "English",
    outlets: "The New York Times · The Wall Street Journal",
    outletEntries: [
      {
        name: "The New York Times",
        rssUrl: "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml",
      },
      {
        name: "The Wall Street Journal",
        rssUrl: "https://feeds.a.dj.com/rss/RSSWorldNews.xml",
      },
    ],
  },
  {
    id: "arab",
    flag: "🇸🇦",
    name: "아랍권",
    language: "English",
    outlets: "Al Jazeera · Arab News",
    outletEntries: [
      { name: "Al Jazeera", rssUrl: "https://www.aljazeera.com/xml/rss/all.xml" },
      { name: "Arab News", rssUrl: "https://www.arabnews.com/rss.xml" },
    ],
  },
  {
    id: "china",
    flag: "🇨🇳",
    name: "중국",
    language: "English",
    outlets: "People's Daily · South China Morning Post",
    outletEntries: [
      { name: "People's Daily", rssUrl: "http://en.people.cn/rss/90000.xml" },
      { name: "South China Morning Post", rssUrl: "https://www.scmp.com/rss/91/feed" },
    ],
  },
  {
    id: "japan",
    flag: "🇯🇵",
    name: "일본",
    language: "日本語 / English",
    outlets: "朝日新聞 · The Japan Times",
    outletEntries: [
      {
        name: "朝日新聞 (Asahi)",
        rssUrl: "https://www.asahi.com/rss/asahi/newsheadlines.rdf",
      },
      { name: "The Japan Times", rssUrl: "https://www.japantimes.co.jp/feed/" },
    ],
  },
  {
    id: "france",
    flag: "🇫🇷",
    name: "프랑스",
    language: "Français",
    outlets: "Le Monde · Le Figaro",
    outletEntries: [
      { name: "Le Monde", rssUrl: "https://www.lemonde.fr/rss/une.xml" },
      { name: "Le Figaro", rssUrl: "https://www.lefigaro.fr/rss/figaro_actualites.xml" },
    ],
  },
  {
    id: "germany",
    flag: "🇩🇪",
    name: "독일",
    language: "Deutsch",
    outlets: "Der Spiegel · Die Welt",
    outletEntries: [
      { name: "Der Spiegel", rssUrl: "https://www.spiegel.de/schlagzeilen/index.rss" },
      { name: "Die Welt", rssUrl: "https://www.welt.de/feeds/topnews.rss" },
    ],
  },
  {
    id: "uk",
    flag: "🇬🇧",
    name: "영국",
    language: "English",
    outlets: "The Guardian · BBC",
    outletEntries: [
      { name: "The Guardian", rssUrl: "https://www.theguardian.com/uk/rss" },
      { name: "BBC News", rssUrl: "https://feeds.bbci.co.uk/news/uk/rss.xml" },
    ],
  },
  {
    id: "mexico",
    flag: "🇲🇽",
    name: "멕시코",
    language: "Español",
    outlets: "La Jornada · Expansión",
    outletEntries: [
      { name: "La Jornada", rssUrl: "https://www.jornada.com.mx/rss/edicion.xml" },
      { name: "Expansión", rssUrl: "https://expansion.mx/rss" },
    ],
  },
  {
    id: "argentina",
    flag: "🇦🇷",
    name: "아르헨티나",
    language: "Español",
    outlets: "Clarín · La Nación",
    outletEntries: [
      { name: "Clarín", rssUrl: "https://www.clarin.com/rss/lo-ultimo/" },
      {
        name: "La Nación",
        rssUrl: "https://www.lanacion.com.ar/arc/outboundfeeds/rss/?outputType=xml",
      },
    ],
  },
  {
    id: "africa",
    flag: "🌍",
    name: "아프리카",
    language: "English",
    outlets: "Mail & Guardian · Daily Trust",
    outletEntries: [
      { name: "Mail & Guardian", rssUrl: "https://mg.co.za/feed/" },
      { name: "Daily Trust", rssUrl: "https://dailytrust.com/feed/" },
    ],
  },
];

export const getCountry = (id: string): CountryConfig | undefined =>
  COUNTRIES.find((c) => c.id === id);
