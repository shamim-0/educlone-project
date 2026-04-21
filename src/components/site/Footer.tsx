import { Link } from "react-router-dom";
import { Facebook, Instagram, Youtube, Twitter, Mail } from "lucide-react";
import logo from "@/assets/logo.png";

export const Footer = () => {
  return (
    <footer className="mt-32 border-t border-border bg-gradient-to-b from-background to-secondary/40">
      <div className="container py-16 grid gap-12 md:grid-cols-4">
        <div className="md:col-span-2 max-w-sm">
          <Link to="/" className="flex items-center gap-3">
            <img src={logo} alt="Educatum logo" width={40} height={40} className="h-10 w-10" />
            <div>
              <div className="font-display text-xl font-bold text-primary">Educatum School</div>
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Quality Education for All</div>
            </div>
          </Link>
          <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
            We help students reach their potential through accessible, high-quality
            instruction — from board exams to university admission and beyond.
          </p>
          <div className="mt-6 flex items-center gap-3">
            {[Facebook, Instagram, Youtube, Twitter].map((Icon, i) => (
              <a
                key={i}
                href="#"
                aria-label="Social link"
                className="grid h-10 w-10 place-items-center rounded-full border border-border text-muted-foreground hover:text-primary hover:border-primary transition-colors"
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>

        <div>
          <h4 className="font-display text-base font-semibold mb-4">Explore</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/courses" className="hover:text-primary">All Courses</Link></li>
            <li><Link to="/about" className="hover:text-primary">About Us</Link></li>
            <li><Link to="/contact" className="hover:text-primary">Contact</Link></li>
            <li><Link to="/courses" className="hover:text-primary">Admission Programs</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-display text-base font-semibold mb-4">Get updates</h4>
          <p className="text-sm text-muted-foreground mb-3">Course launches and free study material in your inbox.</p>
          <form
            onSubmit={(e) => e.preventDefault()}
            className="flex items-center rounded-full border border-border bg-card overflow-hidden focus-within:ring-2 focus-within:ring-primary/30"
          >
            <Mail className="ml-3 h-4 w-4 text-muted-foreground" />
            <input
              type="email"
              placeholder="you@example.com"
              className="flex-1 bg-transparent px-3 py-2.5 text-sm outline-none"
            />
            <button className="m-1 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90">
              Join
            </button>
          </form>
        </div>
      </div>
      <div className="border-t border-border/60 py-6">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} Educatum School. All rights reserved.</p>
          <p>Made with care for learners everywhere.</p>
        </div>
      </div>
    </footer>
  );
};
