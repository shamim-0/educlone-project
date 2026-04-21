import { useState } from "react";
import { Layout } from "@/components/site/Layout";
import { Button } from "@/components/ui/button";
import { Mail, Phone, MapPin, Send } from "lucide-react";
import { toast } from "sonner";

const Contact = () => {
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      (e.target as HTMLFormElement).reset();
      toast.success("Message sent!", { description: "We'll get back to you within 24 hours." });
    }, 700);
  };

  return (
    <Layout>
      <section className="relative overflow-hidden bg-gradient-soft">
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 h-[400px] w-[800px] rounded-full bg-primary/10 blur-3xl" />
        <div className="container relative py-20 max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">Get in touch</p>
          <h1 className="mt-3 font-display text-5xl md:text-6xl font-bold text-balance">Let's talk.</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Questions about courses, enrolment, or partnerships — we usually reply within a day.
          </p>
        </div>
      </section>

      <section className="container py-16 grid gap-10 lg:grid-cols-5">
        <div className="lg:col-span-2 space-y-5">
          {[
            { icon: Mail, title: "Email", value: "hello@educatumschool.com", href: "mailto:hello@educatumschool.com" },
            { icon: Phone, title: "Phone", value: "+880 1700 000 000", href: "tel:+8801700000000" },
            { icon: MapPin, title: "Office", value: "Dhaka, Bangladesh" },
          ].map((c) => (
            <a key={c.title} href={c.href} className="flex items-start gap-4 rounded-2xl border border-border bg-card p-6 hover:shadow-card transition-shadow">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <c.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">{c.title}</p>
                <p className="mt-1 font-medium">{c.value}</p>
              </div>
            </a>
          ))}

          <div className="rounded-2xl border border-border bg-gradient-hero p-7 text-primary-foreground shadow-card">
            <h3 className="font-display text-lg font-semibold">Office hours</h3>
            <p className="mt-2 text-sm text-primary-foreground/80">Sat–Thu, 10:00 AM – 8:00 PM (BST). Closed on Friday.</p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="lg:col-span-3 rounded-3xl border border-border bg-card p-8 shadow-card space-y-5">
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Your name" name="name" placeholder="Jane Doe" required />
            <Field label="Email" name="email" type="email" placeholder="jane@example.com" required />
          </div>
          <Field label="Subject" name="subject" placeholder="Course inquiry" required />
          <div>
            <label className="text-sm font-medium">Message</label>
            <textarea
              name="message"
              required
              rows={5}
              placeholder="Tell us what you're looking for…"
              className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>
          <Button disabled={submitting} className="rounded-full h-12 px-7 bg-primary hover:bg-primary/90">
            {submitting ? "Sending…" : <>Send message <Send className="ml-2 h-4 w-4" /></>}
          </Button>
        </form>
      </section>
    </Layout>
  );
};

const Field = ({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) => (
  <div>
    <label className="text-sm font-medium">{label}</label>
    <input
      {...props}
      className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
    />
  </div>
);

export default Contact;
