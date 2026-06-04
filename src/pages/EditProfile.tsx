import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Terminal } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function EditProfile() {
  const { user, username, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [newUsername, setNewUsername] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth", { replace: true });
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (username) setNewUsername(username);
  }, [username]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const trimmed = newUsername.trim();
    if (trimmed.length < 3) {
      toast.error("Username must be at least 3 characters.");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ username: trimmed })
      .eq("user_id", user.id);
    setSaving(false);
    if (error) {
      toast.error(error.message.includes("duplicate") ? "Username already taken." : error.message);
      return;
    }
    toast.success("Profile updated.");
    window.location.reload();
  };

  return (
    <div className="min-h-screen pt-24 pb-16 flex items-start justify-center">
      <div className="container max-w-md">
        <div className="rounded-lg border bg-card p-8">
          <div className="flex items-center gap-2 mb-6 font-mono text-primary">
            <Terminal className="h-5 w-5" />
            <span className="font-bold">$ profile --edit</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="font-mono text-xs text-muted-foreground">EMAIL</Label>
              <Input value={user?.email ?? ""} disabled className="font-mono mt-1" />
            </div>
            <div>
              <Label htmlFor="username" className="font-mono text-xs text-muted-foreground">USERNAME</Label>
              <Input
                id="username"
                type="text"
                required
                minLength={3}
                maxLength={32}
                pattern="[a-zA-Z0-9_\-]+"
                title="Letters, numbers, underscore and hyphen only"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                className="font-mono mt-1"
              />
            </div>
            <Button type="submit" disabled={saving} className="w-full font-mono">
              {saving ? "..." : "Save changes"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
