import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const CONTINENT_BY_CC: Record<string, string> = {
  US: "North America", CA: "North America", MX: "North America", GT: "North America", CR: "North America", PA: "North America", CU: "North America", DO: "North America",
  BR: "South America", AR: "South America", CL: "South America", CO: "South America", PE: "South America", VE: "South America", UY: "South America", BO: "South America", EC: "South America", PY: "South America",
  GB: "Europe", IE: "Europe", FR: "Europe", DE: "Europe", ES: "Europe", PT: "Europe", IT: "Europe", NL: "Europe", BE: "Europe", LU: "Europe", CH: "Europe", AT: "Europe", PL: "Europe", CZ: "Europe", SK: "Europe", HU: "Europe", RO: "Europe", BG: "Europe", GR: "Europe", SE: "Europe", NO: "Europe", FI: "Europe", DK: "Europe", IS: "Europe", EE: "Europe", LV: "Europe", LT: "Europe", UA: "Europe", BY: "Europe", MD: "Europe", RU: "Europe", RS: "Europe", HR: "Europe", SI: "Europe", BA: "Europe", AL: "Europe", MK: "Europe", ME: "Europe", XK: "Europe", TR: "Europe",
  CN: "Asia", JP: "Asia", KR: "Asia", IN: "Asia", PK: "Asia", BD: "Asia", LK: "Asia", NP: "Asia", TH: "Asia", VN: "Asia", PH: "Asia", ID: "Asia", MY: "Asia", SG: "Asia", HK: "Asia", TW: "Asia", AE: "Asia", SA: "Asia", QA: "Asia", KW: "Asia", BH: "Asia", OM: "Asia", IL: "Asia", JO: "Asia", LB: "Asia", IR: "Asia", IQ: "Asia", AF: "Asia", KZ: "Asia", UZ: "Asia",
  EG: "Africa", ZA: "Africa", NG: "Africa", KE: "Africa", MA: "Africa", TN: "Africa", DZ: "Africa", ET: "Africa", GH: "Africa", UG: "Africa", TZ: "Africa", SN: "Africa", CI: "Africa", CM: "Africa",
  AU: "Oceania", NZ: "Oceania", FJ: "Oceania", PG: "Oceania",
};

function isOnline(loc: string): boolean {
  const l = (loc || "").toLowerCase();
  return !l.trim() || l === "online" || l.includes("online") || l.includes("virtual") || l.includes("remote");
}

