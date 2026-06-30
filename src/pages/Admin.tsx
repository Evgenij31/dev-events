import { useState, useEffect } from "react";
import {
  getEvents,
  addEvent,
  updateEvent,
  deleteEvent,
  checkDuplicate as _checkDuplicate,
  verifyAdmin,
  DevEvent,
} from "@/lib/events.ts";
import { scrapeEventsFromUrl, ScrapedEvent } from "@/lib/api/scrape-events.ts";
import { supabaseData } from "@/integrations/supabase/dataClient.ts";
import {
  getSources,
  addSource,
  deleteSource,
  updateSourceLastScraped,
  ScrapeSource,
} from "@/lib/sources.ts";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { toast } from "sonner";
import {
  Lock,
  Plus,
  Pencil,
  Trash2,
  X,
  Globe,
  Loader2,
  Save,
  RefreshCw,
  Ticket,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";

const emptyForm = {
  title: "",
  description: "",
  date: "",
  time: "",
  location: "",
  type: "meetup" as DevEvent["type"],
  tags: "",
  url: "",
};

export default function Admin() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [events, setEvents] = useState<DevEvent[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const [scrapeUrl, setScrapeUrl] = useState("");
  const [scraping, setScraping] = useState(false);
  const [scrapedEvents, setScrapedEvents] = useState<ScrapedEvent[]>([]);
  const [selectedScrapes, setSelectedScrapes] = useState<Set<number>>(
    new Set(),
  );
  const [sources, setSources] = useState<ScrapeSource[]>([]);
  const [sourceName, setSourceName] = useState("");
  const [backfilling, setBackfilling] = useState(false);

  const handleBackfillFees = async () => {
    setBackfilling(true);
    let totalUpdated = 0;
    let totalProcessed = 0;
    try {
      // Run in batches until done or error
      for (let i = 0; i < 20; i++) {
        const { data, error } = await supabaseData.functions.invoke(
          "backfill-event-fees",
          {
            body: { limit: 20 },
          },
        );
        if (error) {
          toast.error(error.message || "Backfill failed");
          break;
        }
        if (data?.error) {
          toast.error(data.error);
          break;
        }
        totalProcessed += data?.processed || 0;
        totalUpdated += data?.updated || 0;
        if (!data?.remaining) break;
      }
      toast.success(
        `Backfill complete: ${totalUpdated} updated of ${totalProcessed} processed.`,
      );
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Backfill failed");
    } finally {
      setBackfilling(false);
    }
  };

  const refresh = async () => {
    const [evts, srcs] = await Promise.all([getEvents(), getSources()]);
    setEvents(evts);
    setSources(srcs);
  };

  useEffect(() => {
    if (authed) refresh();
  }, [authed]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyAdmin(password)) {
      setAuthed(true);
      toast.success("Welcome, admin!");
    } else {
      toast.error("Wrong password.");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const tags = form.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    if (editing) {
      await updateEvent(editing, { ...form, tags, url: form.url || undefined });
      toast.success("Event updated.");
    } else {
      await addEvent({ ...form, tags, url: form.url || undefined });
      toast.success("Event created.");
    }
    setForm(emptyForm);
    setEditing(null);
    setShowForm(false);
    refresh();
  };

  const startEdit = (event: DevEvent) => {
    setForm({ ...event, tags: event.tags.join(", "), url: event.url || "" });
    setEditing(event.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    await deleteEvent(id);
    toast.success("Event deleted.");
    refresh();
  };

  const handleScrape = async (url: string, sourceId?: string) => {
    setScraping(true);
    setScrapedEvents([]);
    setSelectedScrapes(new Set());
    try {
      const events = await scrapeEventsFromUrl(url);
      if (events.length === 0) {
        toast.info("No events found on that page.");
      } else {
        setScrapedEvents(events);
        setSelectedScrapes(new Set(events.map((_, i) => i)));
        toast.success(`Found ${events.length} event(s).`);
      }
      if (sourceId) {
        await updateSourceLastScraped(sourceId);
        setSources(await getSources());
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Scrape failed.");
    } finally {
      setScraping(false);
    }
  };

  const handleImportSelected = async () => {
    const existingEvents = await getEvents();
    const today = new Date().toISOString().split("T")[0];
    let imported = 0;
    let skipped = 0;
    let pastSkipped = 0;

    for (const idx of selectedScrapes) {
      const ev = scrapedEvents[idx];
      if (ev.date < today) {
        pastSkipped++;
        continue;
      }
      const isDuplicate = existingEvents.some(
        (e) =>
          e.title.toLowerCase() === ev.title.toLowerCase() &&
          e.date === ev.date,
      );
      if (isDuplicate) {
        skipped++;
      } else {
        await addEvent(ev);
        imported++;
      }
    }

    const parts = [`Imported ${imported} event(s)`];
    if (skipped > 0) parts.push(`${skipped} duplicate(s)`);
    if (pastSkipped > 0) parts.push(`${pastSkipped} past event(s) skipped`);
    toast.success(parts.join(", ") + ".");
    setScrapedEvents([]);
    setSelectedScrapes(new Set());
    refresh();
  };

  const handleSaveSource = async () => {
    if (!sourceName.trim() || !scrapeUrl.trim()) {
      toast.error("Enter a name and URL.");
      return;
    }
    await addSource(sourceName.trim(), scrapeUrl.trim());
    setSourceName("");
    toast.success("Source saved.");
    setSources(await getSources());
  };

  const handleDeleteSource = async (id: string) => {
    await deleteSource(id);
    toast.success("Source deleted.");
    setSources(await getSources());
  };

  const toggleScrapeSelection = (idx: number) => {
    setSelectedScrapes((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  if (!authed) {
    return (
      <div className="min-h-screen pt-24 pb-16 flex items-center justify-center">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-sm space-y-4 text-center"
        >
          <Lock className="h-10 w-10 text-primary mx-auto" />
          <h1 className="text-2xl font-mono font-bold text-foreground">
            Admin Access
          </h1>
          <p className="text-sm text-muted-foreground">
            Enter the admin password to manage events.
          </p>
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-muted border-border font-mono text-center"
          />
          <Button type="submit" className="w-full font-mono glow-primary">
            Unlock
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-mono font-bold text-foreground">
            <span className="text-primary">$</span> admin panel
          </h1>
          <div className="flex gap-2">
            <Button
              onClick={handleBackfillFees}
              disabled={backfilling}
              variant="outline"
              className="font-mono"
            >
              {backfilling ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />{" "}
                  Backfilling...
                </>
              ) : (
                <>
                  <Ticket className="h-4 w-4 mr-2" /> Backfill Fees
                </>
              )}
            </Button>
            <Button
              onClick={() => {
                setShowForm(!showForm);
                setEditing(null);
                setForm(emptyForm);
              }}
              className="font-mono"
              variant={showForm ? "outline" : "default"}
            >
              {showForm ? (
                <>
                  <X className="h-4 w-4 mr-2" /> Cancel
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" /> New Event
                </>
              )}
            </Button>
          </div>
        </div>

        {showForm && (
          <form
            onSubmit={handleSave}
            className="rounded-lg border bg-card p-6 mb-8 space-y-4"
          >
            <h2 className="font-mono font-bold text-foreground">
              {editing ? "Edit Event" : "Create Event"}
            </h2>
            <Input
              placeholder="Title"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="bg-muted border-border font-mono"
            />
            <Textarea
              placeholder="Description"
              required
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              className="bg-muted border-border font-mono resize-none"
              rows={3}
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                type="date"
                required
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="bg-muted border-border font-mono"
              />
              <Input
                type="time"
                required
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
                className="bg-muted border-border font-mono"
              />
              <Input
                placeholder="Location"
                required
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="bg-muted border-border font-mono"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                value={form.type}
                onValueChange={(v) =>
                  setForm({ ...form, type: v as DevEvent["type"] })
                }
              >
                <SelectTrigger className="bg-muted border-border font-mono">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="conference">Conference</SelectItem>
                  <SelectItem value="meetup">Meetup</SelectItem>
                  <SelectItem value="workshop">Workshop</SelectItem>
                  <SelectItem value="hackathon">Hackathon</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="Tags (comma separated)"
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                className="bg-muted border-border font-mono"
              />
            </div>
            <Input
              placeholder="Event URL (optional, for registration link)"
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              className="bg-muted border-border font-mono"
            />
            <Button type="submit" className="font-mono glow-primary">
              {editing ? "Update" : "Create"} Event
            </Button>
          </form>
        )}

        {/* Scrape Events Section */}
        <div className="rounded-lg border bg-card p-6 mb-8 space-y-4">
          <h2 className="font-mono font-bold text-foreground flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" /> Scrape Events
          </h2>
          <p className="text-sm text-muted-foreground">
            Paste a URL to scrape developer events. Auto-scraping runs twice per
            week for saved sources.
          </p>
          <div className="flex gap-2">
            <Input
              placeholder="https://example.com/events"
              value={scrapeUrl}
              onChange={(e) => setScrapeUrl(e.target.value)}
              className="bg-muted border-border font-mono flex-1"
            />
            <Button
              onClick={() => handleScrape(scrapeUrl)}
              disabled={scraping || !scrapeUrl.trim()}
              className="font-mono"
            >
              {scraping ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Scraping...
                </>
              ) : (
                "Scrape"
              )}
            </Button>
          </div>
          <div className="flex gap-2 items-center">
            <Input
              placeholder="Source name (e.g. Dev.to Events)"
              value={sourceName}
              onChange={(e) => setSourceName(e.target.value)}
              className="bg-muted border-border font-mono flex-1 h-9 text-sm"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveSource}
              className="font-mono"
            >
              <Save className="h-3 w-3 mr-1" /> Save Source
            </Button>
          </div>

          {scrapedEvents.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-mono text-muted-foreground">
                  {scrapedEvents.length} event(s) found
                </p>
                <Button
                  size="sm"
                  onClick={handleImportSelected}
                  disabled={selectedScrapes.size === 0}
                  className="font-mono glow-primary"
                >
                  Import {selectedScrapes.size} Selected
                </Button>
              </div>
              {scrapedEvents.map((ev, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 rounded-lg border bg-muted/30 px-4 py-3"
                >
                  <Checkbox
                    checked={selectedScrapes.has(idx)}
                    onCheckedChange={() => toggleScrapeSelection(idx)}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-mono font-bold text-foreground text-sm truncate">
                      {ev.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {ev.date} · {ev.time} · {ev.location} · {ev.type}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {ev.description}
                    </p>
                    {ev.url && (
                      <p className="text-xs text-primary mt-1 truncate">
                        {ev.url}
                      </p>
                    )}
                    {ev.tags.length > 0 && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {ev.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-mono"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Saved Sources */}
        {sources.length > 0 && (
          <div className="rounded-lg border bg-card p-6 mb-8 space-y-3">
            <h2 className="font-mono font-bold text-foreground">
              Saved Sources (auto-scraped twice/week)
            </h2>
            {sources.map((source) => (
              <div
                key={source.id}
                className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3"
              >
                <div>
                  <p className="font-mono font-bold text-foreground text-sm">
                    {source.name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate max-w-md">
                    {source.url}
                  </p>
                  {source.lastScraped && (
                    <p className="text-[10px] text-muted-foreground">
                      Last scraped:{" "}
                      {new Date(source.lastScraped).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setScrapeUrl(source.url);
                      handleScrape(source.url, source.id);
                    }}
                    className="text-muted-foreground hover:text-primary"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteSource(source.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Event list */}
        <div className="space-y-3">
          {events.map((event) => (
            <div
              key={event.id}
              className="flex items-center justify-between rounded-lg border bg-card px-5 py-4 hover:border-primary/30 transition-colors"
            >
              <div>
                <p className="font-mono font-bold text-foreground">
                  {event.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {event.date} · {event.location} · {event.type}
                </p>
                {event.url && (
                  <p className="text-xs text-primary truncate max-w-sm">
                    {event.url}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => startEdit(event)}
                  className="text-muted-foreground hover:text-primary"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(event.id)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
