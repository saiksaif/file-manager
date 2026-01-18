"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { register } from "@/lib/api";

const getStrength = (password: string) => {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return score;
};

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const strength = useMemo(() => getStrength(password), [password]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    if (!email.includes("@")) {
      setError("Enter a valid email address.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      await register({ name, email, password });
      router.push("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen px-6 py-12 sm:px-10">
      <div className="mx-auto grid max-w-5xl items-center gap-10 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="glass rounded-3xl px-6 py-8 shadow-soft sm:px-8">
          <h2 className="text-2xl font-semibold text-slate-900">Create your account</h2>
          <p className="mt-2 text-sm text-slate-600">
            Build a secure workspace for your documents.
          </p>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              Full name
              <input
                className="h-11 rounded-2xl border border-slate-200 bg-white/80 px-4 text-sm outline-none transition focus:border-slate-400"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Avery Chen"
                autoComplete="name"
              />
            </label>

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
                placeholder="Create a strong password"
                autoComplete="new-password"
              />
              <div className="space-y-2">
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full transition-all ${
                      strength <= 1
                        ? "w-1/4 bg-rose-300"
                        : strength === 2
                        ? "w-1/2 bg-amber-300"
                        : strength === 3
                        ? "w-3/4 bg-sky-300"
                        : "w-full bg-emerald-300"
                    }`}
                  />
                </div>
                <p className="text-xs text-slate-500">
                  Use 8+ characters with a mix of letters, numbers, and symbols.
                </p>
              </div>
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              Confirm password
              <input
                className="h-11 rounded-2xl border border-slate-200 bg-white/80 px-4 text-sm outline-none transition focus:border-slate-400"
                type="password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                placeholder="Repeat password"
                autoComplete="new-password"
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
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p className="mt-6 text-xs text-slate-500">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-slate-700">
              Sign in
            </Link>
          </p>
        </section>

        <section className="space-y-6">
          <Link href="/" className="text-xs uppercase tracking-[0.2em] text-slate-500">
            DocuFlow
          </Link>
          <h1 className="text-4xl font-semibold text-slate-900 sm:text-5xl">
            Organize documents with clarity, not chaos.
          </h1>
          <p className="text-lg text-slate-600">
            Upload in seconds, assign categories, and stay ahead with realtime alerts. DocuFlow keeps
            your docs searchable, secure, and always in sync.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {["Fast uploads", "Realtime notifications", "Smart categories", "Secure sessions"].map(
              (item) => (
                <div key={item} className="glass rounded-2xl px-4 py-3 text-sm text-slate-700">
                  <p className="font-semibold text-slate-900">{item}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Designed for production-grade workflows.
                  </p>
                </div>
              )
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
