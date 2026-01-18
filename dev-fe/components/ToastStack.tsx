"use client";

import { useEffect } from "react";

export type Toast = {
  id: string;
  title: string;
  message?: string;
  tone?: "success" | "error" | "info";
};

const toneStyles: Record<NonNullable<Toast["tone"]>, string> = {
  success: "border-emerald-400/60 bg-emerald-50 text-emerald-900",
  error: "border-rose-400/60 bg-rose-50 text-rose-900",
  info: "border-slate-300/80 bg-white text-slate-800",
};

export default function ToastStack({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}) {
  useEffect(() => {
    if (toasts.length === 0) return;
    const timers = toasts.map((toast) =>
      window.setTimeout(() => onDismiss(toast.id), 5000)
    );
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [toasts, onDismiss]);

  return (
    <div className="fixed right-6 top-6 z-50 flex w-[min(320px,90vw)] flex-col gap-3">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`glass animate-fade-in rounded-2xl border px-4 py-3 shadow-soft ${
            toneStyles[toast.tone ?? "info"]
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold">{toast.title}</p>
              {toast.message ? (
                <p className="mt-1 text-xs text-slate-600">{toast.message}</p>
              ) : null}
            </div>
            <button
              className="text-xs text-slate-500 hover:text-slate-800"
              onClick={() => onDismiss(toast.id)}
              type="button"
            >
              Close
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
