import { Link } from "react-router-dom";
import { ArrowRight, Award, GraduationCap, Video, ClipboardCheck, MessageCircle, BookOpen, HeartHandshake, Sparkles, PlayCircle, CheckCircle2, Quote } from "lucide-react";
import { Layout } from "@/components/site/Layout";
import { Button } from "@/components/ui/button";
import { CourseCard } from "@/components/site/CourseCard";
import { COURSES, FEATURES, STATS, TESTIMONIALS } from "@/data/site";
import hero from "@/assets/hero-student.jpg";

const ICONS = { GraduationCap, Video, ClipboardCheck, MessageCircle, BookOpen, HeartHandshake } as const;

const Index = () => {
  return (
    <Layout>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-soft" />
        <div className="absolute -top-24 -right-24 h-[500px] w-[500px] rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-24 h-[420px] w-[420px] rounded-full bg-accent/15 blur-3xl" />

        <div className="container relative grid gap-12 py-16 md:py-24 lg:grid-cols-2 lg:items-center">
          <div className="animate-fade-in">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground shadow-card">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              New session enrollments are open
            </span>
            <h1 className="mt-6 font-display text-5xl font-bold leading-[1.05] tracking-tight text-foreground md:text-6xl lg:text-7xl text-balance">
              Quality education,{" "}
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-primary via-primary-glow to-accent bg-clip-text text-transparent">
                  for every learner.
                </span>
                <svg className="absolute -bottom-2 left-0 w-full" height="10" viewBox="0 0 300 10" fill="none">
                  <path d="M2 8 Q 150 -2 298 6" stroke="hsl(var(--accent))" strokeWidth="3" strokeLinecap="round" />
                </svg>
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted-foreground leading-relaxed">
              Educatum School helps SSC, HSC and university aspirants reach their goals
              through expert-led classes, live doubt solving and a community that cares.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="rounded-full bg-primary hover:bg-primary/90 shadow-elegant px-7 h-12 text-base">
                <Link to="/courses">
                  Explore courses <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="ghost" className="rounded-full h-12 px-5 text-base hover:bg-primary/5">
                <Link to="/about">
                  <PlayCircle className="mr-2 h-5 w-5 text-primary" /> Watch our story
                </Link>
              </Button>
            </div>

            <div className="mt-10 flex items-center gap-6">
              <div className="flex -space-x-2">
                {[1,2,3,4].map((i) => (
                  <div key={i} className="h-10 w-10 rounded-full border-2 border-background bg-gradient-to-br from-primary to-accent" />
                ))}
              </div>
              <div className="text-sm">
                <div className="font-semibold text-foreground">25,000+ learners</div>
                <div className="text-muted-foreground">trust Educatum every day</div>
              </div>
            </div>
          </div>

          <div className="relative animate-fade-in">
            <div className="relative rounded-[2rem] overflow-hidden shadow-elegant">
              <img
                src={hero}
                alt="Educatum student smiling on campus"
                width={1280}
                height={1280}
                className="h-full w-full object-cover aspect-[5/6]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/40 via-transparent to-transparent" />
            </div>

            {/* Floating cards */}
            <div className="absolute -left-4 top-10 hidden md:flex animate-float items-center gap-3 rounded-2xl bg-card/95 backdrop-blur p-4 shadow-elegant border border-border">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-accent/15 text-accent">
                <Award className="h-5 w-5" />
              </div>
              <div className="text-sm">
                <div className="font-semibold">98% pass rate</div>
                <div className="text-xs text-muted-foreground">Last admission cycle</div>
              </div>
            </div>
            <div className="absolute -right-4 bottom-10 hidden md:flex items-center gap-3 rounded-2xl bg-card/95 backdrop-blur p-4 shadow-elegant border border-border">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div className="text-sm">
                <div className="font-semibold">350+ courses</div>
                <div className="text-xs text-muted-foreground">Across 12 subjects</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="container -mt-4 md:mt-0 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 rounded-3xl border border-border bg-card p-8 shadow-card">
          {STATS.map((s) => (
            <div key={s.label} className="px-2 py-4 text-center md:border-r md:border-border last:border-0">
              <div className="font-display text-3xl md:text-4xl font-bold text-primary">{s.value}</div>
              <div className="mt-1 text-xs md:text-sm text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section className="container py-24">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">Why Educatum</p>
          <h2 className="mt-3 font-display text-4xl md:text-5xl font-bold text-balance">
            Built around how students actually learn.
          </h2>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => {
            const Icon = ICONS[f.icon as keyof typeof ICONS];
            return (
              <div
                key={f.title}
                className="group relative rounded-2xl border border-border bg-gradient-card p-7 transition-all hover:-translate-y-1 hover:shadow-elegant"
              >
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-5 font-display text-xl font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* COURSES PREVIEW */}
      <section className="bg-gradient-soft py-24">
        <div className="container">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-xl">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">Featured</p>
              <h2 className="mt-3 font-display text-4xl md:text-5xl font-bold text-balance">
                Programs students love.
              </h2>
            </div>
            <Button asChild variant="ghost" className="rounded-full">
              <Link to="/courses">View all <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {COURSES.slice(0, 6).map((c) => (
              <CourseCard key={c.slug} course={c} />
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="container py-24">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">Stories</p>
          <h2 className="mt-3 font-display text-4xl md:text-5xl font-bold text-balance">
            Voices from our learners.
          </h2>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <figure key={t.name} className="rounded-2xl border border-border bg-card p-7 shadow-card">
              <Quote className="h-6 w-6 text-accent" />
              <blockquote className="mt-4 text-base leading-relaxed text-foreground">"{t.quote}"</blockquote>
              <figcaption className="mt-6 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-accent" />
                <div>
                  <div className="font-semibold text-sm">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.role}</div>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container pb-24">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-hero p-10 md:p-16 text-primary-foreground shadow-elegant">
          <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-20 -left-10 h-72 w-72 rounded-full bg-accent/30 blur-3xl" />
          <div className="relative max-w-2xl">
            <h2 className="font-display text-4xl md:text-5xl font-bold text-balance">
              Ready to take the next step in your education?
            </h2>
            <p className="mt-4 text-base md:text-lg text-primary-foreground/80">
              Join thousands of students preparing smarter — with mentors, resources, and a community that believes in you.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="rounded-full h-12 px-7 bg-white text-primary hover:bg-white/90 text-base">
                <Link to="/courses">Browse all courses</Link>
              </Button>
              <Button asChild size="lg" variant="ghost" className="rounded-full h-12 px-6 text-primary-foreground hover:bg-white/10 text-base">
                <Link to="/contact">Talk to a mentor <ArrowRight className="ml-1 h-4 w-4" /></Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Index;
