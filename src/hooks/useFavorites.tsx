import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
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
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      setFavoriteIds(new Set());
      return;
    }
    setLoading(true);
    supabase
      .from("favorites")
      .select("event_id")
      .eq("user_id", user.id)
      .then(({ data }) => {
        setFavoriteIds(new Set((data || []).map((r) => r.event_id)));
        setLoading(false);
      });
  }, [user]);

  const isFavorite = useCallback((id: string) => favoriteIds.has(id), [favoriteIds]);

  const toggleFavorite = useCallback(async (eventId: string) => {
    if (!user) {
      toast.error("Please sign in to favorite events.");
      return;
    }
    const has = favoriteIds.has(eventId);
    // optimistic
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (has) next.delete(eventId);
      else next.add(eventId);
      return next;
    });
    if (has) {
      const { error } = await supabase
        .from("favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("event_id", eventId);
      if (error) toast.error("Failed to remove favorite.");
    } else {
      const { error } = await supabase
        .from("favorites")
        .insert({ user_id: user.id, event_id: eventId });
      if (error) toast.error("Failed to add favorite.");
    }
  }, [user, favoriteIds]);

  return (
    <FavoritesContext.Provider value={{ favoriteIds, isFavorite, toggleFavorite, loading }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export const useFavorites = () => useContext(FavoritesContext);
