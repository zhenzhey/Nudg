"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Plus, Send, X } from "lucide-react";

interface Deliverable {
  id: string;
  title: string;
  week_number: number;
  project_title: string;
}

export function NavbarInboxPopover() {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const [text, setText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [selectedDeliverableId, setSelectedDeliverableId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const openPopover = () => {
    if (buttonRef.current) {
      const r = buttonRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 8, right: window.innerWidth - r.right });
    }
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const supabase = createClient();
    supabase
      .from("goals")
      .select("id, title, deliverables(id, title, week_number, status)")
      .eq("status", "active")
      .then(({ data }) => {
        if (!data) return;
        const flat: Deliverable[] = data.flatMap((g) =>
          ((g.deliverables ?? []) as { id: string; title: string; week_number: number; status: string }[])
            .filter((d) => d.status === "pending")
            .map((d) => ({ id: d.id, title: d.title, week_number: d.week_number, project_title: g.title }))
        );
        setDeliverables(flat);
      });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) setOpen(false);
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [open]);

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
      const selected = deliverables.find((d) => d.id === selectedDeliverableId);
      await fetch("/api/inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text, image_url: imageUrl, deliverable_id: selected?.id ?? null }),
      });
      setText("");
      setImageFile(null);
      setImagePreview(null);
      setSelectedDeliverableId("");
      setSent(true);
      setTimeout(() => { setSent(false); setOpen(false); }, 1200);
    } finally {
      setSubmitting(false);
    }
  };

  const hasContent = !!(text.trim() || imageFile);

  return (
    <>
      <button
        ref={buttonRef}
        onClick={openPopover}
        title="Quick capture"
        className="flex items-center justify-center w-7 h-7 rounded-lg bg-surface-container hover:bg-surface-container-high border border-outline/20 text-on-surface-variant hover:text-on-surface transition-colors"
      >
        <Plus size={14} />
      </button>

      {open && (
        <div
          ref={panelRef}
          style={{ position: "fixed", top: pos.top, right: pos.right, width: 320 }}
          className="bg-surface border border-outline/20 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] p-4 space-y-3 z-[200]"
        >
          {imagePreview && (
            <div className="relative inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imagePreview} alt="Pasted" className="max-h-28 rounded-xl object-cover border border-outline/20" />
              <button
                onClick={() => { setImageFile(null); setImagePreview(null); }}
                className="absolute top-1 right-1 bg-surface/90 rounded-full p-0.5 border border-outline/20"
              >
                <X size={11} />
              </button>
            </div>
          )}

          <textarea
            autoFocus
            rows={4}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onPaste={handlePaste}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleSubmit(); }
            }}
            placeholder="Capture a thought"
            className="w-full bg-surface-container text-sm text-on-surface placeholder:text-on-surface-variant/40 rounded-xl px-3 py-2.5 border border-outline/15 focus:outline-none focus:border-primary/30 focus:ring-1 focus:ring-primary/15 resize-none leading-relaxed transition-all"
          />

          <div className="flex items-center gap-2">
            <select
              value={selectedDeliverableId}
              onChange={(e) => setSelectedDeliverableId(e.target.value)}
              className="flex-1 min-w-0 text-[11px] text-on-surface-variant bg-surface-container border border-outline/20 rounded-full px-3 py-1.5 focus:outline-none cursor-pointer hover:bg-surface-container-high transition-colors"
            >
              <option value="">No project</option>
              {deliverables.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.project_title} · W{d.week_number}
                </option>
              ))}
            </select>

            <button
              onClick={handleSubmit}
              disabled={submitting || !hasContent}
              className="shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-30 bg-neutral text-on-neutral hover:bg-neutral/90 shadow-sm"
            >
              <Send size={11} />
              {sent ? "Saved!" : "Send"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
