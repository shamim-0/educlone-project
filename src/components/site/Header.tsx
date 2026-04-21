import { Link, NavLink, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import logo from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const links = [
  { to: "/", label: "Home" },
  { to: "/courses", label: "Courses" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
];

export const Header = () => {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-300",
        scrolled
          ? "bg-background/80 backdrop-blur-lg border-b border-border/60 shadow-card"
          : "bg-transparent"
      )}
    >
      <div className="container flex h-20 items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <img src={logo} alt="Educatum logo" width={40} height={40} className="h-10 w-10 transition-transform group-hover:rotate-[-6deg]" />
          <div className="leading-none">
            <div className="font-display text-xl font-bold text-primary">Educatum</div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">School</div>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === "/"}
              className={({ isActive }) =>
                cn(
                  "px-4 py-2 rounded-full text-sm font-medium transition-colors",
                  isActive
                    ? "text-primary bg-primary/5"
                    : "text-foreground/70 hover:text-primary hover:bg-primary/5"
                )
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          <Button asChild variant="ghost" className="rounded-full">
            <Link to="/contact">Sign in</Link>
          </Button>
          <Button asChild className="rounded-full bg-primary hover:bg-primary/90 shadow-card">
            <Link to="/courses">Enroll now</Link>
          </Button>
        </div>

        <button
          aria-label="Menu"
          className="md:hidden rounded-full p-2 hover:bg-muted"
          onClick={() => setOpen(!open)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-border/60 bg-background/95 backdrop-blur">
          <div className="container py-4 flex flex-col gap-1">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === "/"}
                className={({ isActive }) =>
                  cn(
                    "px-4 py-3 rounded-lg text-sm font-medium",
                    isActive ? "bg-primary/10 text-primary" : "hover:bg-muted"
                  )
                }
              >
                {l.label}
              </NavLink>
            ))}
            <Button asChild className="mt-2 rounded-full">
              <Link to="/courses">Enroll now</Link>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
};
