import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client.ts";
import { setSupabaseAccessToken, supabaseData } from "@/integrations/supabase/dataClient.ts";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  username: string | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  username: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let currentUserId: string | null = null;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, sess) => {
      const nextUserId = sess?.user?.id ?? null;
      setSupabaseAccessToken(sess?.access_token ?? null);
      setSession(sess);
      // Only swap the user reference when the identity actually changes,
      // so token refreshes don't retrigger every dependent effect.
      if (nextUserId !== currentUserId) {
        currentUserId = nextUserId;
        setUser(sess?.user ?? null);
        if (sess?.user) {
          setTimeout(() => {
            supabaseData
              .from("profiles")
              .select("username")
              .eq("user_id", sess.user.id)
              .maybeSingle()
              .then(({ data }) => setUsername(data?.username ?? null));
          }, 0);
        } else {
          setUsername(null);
        }
      }
      if (event === "INITIAL_SESSION") setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    setSupabaseAccessToken(null);
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, username, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
