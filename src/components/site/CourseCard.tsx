import { Link } from "react-router-dom";
import { Clock, BookOpen, Star, Users } from "lucide-react";
import { cn } from "@/lib/utils";

type Course = {
  slug: string;
  title: string;
  category: string;
  level: string;
  duration: string;
  lessons: number;
  price: number;
  rating: number;
  students: number;
  instructor: string;
  cover: string;
  summary: string;
};

export const CourseCard = ({ course }: { course: Course }) => {
  return (
    <Link
      to={`/courses/${course.slug}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card hover:shadow-elegant transition-all duration-500 hover:-translate-y-1"
    >
      <div className={cn("relative h-44 bg-gradient-to-br p-6 overflow-hidden", course.cover)}>
        <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_20%_20%,white,transparent_40%),radial-gradient(circle_at_80%_70%,white,transparent_40%)]" />
        <div className="relative flex items-start justify-between text-primary-foreground">
          <span className="rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-semibold uppercase tracking-wider">
            {course.category}
          </span>
          <span className="rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-semibold">
            {course.level}
          </span>
        </div>
        <div className="absolute bottom-4 left-6 right-6 text-primary-foreground">
          <p className="text-xs/relaxed opacity-80">By {course.instructor}</p>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-6">
        <h3 className="font-display text-lg font-semibold leading-snug text-foreground group-hover:text-primary transition-colors">
          {course.title}
        </h3>
        <p className="text-sm text-muted-foreground line-clamp-2">{course.summary}</p>

        <div className="mt-auto flex items-center gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />{course.duration}</span>
          <span className="inline-flex items-center gap-1.5"><BookOpen className="h-3.5 w-3.5" />{course.lessons} lessons</span>
          <span className="inline-flex items-center gap-1.5"><Users className="h-3.5 w-3.5" />{course.students.toLocaleString()}</span>
        </div>

        <div className="flex items-center justify-between border-t border-border pt-4">
          <div className="inline-flex items-center gap-1 text-sm font-medium">
            <Star className="h-4 w-4 fill-gold text-gold" />
            {course.rating}
          </div>
          <div className="font-display text-xl font-bold text-primary">৳{course.price.toLocaleString()}</div>
        </div>
      </div>
    </Link>
  );
};
