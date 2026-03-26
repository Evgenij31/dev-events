export interface DevEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  type: "conference" | "meetup" | "workshop" | "hackathon";
  tags: string[];
}

const STORAGE_KEY = "devevents_data";
const ADMIN_PASSWORD = "admin123";

const defaultEvents: DevEvent[] = [
  {
    id: "1",
    title: "React Summit 2026",
    description: "The biggest React conference with talks from core team members and industry leaders. Deep dives into Server Components, concurrent features, and the future of React.",
    date: "2026-05-15",
    time: "09:00",
    location: "Amsterdam, Netherlands",
    type: "conference",
    tags: ["React", "Frontend", "JavaScript"],
  },
  {
    id: "2",
    title: "Rust Hack Night",
    description: "An evening of collaborative coding in Rust. Bring your projects or join a team. All skill levels welcome.",
    date: "2026-04-20",
    time: "18:00",
    location: "Berlin, Germany",
    type: "hackathon",
    tags: ["Rust", "Systems", "Open Source"],
  },
  {
    id: "3",
    title: "DevOps Workshop: K8s at Scale",
    description: "Hands-on workshop covering Kubernetes deployment strategies, autoscaling, and observability for production workloads.",
    date: "2026-06-10",
    time: "10:00",
    location: "Online",
    type: "workshop",
    tags: ["DevOps", "Kubernetes", "Cloud"],
  },
  {
    id: "4",
    title: "Local JS Meetup #42",
    description: "Monthly JavaScript meetup featuring lightning talks, networking, and pizza. This month: TypeScript 6.0 deep dive.",
    date: "2026-04-05",
    time: "19:00",
    location: "San Francisco, CA",
    type: "meetup",
    tags: ["JavaScript", "TypeScript", "Community"],
  },
];

export function getEvents(): DevEvent[] {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) return JSON.parse(stored);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultEvents));
  return defaultEvents;
}

export function saveEvents(events: DevEvent[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

export function addEvent(event: Omit<DevEvent, "id">): DevEvent {
  const events = getEvents();
  const newEvent = { ...event, id: Date.now().toString() };
  events.push(newEvent);
  saveEvents(events);
  return newEvent;
}

export function updateEvent(id: string, data: Partial<DevEvent>) {
  const events = getEvents();
  const idx = events.findIndex((e) => e.id === id);
  if (idx !== -1) {
    events[idx] = { ...events[idx], ...data };
    saveEvents(events);
  }
}

export function deleteEvent(id: string) {
  const events = getEvents().filter((e) => e.id !== id);
  saveEvents(events);
}

export function verifyAdmin(password: string): boolean {
  return password === ADMIN_PASSWORD;
}
