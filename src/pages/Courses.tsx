import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Layout } from "@/components/site/Layout";
import { CourseCard } from "@/components/site/CourseCard";
import { COURSES } from "@/data/site";
import { cn } from "@/lib/utils";

const CATS = ["All", "Admission", "Science", "Mathematics", "Language"];

const Courses = () => {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");

  const list = useMemo(() => {
    return COURSES.filter((c) =>
      (cat === "All" || c.category === cat) &&
      (c.title.toLowerCase().includes(q.toLowerCase()) || c.instructor.toLowerCase().includes(q.toLowerCase()))
    );
  }, [q, cat]);

  return (
    <Layout>
      <section className="relative overflow-hidden bg-gradient-soft">
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 h-[400px] w-[800px] rounded-full bg-primary/10 blur-3xl" />
        <div className="container relative py-20 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">Catalogue</p>
          <h1 className="mt-3 font-display text-5xl md:text-6xl font-bold text-balance">All Courses</h1>
          <p className="mt-4 mx-auto max-w-xl text-muted-foreground">
            Hand-crafted programs across admission, science, language and more — at every level.
          </p>

          <div className="mx-auto mt-10 flex max-w-xl items-center rounded-full border border-border bg-card px-5 shadow-card focus-within:ring-2 focus-within:ring-primary/30">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search courses, instructors…"
              className="flex-1 bg-transparent px-3 py-3.5 text-sm outline-none"
            />
          </div>

          <div className="mx-auto mt-6 flex flex-wrap justify-center gap-2">
            {CATS.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={cn(
                  "rounded-full px-4 py-1.5 text-sm font-medium transition-colors border",
                  cat === c
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border hover:text-primary hover:border-primary"
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="container py-16">
        {list.length === 0 ? (
          <p className="text-center text-muted-foreground py-20">No courses match your search.</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {list.map((c) => <CourseCard key={c.slug} course={c} />)}
          </div>
        )}
      </section>
    </Layout>
  );
};

export default Courses;
