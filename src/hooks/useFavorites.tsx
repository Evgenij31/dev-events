import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { api } from "@/lib/api.ts";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

interface FavoritesContextValue {
  favoriteIds: Set<string>;
  isFavorite: (eventId: string) => boolean;
  toggleFavorite: (eventId: string) => Promise<void>;
  loading: boolean;
}

const FavoritesContext = createContext<FavoritesContextValue>({
  favoriteIds: new Set(),
  isFavorite: () => false,
  toggleFavorite: async () => {},
  loading: false,
});

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id;
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) {
      setFavoriteIds(new Set());
      return;
    }
    let cancelled = false;
    setLoading(true);
    api<{ eventIds: string[] }>("/favorites", { auth: "user" })
      .then(({ eventIds }) => !cancelled && setFavoriteIds(new Set(eventIds)))
      .catch(() => !cancelled && toast.error("Failed to load favorites."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const isFavorite = useCallback((id: string) => favoriteIds.has(id), [favoriteIds]);

  const toggleFavorite = useCallback(
    async (eventId: string) => {
      if (!userId) {
        toast.error("Please sign in to favorite events.");
        return;
      }
      const has = favoriteIds.has(eventId);
      const flip = (prev: Set<string>) => {
        const next = new Set(prev);
        if (has) next.delete(eventId);
        else next.add(eventId);
        return next;
      };
      setFavoriteIds(flip); // optimistic
      try {
        await api(`/favorites/${eventId}`, { method: has ? "DELETE" : "PUT", auth: "user" });
      } catch {
        setFavoriteIds((prev) => {
          // roll back
          const next = new Set(prev);
          if (has) next.add(eventId);
          else next.delete(eventId);
          return next;
        });
        toast.error(has ? "Failed to remove favorite." : "Failed to add favorite.");
      }
    },
    [userId, favoriteIds],
  );

  return (
    <FavoritesContext.Provider value={{ favoriteIds, isFavorite, toggleFavorite, loading }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export const useFavorites = () => useContext(FavoritesContext);
