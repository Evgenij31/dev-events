import { Terminal } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t bg-card/50 py-8 mt-auto">
      <div className="container flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2 font-mono text-foreground">
          <Terminal className="h-4 w-4 text-primary" />
          <span>dev::events</span>
        </div>
        <p>© {new Date().getFullYear()} dev::events. Built for developers.</p>
      </div>
    </footer>
  );
}
