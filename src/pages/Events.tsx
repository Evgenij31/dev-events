import { useState, useMemo, useEffect } from "react";
import { format } from "date-fns";
import { CalendarIcon, Archive, MapPin, Loader2, X } from "lucide-react";
import { getEvents, distanceKm, DevEvent } from "@/lib/events";
import EventCard from "@/components/EventCard";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const types = ["all", "conference", "meetup", "workshop", "hackathon"] as const;
const NEAR_RADIUS_KM = 50;

export default function Events() {
  const [filter, setFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [events, setEvents] = useState<DevEvent[]>([]);
  const [showPast, setShowPast] = useState(false);

  const [continent, setContinent] = useState<string>("all");
  const [country, setCountry] = useState<string>("all");
  const [city, setCity] = useState<string>("");
  const [nearMe, setNearMe] = useState<{ lat: number; lon: number } | null>(null);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    getEvents().then(setEvents);
  }, []);

  const today = new Date().toISOString().split("T")[0];

  const continents = useMemo(() => {
    const set = new Set<string>();
    events.forEach((e) => e.continent && set.add(e.continent));
    return Array.from(set).sort();
  }, [events]);

  const countries = useMemo(() => {
    const set = new Set<string>();
    events
      .filter((e) => continent === "all" || e.continent === continent)
      .forEach((e) => e.country && set.add(e.country));
    return Array.from(set).sort();
  }, [events, continent]);

  const applyRegion = (list: DevEvent[]) => {
    let result = list;
    if (continent !== "all") result = result.filter((e) => e.continent === continent);
    if (country !== "all") result = result.filter((e) => e.country === country);
    if (city.trim()) {
      const q = city.trim().toLowerCase();
      result = result.filter(
        (e) =>
          e.city?.toLowerCase().includes(q) || e.location?.toLowerCase().includes(q)
      );
    }
    if (nearMe) {
      result = result.filter((e) => {
        if (typeof e.latitude !== "number" || typeof e.longitude !== "number") return false;
        return distanceKm(nearMe.lat, nearMe.lon, e.latitude, e.longitude) <= NEAR_RADIUS_KM;
      });
    }
    return result;
  };

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
    result = applyRegion(result);
    return result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [upcoming, filter, dateFrom, dateTo, continent, country, city, nearMe]);

  const filteredPast = useMemo(() => {
    let result = filter === "all" ? past : past.filter((e) => e.type === filter);
    result = applyRegion(result);
    return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [past, filter, continent, country, city, nearMe]);

  const handleNearMe = () => {
    if (nearMe) {
      setNearMe(null);
      return;
    }
    if (!("geolocation" in navigator)) {
      toast.error("Geolocation is not supported by your browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setNearMe({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        toast.success(`Showing events within ${NEAR_RADIUS_KM} km of your location.`);
        setLocating(false);
      },
      (err) => {
        toast.error(err.message || "Could not get your location.");
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 10000 }
    );
  };

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container">
        <h1 className="text-4xl font-mono font-bold text-foreground mb-2">
          <span className="text-primary">$</span> events --list
        </h1>
        <p className="text-muted-foreground mb-8">Browse all upcoming developer events.</p>

        {/* Type tabs */}
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

        {/* Region filters */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <Select value={continent} onValueChange={(v) => { setContinent(v); setCountry("all"); }}>
            <SelectTrigger className="w-[170px] font-mono text-sm bg-background">
              <SelectValue placeholder="Continent" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All continents</SelectItem>
              {continents.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={country} onValueChange={setCountry}>
            <SelectTrigger className="w-[170px] font-mono text-sm bg-background">
              <SelectValue placeholder="Country" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All countries</SelectItem>
              {countries.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            placeholder="City"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-[170px] font-mono text-sm"
          />

          <Button
            variant={nearMe ? "default" : "outline"}
            onClick={handleNearMe}
            disabled={locating}
            className="font-mono text-sm"
          >
            {locating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <MapPin className="h-4 w-4 mr-2" />
            )}
            {nearMe ? `Near you (${NEAR_RADIUS_KM}km) ✓` : "Near you"}
            {nearMe && <X className="h-3 w-3 ml-2" />}
          </Button>

          {(continent !== "all" || country !== "all" || city) && (
            <Button
              variant="ghost"
              size="sm"
              className="font-mono text-xs text-muted-foreground"
              onClick={() => { setContinent("all"); setCountry("all"); setCity(""); }}
            >
              Clear region
            </Button>
          )}
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
