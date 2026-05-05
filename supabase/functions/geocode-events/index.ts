import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const CONTINENT_BY_CC: Record<string, string> = {
  // quick mapping of common ISO country codes to continents
  US: "North America", CA: "North America", MX: "North America",
  GT: "North America", CR: "North America", PA: "North America", CU: "North America", DO: "North America",
  BR: "South America", AR: "South America", CL: "South America", CO: "South America", PE: "South America",
  VE: "South America", UY: "South America", BO: "South America", EC: "South America", PY: "South America",
  GB: "Europe", IE: "Europe", FR: "Europe", DE: "Europe", ES: "Europe", PT: "Europe", IT: "Europe",
  NL: "Europe", BE: "Europe", LU: "Europe", CH: "Europe", AT: "Europe", PL: "Europe", CZ: "Europe",
  SK: "Europe", HU: "Europe", RO: "Europe", BG: "Europe", GR: "Europe", SE: "Europe", NO: "Europe",
  FI: "Europe", DK: "Europe", IS: "Europe", EE: "Europe", LV: "Europe", LT: "Europe", UA: "Europe",
  BY: "Europe", MD: "Europe", RU: "Europe", RS: "Europe", HR: "Europe", SI: "Europe", BA: "Europe",
  AL: "Europe", MK: "Europe", ME: "Europe", XK: "Europe", TR: "Europe",
  CN: "Asia", JP: "Asia", KR: "Asia", IN: "Asia", PK: "Asia", BD: "Asia", LK: "Asia", NP: "Asia",
  TH: "Asia", VN: "Asia", PH: "Asia", ID: "Asia", MY: "Asia", SG: "Asia", HK: "Asia", TW: "Asia",
  AE: "Asia", SA: "Asia", QA: "Asia", KW: "Asia", BH: "Asia", OM: "Asia", IL: "Asia", JO: "Asia",
  LB: "Asia", IR: "Asia", IQ: "Asia", AF: "Asia", KZ: "Asia", UZ: "Asia",
  EG: "Africa", ZA: "Africa", NG: "Africa", KE: "Africa", MA: "Africa", TN: "Africa", DZ: "Africa",
  ET: "Africa", GH: "Africa", UG: "Africa", TZ: "Africa", SN: "Africa", CI: "Africa", CM: "Africa",
  AU: "Oceania", NZ: "Oceania", FJ: "Oceania", PG: "Oceania",
};

interface GeoResult {
  latitude: number;
  longitude: number;
  city: string | null;
  country: string | null;
  continent: string | null;
}

function isOnline(loc: string): boolean {
  const l = loc.toLowerCase();
  return !loc.trim() || l === "online" || l.includes("online") || l.includes("virtual") || l.includes("remote");
}

async function geocode(location: string): Promise<GeoResult | null> {
  if (isOnline(location)) return null;
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=1&q=${encodeURIComponent(location)}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "lovable-dev-events/1.0 (geocoder)",
      "Accept": "application/json",
    },
  });
  if (!res.ok) {
    console.error(`Nominatim ${res.status} for "${location}"`);
    return null;
  }
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) return null;
  const r = data[0];
  const addr = r.address || {};
  const city = addr.city || addr.town || addr.village || addr.municipality || addr.county || null;
  const country = addr.country || null;
  const cc = (addr.country_code || "").toUpperCase();
  const continent = CONTINENT_BY_CC[cc] || null;
  return {
    latitude: parseFloat(r.lat),
    longitude: parseFloat(r.lon),
    city,
    country,
    continent,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: events, error } = await supabase
      .from("events")
      .select("id, location")
      .is("latitude", null);

    if (error) throw error;
    if (!events || events.length === 0) {
      return new Response(JSON.stringify({ message: "Nothing to geocode", processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let updated = 0;
    let skippedOnline = 0;
    let failed = 0;

    for (const ev of events) {
      const loc = ev.location || "";
      if (isOnline(loc)) {
        await supabase.from("events").update({
          continent: "Online", country: "Online", city: "Online",
        }).eq("id", ev.id);
        skippedOnline++;
        continue;
      }
      try {
        const geo = await geocode(loc);
        if (!geo) { failed++; }
        else {
          await supabase.from("events").update(geo).eq("id", ev.id);
          updated++;
        }
      } catch (e) {
        console.error("geocode error", loc, e);
        failed++;
      }
      // Nominatim usage policy: max 1 req/sec
      await new Promise((r) => setTimeout(r, 1100));
    }

    return new Response(
      JSON.stringify({ processed: events.length, updated, skippedOnline, failed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("geocode-events error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
