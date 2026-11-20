import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { api, ApiError, tokens } from "@/lib/api.ts";

export interface User {
  id: string;
  email: string;
  username: string;
}

interface AuthContextValue {
  user: User | null;
  username: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateUsername: (username: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  username: null,
  loading: true,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  updateUsername: async () => {},
});

type AuthResponse = { token: string; user: User };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore the session from a stored token.
  useEffect(() => {
    if (!tokens.user()) {
      setLoading(false);
      return;
    }
    api<{ user: User }>("/me", { auth: "user" })
      .then(({ user }) => setUser(user))
      .catch((e) => {
        // Only drop the token if the server rejected it, not on network errors.
        if (e instanceof ApiError && e.status === 401) tokens.setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const applySession = ({ token, user }: AuthResponse) => {
    tokens.setUser(token);
    setUser(user);
  };

  const signIn = useCallback(async (email: string, password: string) => {
    applySession(await api<AuthResponse>("/auth/signin", { body: { email, password } }));
  }, []);

  const signUp = useCallback(async (email: string, password: string, username: string) => {
    applySession(await api<AuthResponse>("/auth/signup", { body: { email, password, username } }));
  }, []);

  const signOut = useCallback(async () => {
    tokens.setUser(null);
    setUser(null);
  }, []);

  const updateUsername = useCallback(async (username: string) => {
    const res = await api<{ user: User }>("/me", { method: "PATCH", body: { username }, auth: "user" });
    setUser(res.user);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, username: user?.username ?? null, loading, signIn, signUp, signOut, updateUsername }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
