export interface CountryConfig {
  id: string;
  flag: string;
  name: string;
  language: string;
  outlets: string;
  outletDomains: string[];
  outletNames: string[];
  searchHints: string;
}

export const COUNTRIES: CountryConfig[] = [
  {
    id: "usa",
    flag: "🇺🇸",
    name: "미국",
    language: "English",
    outlets: "The New York Times · The Wall Street Journal",
    outletDomains: ["nytimes.com", "wsj.com"],
    outletNames: ["The New York Times", "The Wall Street Journal"],
    searchHints: "site:nytimes.com OR site:wsj.com",
  },
  {
    id: "arab",
    flag: "🇸🇦",
    name: "아랍권",
    language: "العربية (Arabic)",
    outlets: "Al Jazeera · Al-Ahram",
    outletDomains: ["aljazeera.net", "ahram.org.eg"],
    outletNames: ["Al Jazeera (الجزيرة)", "Al-Ahram (الأهرام)"],
    searchHints: "site:aljazeera.net OR site:ahram.org.eg أخبار اليوم",
  },
  {
    id: "china",
    flag: "🇨🇳",
    name: "중국",
    language: "中文 (简体)",
    outlets: "人民日报 · 财新网",
    outletDomains: ["people.com.cn", "caixin.com"],
    outletNames: ["人民日报 (People's Daily)", "财新网 (Caixin)"],
    searchHints: "site:people.com.cn OR site:caixin.com 今日新闻",
  },
  {
    id: "japan",
    flag: "🇯🇵",
    name: "일본",
    language: "日本語",
    outlets: "朝日新聞 · 読売新聞",
    outletDomains: ["asahi.com", "yomiuri.co.jp"],
    outletNames: ["朝日新聞 (Asahi Shimbun)", "読売新聞 (Yomiuri Shimbun)"],
    searchHints: "site:asahi.com OR site:yomiuri.co.jp 今日のニュース",
  },
  {
    id: "france",
    flag: "🇫🇷",
    name: "프랑스",
    language: "Français",
    outlets: "Le Monde · Le Figaro",
    outletDomains: ["lemonde.fr", "lefigaro.fr"],
    outletNames: ["Le Monde", "Le Figaro"],
    searchHints: "site:lemonde.fr OR site:lefigaro.fr actualités",
  },
  {
    id: "germany",
    flag: "🇩🇪",
    name: "독일",
    language: "Deutsch",
    outlets: "Der Spiegel · Die Welt",
    outletDomains: ["spiegel.de", "welt.de"],
    outletNames: ["Der Spiegel", "Die Welt"],
    searchHints: "site:spiegel.de OR site:welt.de Nachrichten",
  },
  {
    id: "uk",
    flag: "🇬🇧",
    name: "영국",
    language: "English",
    outlets: "The Guardian · Financial Times",
    outletDomains: ["theguardian.com", "ft.com"],
    outletNames: ["The Guardian", "Financial Times"],
    searchHints: "site:theguardian.com OR site:ft.com UK news",
  },
  {
    id: "mexico",
    flag: "🇲🇽",
    name: "멕시코",
    language: "Español",
    outlets: "El Universal · Reforma",
    outletDomains: ["eluniversal.com.mx", "reforma.com"],
    outletNames: ["El Universal", "Reforma"],
    searchHints: "site:eluniversal.com.mx OR site:reforma.com noticias hoy",
  },
  {
    id: "argentina",
    flag: "🇦🇷",
    name: "아르헨티나",
    language: "Español",
    outlets: "Clarín · La Nación",
    outletDomains: ["clarin.com", "lanacion.com.ar"],
    outletNames: ["Clarín", "La Nación"],
    searchHints: "site:clarin.com OR site:lanacion.com.ar noticias hoy",
  },
  {
    id: "africa",
    flag: "🌍",
    name: "아프리카",
    language: "English / Français",
    outlets: "Mail & Guardian · Daily Trust",
    outletDomains: ["mg.co.za", "dailytrust.com"],
    outletNames: ["Mail & Guardian", "Daily Trust"],
    searchHints: "site:mg.co.za OR site:dailytrust.com Africa news",
  },
];

export const getCountry = (id: string): CountryConfig | undefined =>
  COUNTRIES.find((c) => c.id === id);
