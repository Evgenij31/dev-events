import { useState, useEffect } from "react";
import { getEvents, addEvent, updateEvent, deleteEvent, verifyAdmin, DevEvent } from "@/lib/events";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Lock, Plus, Pencil, Trash2, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const emptyForm = { title: "", description: "", date: "", time: "", location: "", type: "meetup" as DevEvent["type"], tags: "" };

export default function Admin() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [events, setEvents] = useState<DevEvent[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const refresh = () => setEvents(getEvents());

  useEffect(() => {
    if (authed) refresh();
  }, [authed]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyAdmin(password)) {
      setAuthed(true);
      toast.success("Welcome, admin!");
    } else {
      toast.error("Wrong password.");
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const tags = form.tags.split(",").map((t) => t.trim()).filter(Boolean);
    if (editing) {
      updateEvent(editing, { ...form, tags });
      toast.success("Event updated.");
    } else {
      addEvent({ ...form, tags });
      toast.success("Event created.");
    }
    setForm(emptyForm);
    setEditing(null);
    setShowForm(false);
    refresh();
  };

  const startEdit = (event: DevEvent) => {
    setForm({ ...event, tags: event.tags.join(", ") });
    setEditing(event.id);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    deleteEvent(id);
    toast.success("Event deleted.");
    refresh();
  };

  if (!authed) {
    return (
      <div className="min-h-screen pt-24 pb-16 flex items-center justify-center">
        <form onSubmit={handleLogin} className="w-full max-w-sm space-y-4 text-center">
          <Lock className="h-10 w-10 text-primary mx-auto" />
          <h1 className="text-2xl font-mono font-bold text-foreground">Admin Access</h1>
          <p className="text-sm text-muted-foreground">Enter the admin password to manage events.</p>
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-muted border-border font-mono text-center"
          />
          <Button type="submit" className="w-full font-mono glow-primary">
            Unlock
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-mono font-bold text-foreground">
            <span className="text-primary">$</span> admin panel
          </h1>
          <Button onClick={() => { setShowForm(!showForm); setEditing(null); setForm(emptyForm); }} className="font-mono" variant={showForm ? "outline" : "default"}>
            {showForm ? <><X className="h-4 w-4 mr-2" /> Cancel</> : <><Plus className="h-4 w-4 mr-2" /> New Event</>}
          </Button>
        </div>

        {showForm && (
          <form onSubmit={handleSave} className="rounded-lg border bg-card p-6 mb-8 space-y-4">
            <h2 className="font-mono font-bold text-foreground">{editing ? "Edit Event" : "Create Event"}</h2>
            <Input placeholder="Title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="bg-muted border-border font-mono" />
            <Textarea placeholder="Description" required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="bg-muted border-border font-mono resize-none" rows={3} />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="bg-muted border-border font-mono" />
              <Input type="time" required value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} className="bg-muted border-border font-mono" />
              <Input placeholder="Location" required value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="bg-muted border-border font-mono" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as DevEvent["type"] })}>
                <SelectTrigger className="bg-muted border-border font-mono">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="conference">Conference</SelectItem>
                  <SelectItem value="meetup">Meetup</SelectItem>
                  <SelectItem value="workshop">Workshop</SelectItem>
                  <SelectItem value="hackathon">Hackathon</SelectItem>
                </SelectContent>
              </Select>
              <Input placeholder="Tags (comma separated)" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} className="bg-muted border-border font-mono" />
            </div>
            <Button type="submit" className="font-mono glow-primary">{editing ? "Update" : "Create"} Event</Button>
          </form>
        )}

        {/* Event list */}
        <div className="space-y-3">
          {events.map((event) => (
            <div key={event.id} className="flex items-center justify-between rounded-lg border bg-card px-5 py-4 hover:border-primary/30 transition-colors">
              <div>
                <p className="font-mono font-bold text-foreground">{event.title}</p>
                <p className="text-xs text-muted-foreground">{event.date} · {event.location} · {event.type}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" onClick={() => startEdit(event)} className="text-muted-foreground hover:text-primary">
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(event.id)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
