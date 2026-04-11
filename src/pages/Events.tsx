import { useState, useMemo, useEffect } from "react";
import { format } from "date-fns";
import { CalendarIcon, Archive } from "lucide-react";
import { getEvents, DevEvent } from "@/lib/events";
import EventCard from "@/components/EventCard";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const types = ["all", "conference", "meetup", "workshop", "hackathon"] as const;

export default function Events() {
  const [filter, setFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [events, setEvents] = useState<DevEvent[]>([]);
  const [showPast, setShowPast] = useState(false);

  useEffect(() => {
    getEvents().then(setEvents);
  }, []);

  const today = new Date().toISOString().split("T")[0];

  const { upcoming, past } = useMemo(() => {
    const upcoming: DevEvent[] = [];
    const past: DevEvent[] = [];
    for (const e of events) {
      if (e.date < today) past.push(e);
      else upcoming.push(e);
    }
    return { upcoming, past };
  }, [events, today]);

  const filtered = useMemo(() => {
    let result = filter === "all" ? upcoming : upcoming.filter((e) => e.type === filter);
    if (dateFrom) result = result.filter((e) => new Date(e.date) >= dateFrom);
    if (dateTo) result = result.filter((e) => new Date(e.date) <= dateTo);
    return result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [upcoming, filter, dateFrom, dateTo]);

  const filteredPast = useMemo(() => {
    let result = filter === "all" ? past : past.filter((e) => e.type === filter);
    return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [past, filter]);

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container">
        <h1 className="text-4xl font-mono font-bold text-foreground mb-2">
          <span className="text-primary">$</span> events --list
        </h1>
        <p className="text-muted-foreground mb-8">Browse all upcoming developer events.</p>

        {/* Filter tabs */}
        <div className="flex flex-wrap gap-2 mb-4">
          {types.map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`px-4 py-2 rounded-md font-mono text-sm transition-all ${
                filter === t
                  ? "bg-primary text-primary-foreground glow-primary"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Date range filter */}
        <div className="flex flex-wrap items-center gap-3 mb-8">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-[180px] justify-start text-left font-mono text-sm", !dateFrom && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateFrom ? format(dateFrom, "yyyy-MM-dd") : "From date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-[180px] justify-start text-left font-mono text-sm", !dateTo && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateTo ? format(dateTo, "yyyy-MM-dd") : "To date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
          {(dateFrom || dateTo) && (
            <Button variant="ghost" size="sm" className="font-mono text-xs text-muted-foreground" onClick={() => { setDateFrom(undefined); setDateTo(undefined); }}>
              Clear dates
            </Button>
          )}
        </div>

        {/* Upcoming events */}
        {filtered.length === 0 ? (
          <p className="text-muted-foreground font-mono text-center py-20">No upcoming events found.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        )}

        {/* Past events section */}
        {past.length > 0 && (
          <div className="mt-16">
            <button
              onClick={() => setShowPast(!showPast)}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors font-mono text-lg font-bold mb-6"
            >
              <Archive className="h-5 w-5" />
              Past Events ({filteredPast.length})
              <span className="text-xs font-normal ml-2">{showPast ? "▲ Hide" : "▼ Show"}</span>
            </button>
            {showPast && (
              filteredPast.length === 0 ? (
                <p className="text-muted-foreground font-mono text-center py-10">No past events match your filter.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-75">
                  {filteredPast.map((e) => (
                    <EventCard key={e.id} event={e} />
                  ))}
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}
