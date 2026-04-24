"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";

interface Props {
  className?: string;
  label?: string;
  fullWidth?: boolean;
}

export function DemoLoginButton({ className, label = "Try demo — no signup", fullWidth }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick(reset = false) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/test-login${reset ? "?reset=1" : ""}`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to start demo");
      }
      router.push("/dashboard");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className={fullWidth ? "flex flex-col gap-1 w-full" : "inline-flex flex-col gap-1"}>
      <button
        type="button"
        onClick={() => handleClick(false)}
        onDoubleClick={() => handleClick(true)}
        title="Double-click to reset demo data"
        disabled={loading}
        className={
          className ??
          "inline-flex items-center gap-2 bg-surface-2 hover:bg-surface-3 border border-border hover:border-border-2 text-text-primary text-sm font-medium px-5 py-3 rounded-lg transition-colors disabled:opacity-60"
        }
      >
        <Sparkles size={14} className="text-primary-light" />
        {loading ? "Loading demo…" : label}
      </button>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
