"use client";

import { useState } from "react";
import { Star, Trash2, Pencil, Check, X, BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { Review } from "@/types";

interface ReviewCardProps {
  review:     Review;
  currentUserId?: string;
  token?:     string;
  onDeleted:  (id: string) => void;
  onUpdated:  (review: Review) => void;
}

function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          aria-label={`${n} star`}
        >
          <Star
            className={cn(
              "h-5 w-5 transition-colors",
              n <= (hover || value) ? "fill-amber-400 text-amber-400" : "fill-gray-200 text-gray-200"
            )}
          />
        </button>
      ))}
    </div>
  );
}

export default function ReviewCard({ review, currentUserId, token, onDeleted, onUpdated }: ReviewCardProps) {
  const [editing,   setEditing]   = useState(false);
  const [deleting,  setDeleting]  = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [editRating, setEditRating] = useState(review.rating);
  const [editTitle,  setEditTitle]  = useState(review.title);
  const [editBody,   setEditBody]   = useState(review.body);
  const [error,     setError]     = useState("");

  const isOwn = currentUserId === review.userId;

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/reviews/${review._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Delete failed");
      onDeleted(review._id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
      setDeleting(false);
    }
  }

  async function handleSave() {
    setError("");
    setSaving(true);
    try {
      const res = await fetch(`/api/reviews/${review._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rating: editRating, title: editTitle, body: editBody }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Update failed");
      onUpdated(json.data as Review);
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  const date = new Date(review.createdAt).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#FCA311] flex items-center justify-center text-white text-sm font-bold shrink-0">
            {review.userName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{review.userName}</p>
              {review.isVerifiedPurchase && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800/40 px-1.5 py-0.5 rounded-full">
                  <BadgeCheck className="h-3 w-3" />
                  Verified Purchase
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400">{date}</p>
          </div>
        </div>

        {isOwn && !editing && (
          <div className="flex gap-1">
            <button onClick={() => setEditing(true)} aria-label="Edit review" className="p-1.5 rounded-lg text-gray-400 hover:text-[#FCA311] hover:bg-amber-50 dark:hover:bg-amber-950 transition-colors">
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button onClick={handleDelete} disabled={deleting} aria-label="Delete review" className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {editing ? (
        <div className="space-y-3 mt-3">
          <StarPicker value={editRating} onChange={setEditRating} />
          <input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:border-[#FCA311]"
          />
          <textarea
            value={editBody}
            onChange={(e) => setEditBody(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:border-[#FCA311] resize-none"
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FCA311] text-white text-xs font-semibold hover:bg-[#E8920A] transition-colors disabled:opacity-50">
              <Check className="h-3.5 w-3.5" /> {saving ? "Saving…" : "Save"}
            </button>
            <button onClick={() => { setEditing(false); setError(""); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-xs font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <X className="h-3.5 w-3.5" /> Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex gap-0.5 mb-1.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className={cn("h-3.5 w-3.5", i < review.rating ? "fill-amber-400 text-amber-400" : "fill-gray-200 text-gray-200")} aria-hidden />
            ))}
          </div>
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-1">{review.title}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{review.body}</p>
          {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
        </>
      )}
    </div>
  );
}
