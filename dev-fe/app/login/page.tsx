"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { login } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!email.includes("@")) {
      setError("Enter a valid email address.");
      return;
    }
    if (!password) {
      setError("Password is required.");
      return;
    }

    try {
      setLoading(true);
      await login({ email, password });
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen px-6 py-12 sm:px-10">
      <div className="mx-auto grid max-w-5xl items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="space-y-6">
          <Link href="/" className="text-xs uppercase tracking-[0.2em] text-slate-500">
            DocuFlow
          </Link>
          <h1 className="text-4xl font-semibold text-slate-900 sm:text-5xl">
            Welcome back to your document studio.
          </h1>
          <p className="text-lg text-slate-600">
            Sign in to track uploads, manage metadata, and stay in sync with realtime updates.
          </p>
          <div className="glass rounded-3xl px-6 py-5 shadow-soft">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">Realtime status</p>
                <p className="text-xs text-slate-600">Live updates the moment you enter.</p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Ready
              </span>
            </div>
          </div>
        </section>

        <section className="glass rounded-3xl px-6 py-8 shadow-soft sm:px-8">
          <h2 className="text-2xl font-semibold text-slate-900">Sign in</h2>
          <p className="mt-2 text-sm text-slate-600">Use the email you registered with.</p>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              Email
              <input
                className="h-11 rounded-2xl border border-slate-200 bg-white/80 px-4 text-sm outline-none transition focus:border-slate-400"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@company.com"
                autoComplete="email"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              Password
              <input
                className="h-11 rounded-2xl border border-slate-200 bg-white/80 px-4 text-sm outline-none transition focus:border-slate-400"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </label>

            {error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
                {error}
              </div>
            ) : null}

            <button
              className="mt-2 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              type="submit"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Continue"}
            </button>
          </form>

          <p className="mt-6 text-xs text-slate-500">
            New here?{" "}
            <Link href="/register" className="font-semibold text-slate-700">
              Create an account
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
