"use client";

import { useState, useTransition } from "react";
import { Search, Mic, Sparkles, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

interface AIAssistantProps {
  projectId?: string;
  projectTitle?: string;
}

export function AIAssistant({ projectId, projectTitle }: AIAssistantProps) {
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || !projectId) return;
    startTransition(() => {
      router.push(`/projects/${projectId}?ai=${encodeURIComponent(query.trim())}`);
    });
  };

  return (
    <div className="bg-surface rounded-2xl shadow-card border border-outline/15 p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 bg-primary/10 rounded-lg flex items-center justify-center">
          <Sparkles size={13} className="text-primary" />
        </div>
        <span className="text-sm font-bold text-on-surface">
          {projectTitle ? `${projectTitle} AI` : "Project AI Core"}
        </span>
        {projectId && (
          <span className="ml-auto text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded-full">
            Deep Work
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="relative">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask AI to analyze deliverables, search docs, or suggest next steps..."
          className="w-full bg-surface-container text-sm text-on-surface placeholder:text-inverse-on-surface rounded-xl pl-9 pr-10 py-2.5 border border-outline/20 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all"
          disabled={pending}
        />
        {query.trim() ? (
          <button
            type="submit"
            disabled={pending || !projectId}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-primary hover:text-primary-dim transition-colors disabled:opacity-40"
          >
            <ArrowRight size={15} />
          </button>
        ) : (
          <button
            type="button"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors"
          >
            <Mic size={14} />
          </button>
        )}
      </form>
    </div>
  );
}
