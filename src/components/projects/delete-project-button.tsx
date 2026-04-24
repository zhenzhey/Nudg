"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DeleteProjectButton({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      router.push("/projects");
      router.refresh();
    } catch {
      setLoading(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-on-surface-variant">Delete project?</span>
        <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
          Cancel
        </Button>
        <Button variant="danger" size="sm" loading={loading} onClick={handleDelete}>
          Delete
        </Button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-error transition-colors"
    >
      <Trash2 size={13} />
      Delete project
    </button>
  );
}
