import { Code2, Globe, Heart, Zap } from "lucide-react";

const values = [
  { icon: Code2, title: "Open Source First", desc: "We believe in open knowledge sharing and community-driven growth." },
  { icon: Globe, title: "Global Reach", desc: "Events spanning 35+ cities, connecting devs across time zones." },
  { icon: Heart, title: "Inclusive Community", desc: "Everyone is welcome — from first-time coders to seasoned architects." },
  { icon: Zap, title: "Ship & Learn", desc: "Hands-on workshops and hackathons focused on building real things." },
];

export default function About() {
  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container max-w-4xl">
        <h1 className="text-4xl font-mono font-bold text-foreground mb-2">
          <span className="text-primary">$</span> cat about.md
        </h1>
        <p className="text-muted-foreground mb-12">The story behind dev::events.</p>

        <div className="prose-sm space-y-6 text-card-foreground mb-16">
          <p className="text-lg leading-relaxed">
            <span className="text-primary font-mono">dev::events</span> was born from a simple idea: developers
            thrive when they connect. We curate the best conferences, meetups, workshops, and hackathons
            so you can focus on what matters — writing great code and meeting great people.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Whether you're looking for your next conference talk, a weekend hackathon, or a chill local
            meetup, we've got you covered. Our mission is to make developer events discoverable,
            accessible, and unforgettable.
          </p>
        </div>

        <h2 className="text-2xl font-mono font-bold text-foreground mb-8">
          <span className="text-primary">#</span> values
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {values.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-lg border bg-card p-6 hover:border-primary/30 transition-colors">
              <Icon className="h-6 w-6 text-primary mb-3" />
              <h3 className="font-mono font-bold text-foreground mb-1">{title}</h3>
              <p className="text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
