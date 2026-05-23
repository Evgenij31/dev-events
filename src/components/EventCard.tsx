import { DevEvent } from "@/lib/events";
import { Calendar, Clock, MapPin, ExternalLink, Heart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useFavorites } from "@/hooks/useFavorites";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

const typeColors: Record<string, string> = {
  conference: "bg-primary/20 text-primary border-primary/30",
  meetup: "bg-secondary/20 text-secondary border-secondary/30",
  workshop: "bg-accent/20 text-accent border-accent/30",
  hackathon: "bg-destructive/20 text-destructive border-destructive/30",
};

export default function EventCard({ event }: { event: DevEvent }) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const { user } = useAuth();
  const navigate = useNavigate();
  const favorited = isFavorite(event.id);

  const onHeart = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) {
      navigate("/auth");
      return;
    }
    toggleFavorite(event.id);
  };

  return (
    <div className="group relative rounded-lg border bg-card p-6 transition-all hover:border-primary/30 hover:glow-primary flex flex-col">
      <button
        onClick={onHeart}
        aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
        className="absolute top-4 right-4 p-1.5 rounded-md hover:bg-muted transition-colors"
      >
        <Heart
          className={`h-5 w-5 transition-colors ${
            favorited ? "fill-destructive text-destructive" : "text-muted-foreground hover:text-destructive"
          }`}
        />
      </button>

      <div className="flex items-start justify-between gap-4 mb-3 pr-10">
        <span className={`inline-block rounded-full border px-3 py-0.5 text-xs font-mono uppercase tracking-wider ${typeColors[event.type]}`}>
          {event.type}
        </span>
      </div>

      <h3 className="text-xl font-mono font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
        {event.title}
      </h3>

      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{event.description}</p>

      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground mb-4">
        <span className="flex items-center gap-1">
          <Calendar className="h-3 w-3 text-primary" />
          {new Date(event.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3 text-primary" />
          {event.time}
        </span>
        <span className="flex items-center gap-1">
          <MapPin className="h-3 w-3 text-primary" />
          {event.location}
        </span>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {event.tags.map((tag) => (
          <Badge key={tag} variant="secondary" className="font-mono text-xs bg-muted text-muted-foreground border-border">
            {tag}
          </Badge>
        ))}
      </div>

      {event.url && (
        <div className="mt-auto pt-2">
          <a
            href={event.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-mono text-primary hover:text-primary/80 transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Register / Join
          </a>
        </div>
      )}
    </div>
  );
}
