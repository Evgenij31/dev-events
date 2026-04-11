import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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
                content: "Extract all developer events from the web content. For each event determine the type (conference, meetup, workshop, or hackathon), relevant tags, and the registration URL if available.",
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

          const { error: insertErr } = await supabase.from("events").insert({
            title: ev.title,
            description: ev.description,
            date: ev.date,
            time: ev.time || "09:00",
            location: ev.location || "Online",
            type: ev.type || "meetup",
            tags: ev.tags || [],
            url: ev.url || null,
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
