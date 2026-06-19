import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

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
    // Subscribe first; onAuthStateChange is the single source of truth for
    // session/user/username. Supabase v2 emits INITIAL_SESSION on subscribe,
    // so we don't need getSession() to setUser — that caused a race where a
    // late-resolving getSession() could clobber a just-signed-in user.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        setTimeout(() => {
          supabase
            .from("profiles")
            .select("username")
            .eq("user_id", sess.user.id)
            .maybeSingle()
            .then(({ data }) => setUsername(data?.username ?? null));
        }, 0);
      } else {
        setUsername(null);
      }
    });

    // Only used to flip the initial loading flag — do NOT setUser/setSession here.
    supabase.auth.getSession().then(() => {
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, username, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