async function geocode(location: string) {
  if (isOnline(location)) {
    return { latitude: null, longitude: null, city: "Online", country: "Online", continent: "Online" };
  }
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2format=jsonv2&addressdetails=1&limit=1addressdetails=1format=jsonv2&addressdetails=1&limit=1accept-language=enformat=jsonv2&addressdetails=1&limit=1limit=1&q=${encodeURIComponent(location)}`;
    const res = await fetch(url, { headers: { "User-Agent": "lovable-dev-events/1.0", "Accept": "application/json" } });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    const r = data[0];
    const addr = r.address || {};
    const cc = (addr.country_code || "").toUpperCase();
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!FIRECRAWL_API_KEY || !LOVABLE_API_KEY) {
      console.error("Missing FIRECRAWL_API_KEY or LOVABLE_API_KEY");
      return new Response(JSON.stringify({ error: "Not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get all saved sources
    const { data: sources, error: srcErr } = await supabase
      .from("scrape_sources")
      .select("*");

    if (srcErr || !sources || sources.length === 0) {
      console.log("No sources to scrape");
      return new Response(JSON.stringify({ message: "No sources configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let totalImported = 0;
    let totalSkipped = 0;

    for (const source of sources) {
      console.log(`Scraping source: ${source.name} (${source.url})`);

      try {
        // Scrape with Firecrawl
        const scrapeResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: source.url,
            formats: ["markdown"],
            onlyMainContent: true,
          }),
        });

        const scrapeData = await scrapeResponse.json();
        if (!scrapeResponse.ok || !scrapeData.success) {
          console.error(`Firecrawl error for ${source.url}:`, scrapeData);
          continue;
        }

        const markdown = scrapeData.data?.markdown || scrapeData.markdown || "";
        if (!markdown) {
          console.log(`No content for ${source.url}`);
          continue;
        }

        // Extract events with AI
        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              {
                role: "system",
                content: "Extract all developer events from the web content. For each event determine the type (conference, meetup, workshop, or hackathon), relevant tags, registration URL, and region info (continent, country, city, latitude, longitude of the city). Use 'Online' for virtual events and omit coordinates in that case.",
              },
              {
                role: "user",
                content: `Extract all developer events:\n\n${markdown.slice(0, 15000)}`,
              },
            ],
            tools: [
              {
                type: "function",
                function: {
                  name: "extract_events",
                  description: "Extract developer events",
                  parameters: {
                    type: "object",
                    properties: {
                      events: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            title: { type: "string" },
                            description: { type: "string" },
                            date: { type: "string", description: "YYYY-MM-DD" },
                            time: { type: "string", description: "HH:MM, default 09:00" },
                            location: { type: "string" },
                            type: { type: "string", enum: ["conference", "meetup", "workshop", "hackathon"] },
                            tags: { type: "array", items: { type: "string" } },
                            url: { type: "string" },
                            continent: { type: "string", description: "Continent: Africa, Antarctica, Asia, Europe, North America, Oceania, South America, or Online" },
                            country: { type: "string" },
                            city: { type: "string" },
                            latitude: { type: "number" },
                            longitude: { type: "number" },
                          },
                          required: ["title", "description", "date", "time", "location", "type", "tags"],
                        },
                      },
                    },
                    required: ["events"],
                  },
                },
              },
            ],
            tool_choice: { type: "function", function: { name: "extract_events" } },
          }),
        });

        if (!aiResponse.ok) {
          console.error(`AI error for ${source.url}: ${aiResponse.status}`);
          continue;
        }

        const aiData = await aiResponse.json();
        const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
        if (!toolCall?.function?.arguments) continue;

        const extracted = JSON.parse(toolCall.function.arguments);
        const today = new Date().toISOString().split("T")[0];
        const events = (extracted.events || []).filter((ev: any) => ev.date >= today);

        // Check for duplicates and insert new events
        for (const ev of events) {
          const { data: existing } = await supabase
            .from("events")
            .select("id")
            .ilike("title", ev.title)
            .eq("date", ev.date)
            .limit(1);

          if (existing && existing.length > 0) {
            totalSkipped++;
            continue;
          }

          // Enrich missing geo info
          const hasCoords = typeof ev.latitude === "number" && typeof ev.longitude === "number";
          if (!hasCoords || !ev.continent || !ev.country) {
            const geo = await geocode(ev.location || "");
            if (geo) {
              ev.latitude = ev.latitude ?? geo.latitude;
              ev.longitude = ev.longitude ?? geo.longitude;
              ev.city = ev.city || geo.city;
              ev.country = ev.country || geo.country;
              ev.continent = ev.continent || geo.continent;
            }
            if (!isOnline(ev.location || "")) await new Promise((r) => setTimeout(r, 1100));
          }

          const { error: insertErr } = await supabase.from("events").insert({
            title: ev.title,
            description: ev.description,
            date: ev.date,
            time: ev.time || "09:00",
            location: ev.location || "Online",
            type: ev.type || "meetup",
            tags: ev.tags || [],
            url: ev.url || null,
            continent: ev.continent || null,
            country: ev.country || null,
            city: ev.city || null,
            latitude: typeof ev.latitude === "number" ? ev.latitude : null,
            longitude: typeof ev.longitude === "number" ? ev.longitude : null,
          });

          if (insertErr) {
            console.error("Insert error:", insertErr);
          } else {
            totalImported++;
          }
        }

        // Update last scraped
        await supabase
          .from("scrape_sources")
          .update({ last_scraped: new Date().toISOString() })
          .eq("id", source.id);

      } catch (sourceErr) {
        console.error(`Error processing source ${source.name}:`, sourceErr);
      }
    }

    console.log(`Auto-scrape complete: ${totalImported} imported, ${totalSkipped} skipped`);

    return new Response(
      JSON.stringify({ imported: totalImported, skipped: totalSkipped }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("auto-scrape error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
