const CONTINENT_BY_CC: Record<string, string> = {
  US: "North America", CA: "North America", MX: "North America", GT: "North America", CR: "North America", PA: "North America", CU: "North America", DO: "North America",
  BR: "South America", AR: "South America", CL: "South America", CO: "South America", PE: "South America", VE: "South America", UY: "South America", BO: "South America", EC: "South America", PY: "South America",
  GB: "Europe", IE: "Europe", FR: "Europe", DE: "Europe", ES: "Europe", PT: "Europe", IT: "Europe", NL: "Europe", BE: "Europe", LU: "Europe", CH: "Europe", AT: "Europe", PL: "Europe", CZ: "Europe", SK: "Europe", HU: "Europe", RO: "Europe", BG: "Europe", GR: "Europe", SE: "Europe", NO: "Europe", FI: "Europe", DK: "Europe", IS: "Europe", EE: "Europe", LV: "Europe", LT: "Europe", UA: "Europe", BY: "Europe", MD: "Europe", RU: "Europe", RS: "Europe", HR: "Europe", SI: "Europe", BA: "Europe", AL: "Europe", MK: "Europe", ME: "Europe", XK: "Europe", TR: "Europe",
  CN: "Asia", JP: "Asia", KR: "Asia", IN: "Asia", PK: "Asia", BD: "Asia", LK: "Asia", NP: "Asia", TH: "Asia", VN: "Asia", PH: "Asia", ID: "Asia", MY: "Asia", SG: "Asia", HK: "Asia", TW: "Asia", AE: "Asia", SA: "Asia", QA: "Asia", KW: "Asia", BH: "Asia", OM: "Asia", IL: "Asia", JO: "Asia", LB: "Asia", IR: "Asia", IQ: "Asia", AF: "Asia", KZ: "Asia", UZ: "Asia",
  EG: "Africa", ZA: "Africa", NG: "Africa", KE: "Africa", MA: "Africa", TN: "Africa", DZ: "Africa", ET: "Africa", GH: "Africa", UG: "Africa", TZ: "Africa", SN: "Africa", CI: "Africa", CM: "Africa",
  AU: "Oceania", NZ: "Oceania", FJ: "Oceania", PG: "Oceania",
};

export interface GeoInfo {
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  country: string | null;
  continent: string | null;
}

export function isOnline(location: string): boolean {
  const l = (location || "").toLowerCase().trim();
  return !l || l.includes("online") || l.includes("virtual") || l.includes("remote");
}

/** Nominatim usage policy: max 1 request/second. */
const NOMINATIM_DELAY_MS = 1100;
let lastNominatimCall = 0;

export async function geocode(location: string): Promise<GeoInfo | null> {
  if (isOnline(location)) {
    return { latitude: null, longitude: null, city: "Online", country: "Online", continent: "Online" };
  }
  const wait = lastNominatimCall + NOMINATIM_DELAY_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastNominatimCall = Date.now();

  try {
    const url =
      "https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&accept-language=en&limit=1&q=" +
      encodeURIComponent(location);
    const res = await fetch(url, {
      headers: { "User-Agent": "dev-events/1.0", Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data: any = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    const r = data[0];
    const addr = r.address || {};
    const cc = String(addr.country_code || "").toUpperCase();
    return {
      latitude: parseFloat(r.lat),
      longitude: parseFloat(r.lon),
      city: addr.city || addr.town || addr.village || addr.municipality || addr.county || null,
      country: addr.country || null,
      continent: CONTINENT_BY_CC[cc] || null,
    };
  } catch (e) {
    console.error("geocode error", e);
    return null;
  }
}
