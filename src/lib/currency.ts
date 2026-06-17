// Currency utilities: detect viewer currency + fetch live FX rates.

const RATES_CACHE_KEY = "fx_rates_v1";
const RATES_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const CURRENCY_CACHE_KEY = "viewer_currency_v1";

export type Rates = Record<string, number>; // base USD

interface CachedRates {
  fetched: number;
  base: string;
  rates: Rates;
}

const COUNTRY_TO_CURRENCY: Record<string, string> = {
  US: "USD", CA: "CAD", MX: "MXN", BR: "BRL", AR: "ARS", CL: "CLP", CO: "COP", PE: "PEN",
  GB: "GBP", IE: "EUR", FR: "EUR", DE: "EUR", ES: "EUR", PT: "EUR", IT: "EUR", NL: "EUR",
  BE: "EUR", LU: "EUR", AT: "EUR", FI: "EUR", GR: "EUR", EE: "EUR", LV: "EUR", LT: "EUR",
  SI: "EUR", SK: "EUR", CY: "EUR", MT: "EUR", HR: "EUR",
  CH: "CHF", PL: "PLN", CZ: "CZK", HU: "HUF", RO: "RON", BG: "BGN", SE: "SEK", NO: "NOK",
  DK: "DKK", IS: "ISK", UA: "UAH", RU: "RUB", TR: "TRY",
  CN: "CNY", JP: "JPY", KR: "KRW", IN: "INR", PK: "PKR", BD: "BDT", LK: "LKR",
  TH: "THB", VN: "VND", PH: "PHP", ID: "IDR", MY: "MYR", SG: "SGD", HK: "HKD", TW: "TWD",
  AE: "AED", SA: "SAR", QA: "QAR", KW: "KWD", BH: "BHD", OM: "OMR", IL: "ILS",
  EG: "EGP", ZA: "ZAR", NG: "NGN", KE: "KES", MA: "MAD", TN: "TND",
  AU: "AUD", NZ: "NZD",
};

export async function detectViewerCurrency(): Promise<string> {
  try {
    const cached = localStorage.getItem(CURRENCY_CACHE_KEY);
    if (cached) return cached;
  } catch {}

  // 1. Try Intl locale -> region -> currency
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    const region = new Intl.Locale(locale).maximize().region;
    if (region && COUNTRY_TO_CURRENCY[region]) {
      const cur = COUNTRY_TO_CURRENCY[region];
      try { localStorage.setItem(CURRENCY_CACHE_KEY, cur); } catch {}
      return cur;
    }
  } catch {}

  // 2. Fallback: IP geolocation
  try {
    const res = await fetch("https://ipapi.co/json/");
    if (res.ok) {
      const data = await res.json();
      const cur = data.currency || COUNTRY_TO_CURRENCY[data.country_code] || "USD";
      try { localStorage.setItem(CURRENCY_CACHE_KEY, cur); } catch {}
      return cur;
    }
  } catch {}

  return "USD";
}

export async function getRates(): Promise<Rates> {
  try {
    const raw = localStorage.getItem(RATES_CACHE_KEY);
    if (raw) {
      const cached: CachedRates = JSON.parse(raw);
      if (Date.now() - cached.fetched < RATES_TTL_MS && cached.rates) {
        return cached.rates;
      }
    }
  } catch {}

  // open.er-api.com: free, no key, base USD
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD");
    if (res.ok) {
      const data = await res.json();
      if (data?.rates) {
        const cached: CachedRates = { fetched: Date.now(), base: "USD", rates: data.rates };
        try { localStorage.setItem(RATES_CACHE_KEY, JSON.stringify(cached)); } catch {}
        return data.rates;
      }
    }
  } catch {}

  return { USD: 1 };
}

export function convert(amount: number, from: string, to: string, rates: Rates): number | null {
  const f = rates[from.toUpperCase()];
  const t = rates[to.toUpperCase()];
  if (!f || !t) return null;
  // rates are USD-based: amount in `from` -> USD -> `to`
  const usd = amount / f;
  return usd * t;
}

export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency.toUpperCase(),
      maximumFractionDigits: amount >= 100 ? 0 : 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency.toUpperCase()}`;
  }
}
