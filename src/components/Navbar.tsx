import { Link, useLocation, useNavigate } from "react-router-dom";
import { Terminal, Menu, X, LogOut, Heart, LogIn, ChevronDown, User as UserIcon } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navLinks = [
  { to: "/", label: "Home" },
  { to: "/events", label: "Events" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
];

export default function Navbar() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const { user, username, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    setOpen(false);
    navigate("/");
  };

  const displayName = username || user?.email?.split("@")[0] || "account";

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
          {user && (
            <Link
              to="/favorites"
              className={`px-4 py-2 rounded-md font-mono text-sm transition-colors flex items-center gap-1.5 ${
                pathname === "/favorites"
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Heart className="h-4 w-4" />
              Favorites
            </Link>
          )}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="px-4 py-2 rounded-md font-mono text-sm text-foreground hover:bg-primary/10 flex items-center gap-1.5 outline-none">
                <UserIcon className="h-4 w-4" />
                {displayName}
                <ChevronDown className="h-3 w-3 opacity-60" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="font-mono">
                <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                  {user.email}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
            <>
              <Link
                to="/favorites"
                onClick={() => setOpen(false)}
                className="block px-4 py-3 font-mono text-sm text-muted-foreground"
              >
                Favorites
              </Link>
              <div className="px-4 py-3 font-mono text-sm text-foreground border-t mt-2 flex items-center gap-1.5">
                <UserIcon className="h-4 w-4" />
                {displayName}
              </div>
              <button
                onClick={handleSignOut}
                className="block px-4 py-3 font-mono text-sm text-muted-foreground w-full text-left"
              >
                Sign out
              </button>
            </>
          )}
          {!user && (
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
