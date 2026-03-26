import { useState, useMemo } from "react";
import { getEvents, DevEvent } from "@/lib/events";
import EventCard from "@/components/EventCard";

const types = ["all", "conference", "meetup", "workshop", "hackathon"] as const;

export default function Events() {
  const [filter, setFilter] = useState<string>("all");
  const events = useMemo(() => getEvents(), []);

  const filtered = filter === "all" ? events : events.filter((e) => e.type === filter);

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container">
        <h1 className="text-4xl font-mono font-bold text-foreground mb-2">
          <span className="text-primary">$</span> events --list
        </h1>
        <p className="text-muted-foreground mb-8">Browse all upcoming developer events.</p>

        {/* Filter tabs */}
        <div className="flex flex-wrap gap-2 mb-8">
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

        {filtered.length === 0 ? (
          <p className="text-muted-foreground font-mono text-center py-20">No events found.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
