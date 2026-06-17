import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FeeResult {
  fee_is_free?: boolean;
  fee_amount?: number;
  fee_currency?: string;
}

async function extractFee(markdown: string, lovableKey: string): Promise<FeeResult | null> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        {
          role: "system",
          content:
            "You extract ticket/registration fee info from an event web page. If explicitly free, set fee_is_free=true. If a paid ticket price is shown, return the lowest price as fee_amount (number, no currency symbol) with fee_currency as an ISO 4217 code (USD, EUR, GBP, etc.). If no fee info is found, omit all fields.",
        },
        { role: "user", content: markdown.slice(0, 15000) },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "extract_fee",
            description: "Extract fee info",
            parameters: {
              type: "object",
              properties: {
                fee_is_free: { type: "boolean" },
                fee_amount: { type: "number" },
                fee_currency: { type: "string" },
              },
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "extract_fee" } },
    }),
  });

  if (!res.ok) {
    console.error("AI fee extract failed", res.status, await res.text());
    return null;
  }
  const data = await res.json();
  const tc = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!tc?.function?.arguments) return null;
  try {
    return JSON.parse(tc.function.arguments);
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!FIRECRAWL_API_KEY || !LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "Not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const limit = Math.min(Number(body.limit) || 20, 50);

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // Events that have a URL and no fee data set yet
    const { data: events, error } = await supabase
      .from("events")
      .select("id, url, title")
      .not("url", "is", null)
      .is("fee_amount", null)
      .is("fee_is_free", null)
      .limit(limit);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let processed = 0;
    let updated = 0;
    let failed = 0;

    for (const ev of events || []) {
      processed++;
      try {
        const scrape = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ url: ev.url, formats: ["markdown"], onlyMainContent: true }),
        });

        const sd = await scrape.json();
        if (!scrape.ok || !sd.success) {
          console.error(`firecrawl failed for ${ev.url}`);
          failed++;
          continue;
        }
        const md = sd.data?.markdown || sd.markdown || "";
        if (!md) { failed++; continue; }

        const fee = await extractFee(md, LOVABLE_API_KEY);
        if (!fee) { failed++; continue; }

        const update: Record<string, unknown> = {};
        if (typeof fee.fee_is_free === "boolean") update.fee_is_free = fee.fee_is_free;
        if (typeof fee.fee_amount === "number") update.fee_amount = fee.fee_amount;
        if (typeof fee.fee_currency === "string") update.fee_currency = fee.fee_currency.toUpperCase();

        if (Object.keys(update).length === 0) {
          // Mark as "checked - no data" via fee_is_free = null (already null); skip
          continue;
        }

        const { error: upErr } = await supabase.from("events").update(update).eq("id", ev.id);
        if (upErr) {
          console.error("update error", upErr);
          failed++;
        } else {
          updated++;
        }
      } catch (e) {
        console.error("backfill error for", ev.url, e);
        failed++;
      }
    }

    return new Response(
      JSON.stringify({ processed, updated, failed, remaining: (events?.length || 0) === limit }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
