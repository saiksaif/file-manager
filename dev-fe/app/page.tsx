import Link from "next/link";

export default function Home() {
  return (
    <main className="relative overflow-hidden px-6 pb-20 pt-16 sm:px-10 lg:px-16">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-16 top-16 h-72 w-72 rounded-full bg-[oklch(0.78_0.14_35/0.25)] blur-3xl animate-float" />
        <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-[oklch(0.75_0.14_200/0.22)] blur-3xl animate-float" />
        <div className="absolute bottom-0 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-[oklch(0.9_0.06_90/0.3)] blur-3xl" />
      </div>

      <section className="relative mx-auto flex max-w-5xl flex-col items-start gap-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/70 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 shadow-soft">
          DocuFlow Beta
        </div>

        <div className="space-y-6">
          <h1 className="text-balance text-4xl font-semibold leading-tight text-slate-900 sm:text-5xl lg:text-6xl">
            Keep every document in motion, without losing the plot.
          </h1>
          <p className="max-w-2xl text-lg text-slate-600">
            DocuFlow connects uploads, categories, notifications, and realtime updates so your team
            always has the latest version. Secure sessions, crisp search, and a dashboard designed to
            keep work moving.
          </p>
        </div>

        <div className="flex flex-wrap gap-4">
          <Link
            className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-soft transition hover:-translate-y-0.5 hover:bg-slate-800"
            href="/login"
          >
            Sign in
          </Link>
          <Link
            className="rounded-full border border-slate-300 bg-white/70 px-6 py-3 text-sm font-semibold text-slate-700 shadow-soft transition hover:-translate-y-0.5 hover:border-slate-400"
            href="/register"
          >
            Create account
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              title: "Realtime clarity",
              description: "Socket-powered updates so every view stays in sync without refreshes.",
            },
            {
              title: "Smart organization",
              description: "Searchable metadata, categories, and clean filters to stay focused.",
            },
            {
              title: "Confident delivery",
              description: "Secure auth and resilient caching keep the workflow reliable.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="glass rounded-2xl px-5 py-4 text-sm text-slate-700 shadow-soft"
            >
              <h3 className="text-base font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-2 text-slate-600">{item.description}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
