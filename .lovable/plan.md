

## Scrape Developer Events from Websites

This feature adds the ability to scrape event data from external websites using **Firecrawl** and an AI model to extract structured event data from the scraped content.

### How it works

1. **Admin pastes a URL** in the admin panel → Firecrawl scrapes the page → AI extracts structured event data → events are added to the app
2. **Saved sources** can be stored so the admin can re-scrape them with one click

### Prerequisites

- **Firecrawl connector** must be connected (for web scraping)
- **Lovable Cloud** must be enabled (for edge functions)

### Implementation Steps

**1. Connect Firecrawl and enable Lovable Cloud**
- Enable Lovable Cloud for edge function support
- Connect the Firecrawl connector for web scraping credentials

**2. Create edge function: `scrape-events`**
- Accepts a URL in the request body
- Calls Firecrawl to scrape the page as markdown
- Sends the markdown to the AI gateway to extract structured event data (title, description, date, time, location, type, tags) as JSON
- Returns an array of extracted events

**3. Create `src/lib/api/scrape-events.ts`**
- Frontend helper that calls the edge function via `supabase.functions.invoke('scrape-events', { body: { url } })`
- Returns parsed event data

**4. Create `src/lib/sources.ts`**
- Manages saved scrape sources in localStorage (URL, name, last scraped date)
- CRUD operations: `getSources`, `addSource`, `deleteSource`, `updateSource`

**5. Add scrape UI to the Admin panel (`Admin.tsx`)**
- New "Scrape Events" section with:
  - URL input + "Scrape" button for one-off scraping
  - Results preview showing extracted events with checkboxes to select which to import
  - "Import Selected" button that calls `addEvent` for each selected event
- New "Saved Sources" section:
  - List of saved URLs with "Re-scrape" and "Delete" buttons
  - "Save Source" option when scraping a new URL

### Technical Details

- The edge function uses Firecrawl's scrape endpoint with `formats: ['markdown']` to get clean text
- AI extraction uses a structured schema to parse events from the markdown
- Duplicate detection: before importing, check if an event with the same title+date already exists
- The scrape results are previewed before import so the admin has full control

