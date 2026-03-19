"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils/cn";

export type ToastVariant = "default" | "success" | "error" | "info";

export type ToastData = {
  id: string;
  message: string;
  variant: ToastVariant;
  duration: number;
};

export type ToastProps = {
  toast: ToastData;
  onDismiss: (id: string) => void;
};

const variantClasses: Record<ToastVariant, string> = {
  default: "border-slate-700 bg-slate-800 text-slate-100",
  success: "border-emerald-800 bg-emerald-900/80 text-emerald-100",
  error: "border-red-800 bg-red-900/80 text-red-100",
  info: "border-indigo-800 bg-indigo-900/80 text-indigo-100",
};

export function Toast({ toast, onDismiss }: ToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const showFrame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(showFrame);
  }, []);

  useEffect(() => {
    if (toast.duration <= 0) return;
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDismiss(toast.id), 200);
    }, toast.duration);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onDismiss]);

  return (
    <div
      role="alert"
      className={cn(
        "pointer-events-auto flex items-center gap-3 rounded-lg border px-4 py-3 shadow-lg transition-all duration-200",
        visible
          ? "translate-y-0 opacity-100"
          : "translate-y-2 opacity-0",
        variantClasses[toast.variant],
      )}
    >
      <p className="text-sm font-medium flex-1">{toast.message}</p>
      <button
        type="button"
        onClick={() => {
          setVisible(false);
          setTimeout(() => onDismiss(toast.id), 200);
        }}
        className="shrink-0 rounded p-0.5 opacity-60 hover:opacity-100 transition-opacity"
        aria-label="Dismiss"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}
