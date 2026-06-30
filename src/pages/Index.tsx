import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Code, Users, Zap } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { getEvents, DevEvent } from "@/lib/events.ts";
import EventCard from "@/components/EventCard.tsx";

export default function Index() {
  const [events, setEvents] = useState<DevEvent[]>([]);

  useEffect(() => {
    getEvents().then((evts) => setEvents(evts.slice(0, 3)));
  }, []);

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden py-32 md:py-44">
        <div className="absolute inset-0 bg-grid opacity-30" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-primary/5 blur-[120px]" />
        <div className="container relative text-center">
          <p className="font-mono text-sm text-primary mb-4 tracking-widest uppercase animate-pulse-glow">
            {">"} connecting developers worldwide
          </p>
          <h1 className="text-5xl md:text-7xl font-mono font-extrabold text-foreground mb-6 leading-tight">
            Where <span className="text-primary text-glow">code</span> meets
            <br />
            community
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
            Discover conferences, hackathons, workshops, and meetups built for developers who ship.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button asChild size="lg" className="font-mono glow-primary-strong">
              <Link to="/events">
                Browse Events <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="font-mono border-primary/30 text-primary hover:bg-primary/10">
              <Link to="/about">Learn More</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y bg-card/30 py-16">
        <div className="container grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          {[
            { icon: Code, label: "Events Hosted", value: "120+" },
            { icon: Users, label: "Developers Reached", value: "10K+" },
            { icon: Zap, label: "Cities Worldwide", value: "35+" },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="space-y-2">
              <Icon className="h-6 w-6 text-primary mx-auto" />
              <p className="text-3xl font-mono font-bold text-foreground">{value}</p>
              <p className="text-sm text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Upcoming */}
      <section className="py-20">
        <div className="container">
          <div className="flex items-center justify-between mb-10">
            <h2 className="text-3xl font-mono font-bold text-foreground">
              <span className="text-primary">$</span> upcoming
            </h2>
            <Link to="/events" className="text-sm font-mono text-primary hover:underline flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
