import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Mail, MapPin, MessageSquare } from "lucide-react";

export default function Contact() {
  const [sending, setSending] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSending(true);
    setTimeout(() => {
      setSending(false);
      toast.success("Message sent! We'll get back to you soon.");
      (e.target as HTMLFormElement).reset();
    }, 1000);
  };

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container max-w-4xl">
        <h1 className="text-4xl font-mono font-bold text-foreground mb-2">
          <span className="text-primary">$</span> ping us
        </h1>
        <p className="text-muted-foreground mb-12">Got questions? We'd love to hear from you.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input placeholder="Your name" required className="bg-muted border-border font-mono" />
                <Input placeholder="Email address" type="email" required className="bg-muted border-border font-mono" />
              </div>
              <Input placeholder="Subject" required className="bg-muted border-border font-mono" />
              <Textarea placeholder="Your message..." required rows={6} className="bg-muted border-border font-mono resize-none" />
              <Button type="submit" disabled={sending} className="font-mono glow-primary">
                {sending ? "Sending..." : "Send Message"}
              </Button>
            </form>
          </div>

          <div className="space-y-6">
            {[
              { icon: Mail, label: "Email", value: "hello@devevents.io" },
              { icon: MapPin, label: "Location", value: "San Francisco, CA" },
              { icon: MessageSquare, label: "Response Time", value: "Within 24 hours" },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-start gap-3">
                <Icon className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-mono text-sm font-bold text-foreground">{label}</p>
                  <p className="text-sm text-muted-foreground">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
