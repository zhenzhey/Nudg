"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Deliverable } from "@/types";
import { ExternalLink, CheckCircle2 } from "lucide-react";

interface SubmissionFormProps {
  deliverable: Deliverable;
  goalId: string;
}

export function SubmissionForm({ deliverable, goalId }: SubmissionFormProps) {
  const router = useRouter();
  const [url, setUrl] = useState(deliverable.submission_url ?? "");
  const [notes, setNotes] = useState(deliverable.submission_notes ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSubmitted =
    deliverable.status === "submitted" || deliverable.status === "verified";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() && !notes.trim()) {
      setError("Provide a link or notes — something real you shipped.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/deliverables/${deliverable.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submission_url: url, submission_notes: notes }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Submission failed");
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (isSubmitted) {
    return (
      <div className="bg-success-muted border border-success/30 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <CheckCircle2 size={20} className="text-success shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-success">Deliverable submitted</p>
            {deliverable.submission_url && (
              <a
                href={deliverable.submission_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-success/80 hover:text-success mt-1 transition-colors"
              >
                <ExternalLink size={11} />
                {deliverable.submission_url}
              </a>
            )}
            {deliverable.submission_notes && (
              <p className="text-xs text-success/80 mt-1">{deliverable.submission_notes}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border rounded-xl p-5">
      <h3 className="text-sm font-semibold text-text-primary mb-1">Submit this deliverable</h3>
      <p className="text-xs text-text-muted mb-4">
        {deliverable.outcome_description ?? "Submit a link or description of what you shipped."}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Link / URL"
          type="url"
          placeholder="https://github.com/you/project or deployed URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          hint="GitHub repo, deployed app, demo video, or any externally viewable link"
        />

        <Textarea
          label="Notes"
          rows={3}
          placeholder="Describe what you built and what you learned..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          hint="Optional but encouraged — what did you ship?"
        />

        {error && (
          <p className="text-sm text-danger bg-danger-muted border border-danger/30 rounded-lg p-3">
            {error}
          </p>
        )}

        <Button
          type="submit"
          variant="primary"
          size="md"
          loading={loading}
          fullWidth
        >
          Submit deliverable
        </Button>
      </form>
    </div>
  );
}
