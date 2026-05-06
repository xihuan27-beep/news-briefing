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
    language: "العربية",
    outlets: "سكاي نيوز عربية · الشرق الأوسط",
    outletEntries: [
      { name: "سكاي نيوز عربية (Sky News Arabia)", rssUrl: "https://www.skynewsarabia.com/rss.xml" },
      { name: "الشرق الأوسط (Asharq Al-Awsat)", rssUrl: "https://aawsat.com/feed" },
    ],
  },
  {
    id: "china",
    flag: "🇨🇳",
    name: "중국",
    language: "中文",
    outlets: "人民日报 · 新华网",
    outletEntries: [
      { name: "人民日报", rssUrl: "http://www.people.com.cn/rss/politics.xml" },
      { name: "新华网", rssUrl: "http://www.xinhuanet.com/politics/news_politics.xml" },
    ],
  },
  {
    id: "japan",
    flag: "🇯🇵",
    name: "일본",
    language: "日本語",
    outlets: "NHKニュース · 毎日新聞",
    outletEntries: [
      { name: "NHKニュース", rssUrl: "https://www3.nhk.or.jp/rss/news/cat0.xml" },
      { name: "毎日新聞", rssUrl: "https://mainichi.jp/rss/etc/mainichi-flash.rss" },
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
