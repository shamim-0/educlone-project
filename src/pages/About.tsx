import { Layout } from "@/components/site/Layout";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Target, Heart, Users, Sparkles } from "lucide-react";
import { INSTRUCTORS, STATS } from "@/data/site";

const VALUES = [
  { icon: Target, title: "Outcome-first", desc: "We measure success by your results, not just hours of content." },
  { icon: Heart, title: "Empathy in teaching", desc: "Mentors who remember being stuck — and meet you where you are." },
  { icon: Users, title: "Community", desc: "Learning is contagious. We surround you with peers who push forward." },
  { icon: Sparkles, title: "Continuous craft", desc: "Curriculum updated every cycle based on real feedback and exam patterns." },
];

const About = () => {
  return (
    <Layout>
      <section className="relative overflow-hidden bg-gradient-soft">
        <div className="absolute -top-24 -right-24 h-[400px] w-[400px] rounded-full bg-accent/15 blur-3xl" />
        <div className="container relative py-24 max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">About Educatum</p>
          <h1 className="mt-3 font-display text-5xl md:text-6xl font-bold text-balance leading-[1.05]">
            We exist so that great teaching reaches every student.
          </h1>
          <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
            Educatum School began with a simple idea — quality education shouldn't depend on
            postcode, background or income. Today, we're a team of educators, designers and
            engineers building tools and programs that genuinely move learners forward.
          </p>
        </div>
      </section>

      <section className="container py-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {STATS.map((s) => (
            <div key={s.label} className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <div className="font-display text-3xl font-bold text-primary">{s.value}</div>
              <div className="mt-1 text-sm text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="container py-16">
        <div className="max-w-2xl">
          <h2 className="font-display text-4xl md:text-5xl font-bold text-balance">What we believe.</h2>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {VALUES.map((v) => (
            <div key={v.title} className="flex gap-5 rounded-2xl border border-border bg-gradient-card p-7 hover:shadow-elegant transition-shadow">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <v.icon className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-display text-xl font-semibold">{v.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{v.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="container py-20">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">Team</p>
          <h2 className="mt-3 font-display text-4xl md:text-5xl font-bold text-balance">Mentors who care.</h2>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {INSTRUCTORS.map((i) => (
            <div key={i.name} className="rounded-2xl border border-border bg-card p-6 text-center shadow-card hover:-translate-y-1 transition-transform">
              <div className="mx-auto h-20 w-20 rounded-full bg-gradient-to-br from-primary to-accent" />
              <h3 className="mt-4 font-display text-lg font-semibold">{i.name}</h3>
              <p className="text-xs uppercase tracking-wider text-accent mt-1">{i.subject}</p>
              <p className="mt-3 text-sm text-muted-foreground">{i.bio}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container pb-24">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-hero p-10 md:p-14 text-primary-foreground shadow-elegant text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-balance max-w-2xl mx-auto">
            Curious? Come learn with us.
          </h2>
          <Button asChild size="lg" className="mt-7 rounded-full h-12 px-7 bg-white text-primary hover:bg-white/90">
            <Link to="/courses">Explore courses</Link>
          </Button>
        </div>
      </section>
    </Layout>
  );
};

export default About;
