import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Terminal } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function Auth() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) navigate("/favorites", { replace: true });
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        if (!username.trim() || username.trim().length < 3) {
          throw new Error("Username must be at least 3 characters.");
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/favorites`,
            data: { username: username.trim() },
          },
        });
        if (error) throw error;
        toast.success("Account created. You're signed in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back.");
      }
    } catch (err: any) {
      toast.error(err.message || "Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/favorites",
    });
    if (result.error) {
      toast.error("Google sign-in failed.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-16 flex items-start justify-center">
      <div className="container max-w-md">
        <div className="rounded-lg border bg-card p-8">
          <div className="flex items-center gap-2 mb-6 font-mono text-primary">
            <Terminal className="h-5 w-5" />
            <span className="font-bold">$ auth --{mode}</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email" className="font-mono text-xs text-muted-foreground">EMAIL</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="font-mono mt-1"
              />
            </div>
            <div>
              <Label htmlFor="password" className="font-mono text-xs text-muted-foreground">PASSWORD</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="font-mono mt-1"
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full font-mono">
              {loading ? "..." : mode === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>

          <div className="my-4 flex items-center gap-2 text-xs font-mono text-muted-foreground">
            <div className="flex-1 h-px bg-border" />
            OR
            <div className="flex-1 h-px bg-border" />
          </div>

          <Button
            variant="outline"
            onClick={handleGoogle}
            disabled={loading}
            className="w-full font-mono"
          >
            Continue with Google
          </Button>

          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="mt-6 text-sm text-muted-foreground hover:text-primary font-mono w-full text-center"
          >
            {mode === "signin"
              ? "No account? Create one →"
              : "Already have an account? Sign in →"}
          </button>

          <Link to="/" className="block mt-4 text-xs text-muted-foreground hover:text-foreground font-mono text-center">
            ← back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
