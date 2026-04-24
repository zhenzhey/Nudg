"use client";

import { useState } from "react";
import { FileText, Image, Pencil, Trash2, Check, X } from "lucide-react";

function ContentWithBreaks({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <>
      {lines.map((line, i) => (
        <span key={i}>
          {line}
          {i < lines.length - 1 && <br />}
        </span>
      ))}
    </>
  );
}

interface InboxItem {
  id: string;
  content: string | null;
  image_url: string | null;
  created_at: string;
  goals?: { title: string } | null;
  deliverables?: { title: string } | null;
}

export function InboxList({ initialItems }: { initialItems: InboxItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [saving, setSaving] = useState(false);

  function startEdit(item: InboxItem) {
    setEditingId(item.id);
    setEditText(item.content ?? "");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditText("");
  }

  async function saveEdit(id: string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/inbox/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editText }),
      });
      if (res.ok) {
        setItems((prev) => prev.map((it) => it.id === id ? { ...it, content: editText } : it));
        setEditingId(null);
      }
    } finally {
      setSaving(false);
    }
  }

  async function deleteItem(id: string) {
    const res = await fetch(`/api/inbox/${id}`, { method: "DELETE" });
    if (res.ok) setItems((prev) => prev.filter((it) => it.id !== id));
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-16 border-2 border-dashed border-outline-variant/30 rounded-2xl">
        <p className="text-on-surface-variant text-sm">No inbox items yet.</p>
        <p className="text-on-surface-variant/60 text-xs mt-1">
          Use the inbox input on the dashboard to capture thoughts and images.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const label = item.deliverables?.title ?? item.goals?.title;
        const date = new Date(item.created_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
        const isEditing = editingId === item.id;

        return (
          <div
            key={item.id}
            className="group bg-surface rounded-2xl border border-outline/20 shadow-card p-4 space-y-3"
          >
            {/* Header row */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                {item.image_url && !item.content
                  ? <Image size={13} className="text-on-surface-variant/50 shrink-0" />
                  : <FileText size={13} className="text-on-surface-variant/50 shrink-0" />
                }
                {label && (
                  <span className="text-[11px] text-on-surface-variant bg-surface-container rounded-full px-2.5 py-0.5 truncate max-w-[200px]">
                    {label}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {/* Edit/delete — subtle, visible on hover */}
                {!isEditing && (
                  <>
                    <button
                      onClick={() => startEdit(item)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-on-surface-variant/50 hover:text-on-surface hover:bg-surface-container transition-all"
                      title="Edit"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={() => deleteItem(item.id)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-on-surface-variant/50 hover:text-danger hover:bg-error-container/40 transition-all"
                      title="Delete"
                    >
                      <Trash2 size={12} />
                    </button>
                  </>
                )}
                <span className="text-[11px] text-on-surface-variant/50">{date}</span>
              </div>
            </div>

            {/* Content */}
            {isEditing ? (
              <div className="space-y-2">
                <textarea
                  autoFocus
                  rows={4}
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") cancelEdit();
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) saveEdit(item.id);
                  }}
                  className="w-full bg-surface-container text-sm text-on-surface rounded-xl px-3 py-2.5 border border-outline/20 focus:outline-none focus:border-primary/30 focus:ring-1 focus:ring-primary/15 resize-none leading-relaxed transition-all"
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => saveEdit(item.id)}
                    disabled={saving}
                    className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-dim transition-colors disabled:opacity-40"
                  >
                    <Check size={12} />
                    Save
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="flex items-center gap-1 text-xs text-on-surface-variant hover:text-on-surface transition-colors"
                  >
                    <X size={12} />
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              item.content && (
                <p
                  className="text-sm text-on-surface leading-relaxed cursor-text"
                  onDoubleClick={() => startEdit(item)}
                >
                  <ContentWithBreaks text={item.content} />
                </p>
              )
            )}

            {item.image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.image_url}
                alt="Inbox image"
                className="max-h-64 rounded-xl object-cover border border-outline/20"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
