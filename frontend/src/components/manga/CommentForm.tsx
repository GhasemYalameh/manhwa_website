"use client";

import { useState } from "react";

interface CommentFormProps {
  onSubmit: (text: string, isSpoiler: boolean) => Promise<void>;
  placeholder?: string;
  submitLabel?: string;
  autoFocus?: boolean;
  onCancel?: () => void;
}

export function CommentForm({
  onSubmit,
  placeholder = "نظر خود را بنویسید...",
  submitLabel = "ارسال",
  autoFocus,
  onCancel,
}: CommentFormProps) {
  const [text, setText] = useState("");
  const [isSpoiler, setIsSpoiler] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onSubmit(trimmed, isSpoiler);
      setText("");
      setIsSpoiler(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        rows={3}
        dir="auto"
        className="w-full resize-none rounded-card border border-divider bg-bg px-3 py-2 text-sm text-text-primary outline-none focus:border-accent"
      />
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={isSpoiler}
          onClick={() => setIsSpoiler((v) => !v)}
          className="flex items-center gap-2"
        >
          <span
            className={`flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors ${isSpoiler ? "justify-end bg-accent" : "justify-start bg-divider"
              }`}
          >
            <span className="h-4 w-4 rounded-full bg-white shadow transition-all" />
          </span>
          <span className={`text-xs font-medium ${isSpoiler ? "text-accent" : "text-text-secondary"}`}>
            حاوی اسپویل
          </span>
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-card border border-divider px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:border-accent hover:text-accent"
          >
            انصراف
          </button>
        )}
        <button
          type="submit"
          disabled={!text.trim() || isSubmitting}
          className="rounded-card bg-accent px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-accent-dark disabled:opacity-50"
        >
          {isSubmitting ? "در حال ارسال..." : submitLabel}
        </button>
      </div>
    </form>
  );
}