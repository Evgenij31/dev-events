import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useFavorites } from "@/hooks/useFavorites";
import { DevEvent } from "@/lib/events";
import EventCard from "@/components/EventCard";

function mapRow(row: any): DevEvent {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    date: row.date,
    time: row.time,
    location: row.location,
    type: row.type,
    tags: row.tags || [],
    url: row.url || undefined,
    continent: row.continent || undefined,
    country: row.country || undefined,
    city: row.city || undefined,
    latitude: row.latitude ?? undefined,
    longitude: row.longitude ?? undefined,
  };
}

export default function Favorites() {
  const { user, loading: authLoading } = useAuth();
  const { favoriteIds } = useFavorites();
  const [events, setEvents] = useState<DevEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const ids = Array.from(favoriteIds);
    if (ids.length === 0) {
      setEvents([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase
      .from("events")
      .select("*")
      .in("id", ids)
      .order("date", { ascending: true })
      .then(({ data }) => {
        setEvents((data || []).map(mapRow));
        setLoading(false);
      });
  }, [user, favoriteIds]);

  if (authLoading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container">
        <h1 className="text-4xl font-mono font-bold text-foreground mb-2">
          <span className="text-primary">$</span> favorites --list
        </h1>
        <p className="text-muted-foreground mb-8">Events you've saved.</p>

        {loading ? (
          <p className="text-muted-foreground font-mono text-center py-20">Loading...</p>
        ) : events.length === 0 ? (
          <div className="text-center py-20">
            <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground font-mono">
              No favorites yet. Tap the heart on an event to save it.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
