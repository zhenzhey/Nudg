"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Send, X } from "lucide-react";

interface InboxInputProps {
  projectId?: string;
  deliverableId?: string;
  projectTitle?: string;
  deliverableTitle?: string;
}

export function InboxInput({ projectId, deliverableId, projectTitle, deliverableTitle }: InboxInputProps) {
  const [text, setText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const attachImage = useCallback((file: File) => {
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    for (const item of e.clipboardData.items) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) attachImage(file);
      }
    }
  }, [attachImage]);

  const handleSubmit = async () => {
    if (!text.trim() && !imageFile) return;
    setSubmitting(true);
    try {
      let imageUrl: string | undefined;
      if (imageFile) {
        const supabase = createClient();
        const ext = imageFile.name.split(".").pop() ?? "png";
        const { data, error } = await supabase.storage
          .from("inbox-images")
          .upload(`${Date.now()}.${ext}`, imageFile, { upsert: false });
        if (!error && data) {
          const { data: { publicUrl } } = supabase.storage.from("inbox-images").getPublicUrl(data.path);
          imageUrl = publicUrl;
        }
      }
      await fetch("/api/inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text, image_url: imageUrl, project_id: projectId, deliverable_id: deliverableId }),
      });
      setText("");
      setImageFile(null);
      setImagePreview(null);
      setSent(true);
      setTimeout(() => setSent(false), 2000);
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const hasContent = text.trim() || imageFile;

  const label = deliverableTitle ?? projectTitle;

  return (
    <div className="bg-surface rounded-2xl border border-outline/20 shadow-card p-4 space-y-3">
      {imagePreview && (
        <div className="relative inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imagePreview} alt="Pasted" className="max-h-32 rounded-xl object-cover border border-outline/20" />
          <button
            onClick={() => { setImageFile(null); setImagePreview(null); }}
            className="absolute top-1 right-1 bg-surface/90 hover:bg-surface rounded-full p-0.5 border border-outline/20"
          >
            <X size={11} />
          </button>
        </div>
      )}

      <textarea
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onPaste={handlePaste}
        onKeyDown={handleKeyDown}
        placeholder="Capture a thought"
        className="w-full bg-surface-container text-sm text-on-surface placeholder:text-on-surface-variant/40 rounded-xl px-3 py-2.5 border border-outline/15 focus:outline-none focus:border-primary/30 focus:ring-1 focus:ring-primary/15 resize-none leading-relaxed transition-all"
      />

      <div className="flex items-center justify-between">
        {label ? (
          <span className="inline-flex items-center gap-1.5 text-[11px] text-on-surface-variant bg-surface-container border border-outline/20 rounded-full px-2.5 py-1 truncate max-w-[200px]">
            <span className="w-1.5 h-1.5 rounded-full bg-primary/40 shrink-0" />
            {label}
          </span>
        ) : <span />}

        <button
          onClick={handleSubmit}
          disabled={submitting || !hasContent}
          className="p-1.5 rounded-lg transition-all disabled:opacity-25 hover:bg-surface-container"
        >
          {sent ? (
            <span className="text-[11px] text-success font-semibold px-1">Saved</span>
          ) : (
            <Send size={13} className={hasContent ? "text-primary" : "text-on-surface-variant/50"} />
          )}
        </button>
      </div>
    </div>
  );
}
