import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, Clock, Star, Users, Award } from "lucide-react";
import { Layout } from "@/components/site/Layout";
import { Button } from "@/components/ui/button";
import { COURSES } from "@/data/site";

const SYLLABUS = [
  "Foundation building & diagnostic test",
  "Concept-driven topic lectures with worked examples",
  "Daily practice problems and weekly assignments",
  "Live doubt solving with mentors",
  "Mock exams with detailed performance analytics",
  "Final revision sprint and exam strategy session",
];

const OUTCOMES = [
  "Master core concepts with clarity and confidence",
  "Build exam-day strategy and time management",
  "Track progress with data-driven assessments",
  "Get personalised mentor support throughout",
];

const CourseDetails = () => {
  const { slug } = useParams();
  const course = COURSES.find((c) => c.slug === slug);

  if (!course) {
    return (
      <Layout>
        <div className="container py-32 text-center">
          <h1 className="font-display text-3xl font-bold">Course not found</h1>
          <Button asChild className="mt-6 rounded-full"><Link to="/courses">Back to courses</Link></Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Hero */}
      <section className={`relative overflow-hidden bg-gradient-to-br ${course.cover} text-primary-foreground`}>
        <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_15%_20%,white,transparent_40%),radial-gradient(circle_at_85%_70%,white,transparent_40%)]" />
        <div className="container relative py-20">
          <Link to="/courses" className="inline-flex items-center gap-2 text-sm text-primary-foreground/80 hover:text-primary-foreground">
            <ArrowLeft className="h-4 w-4" /> All courses
          </Link>
          <div className="mt-6 max-w-3xl">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-semibold uppercase tracking-wider">{course.category}</span>
              <span className="rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-semibold">{course.level}</span>
            </div>
            <h1 className="mt-5 font-display text-4xl md:text-6xl font-bold leading-[1.05] text-balance">
              {course.title}
            </h1>
            <p className="mt-5 text-lg text-primary-foreground/85 max-w-2xl">{course.summary}</p>

            <div className="mt-8 flex flex-wrap gap-6 text-sm">
              <span className="inline-flex items-center gap-2"><Star className="h-4 w-4 fill-gold text-gold" /> {course.rating} rating</span>
              <span className="inline-flex items-center gap-2"><Users className="h-4 w-4" /> {course.students.toLocaleString()} students</span>
              <span className="inline-flex items-center gap-2"><Clock className="h-4 w-4" /> {course.duration}</span>
              <span className="inline-flex items-center gap-2"><BookOpen className="h-4 w-4" /> {course.lessons} lessons</span>
            </div>
          </div>
        </div>
      </section>

      <section className="container py-16 grid gap-12 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-12">
          <div>
            <h2 className="font-display text-3xl font-bold">About this course</h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              {course.summary} Our team has shaped this program based on what works for thousands
              of past students — combining rigorous content with mentorship and accountability.
              You'll move from confused to confident in measured, supported steps.
            </p>
          </div>

          <div>
            <h2 className="font-display text-3xl font-bold">What you'll learn</h2>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {OUTCOMES.map((o) => (
                <li key={o} className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-accent" />
                  <span className="text-sm">{o}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="font-display text-3xl font-bold">Syllabus overview</h2>
            <ol className="mt-6 space-y-3">
              {SYLLABUS.map((s, i) => (
                <li key={s} className="flex items-start gap-4 rounded-xl border border-border bg-card p-5">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 font-display font-bold text-primary">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <p className="pt-1.5 text-sm">{s}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* Sticky enroll card */}
        <aside className="lg:sticky lg:top-28 self-start">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-elegant">
            <div className="font-display text-4xl font-bold text-primary">৳{course.price.toLocaleString()}</div>
            <p className="mt-1 text-sm text-muted-foreground">One-time enrolment · Lifetime access</p>

            <Button className="mt-6 w-full rounded-full h-12 text-base bg-primary hover:bg-primary/90">
              Enroll now <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
            <Button variant="outline" className="mt-3 w-full rounded-full h-12">
              Download syllabus
            </Button>

            <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
              <li className="flex items-center gap-3"><Award className="h-4 w-4 text-primary" /> Completion certificate</li>
              <li className="flex items-center gap-3"><Users className="h-4 w-4 text-primary" /> Mentor support</li>
              <li className="flex items-center gap-3"><BookOpen className="h-4 w-4 text-primary" /> Notes & question banks</li>
              <li className="flex items-center gap-3"><Clock className="h-4 w-4 text-primary" /> Lifetime recordings</li>
            </ul>

            <div className="mt-6 border-t border-border pt-5">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Instructor</p>
              <div className="mt-3 flex items-center gap-3">
                <div className="h-11 w-11 rounded-full bg-gradient-to-br from-primary to-accent" />
                <div>
                  <div className="font-semibold text-sm">{course.instructor}</div>
                  <div className="text-xs text-muted-foreground">Lead Educator</div>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </section>
    </Layout>
  );
};

export default CourseDetails;
