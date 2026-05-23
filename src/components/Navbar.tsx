import { Link, useLocation, useNavigate } from "react-router-dom";
import { Terminal, Menu, X, LogOut, Heart, LogIn } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

const navLinks = [
  { to: "/", label: "Home" },
  { to: "/events", label: "Events" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
];

export default function Navbar() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    setOpen(false);
    navigate("/");
  };

  const authLinks = user ? [{ to: "/favorites", label: "Favorites", icon: Heart }] : [];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b bg-background/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-mono text-lg font-bold text-primary">
          <Terminal className="h-5 w-5" />
          <span>dev::events</span>
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`px-4 py-2 rounded-md font-mono text-sm transition-colors ${
                pathname === l.to
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {l.label}
            </Link>
          ))}
          {authLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`px-4 py-2 rounded-md font-mono text-sm transition-colors flex items-center gap-1.5 ${
                pathname === l.to
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <l.icon className="h-4 w-4" />
              {l.label}
            </Link>
          ))}
          {user ? (
            <button
              onClick={handleSignOut}
              className="px-4 py-2 rounded-md font-mono text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          ) : (
            <Link
              to="/auth"
              className="px-4 py-2 rounded-md font-mono text-sm text-primary hover:bg-primary/10 flex items-center gap-1.5"
            >
              <LogIn className="h-4 w-4" />
              Sign in
            </Link>
          )}
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden text-foreground" onClick={() => setOpen(!open)}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t bg-background px-4 pb-4">
          {navLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              onClick={() => setOpen(false)}
              className={`block px-4 py-3 font-mono text-sm ${
                pathname === l.to ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {l.label}
            </Link>
          ))}
          {user && (
            <Link
              to="/favorites"
              onClick={() => setOpen(false)}
              className="block px-4 py-3 font-mono text-sm text-muted-foreground"
            >
              Favorites
            </Link>
          )}
          {user ? (
            <button
              onClick={handleSignOut}
              className="block px-4 py-3 font-mono text-sm text-muted-foreground w-full text-left"
            >
              Sign out
            </button>
          ) : (
            <Link
              to="/auth"
              onClick={() => setOpen(false)}
              className="block px-4 py-3 font-mono text-sm text-primary"
            >
              Sign in
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
