"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { authClient } from "@/lib/axios";
import type { Review } from "@/types";

interface ReviewFormProps {
  productSlug: string;
  token:       string;
  onSubmitted: (review: Review) => void;
}

function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1" data-testid="rating-star-picker">
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
              "h-6 w-6 transition-colors",
              n <= (hover || value) ? "fill-amber-400 text-amber-400" : "fill-gray-200 text-gray-200"
            )}
          />
        </button>
      ))}
    </div>
  );
}

export default function ReviewForm({ productSlug, token, onSubmitted }: ReviewFormProps) {
  const [rating,     setRating]     = useState(0);
  const [title,      setTitle]      = useState("");
  const [body,       setBody]       = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!rating)       { setError("Please select a star rating"); return; }
    if (!title.trim()) { setError("Please add a title"); return; }
    if (!body.trim())  { setError("Please write your review"); return; }

    setSubmitting(true);
    try {
      const { data } = await authClient(token).post<{ success: boolean; data: Review }>(
        `/api/products/${productSlug}/reviews`,
        { rating, title, body }
      );
      onSubmitted(data.data);
      setRating(0); setTitle(""); setBody("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      data-testid="review-form"
      onSubmit={handleSubmit}
      className="bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-xl p-5 space-y-4"
    >
      <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">Write a Review</h3>

      <div>
        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
          Your rating <span className="text-red-500">*</span>
        </label>
        <StarPicker value={rating} onChange={setRating} />
      </div>

      <div>
        <label htmlFor="review-title" className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
          Title <span className="text-red-500">*</span>
        </label>
        <input
          id="review-title"
          data-testid="review-title-input"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          placeholder="Sum up your experience"
          className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:border-[#FCA311] focus:ring-1 focus:ring-[#FCA311]"
        />
      </div>

      <div>
        <label htmlFor="review-body" className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
          Review <span className="text-red-500">*</span>
        </label>
        <textarea
          id="review-body"
          data-testid="review-body-textarea"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={2000}
          rows={4}
          placeholder="What did you think? Quality, taste, value for money…"
          className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:border-[#FCA311] focus:ring-1 focus:ring-[#FCA311] resize-none"
        />
        <p className="text-[11px] text-gray-400 text-right mt-0.5">{body.length}/2000</p>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        data-testid="submit-review-btn"
        type="submit"
        disabled={submitting}
        className="w-full py-2.5 rounded-xl bg-[#FCA311] text-white text-sm font-semibold hover:bg-[#E8920A] transition-colors disabled:opacity-50"
      >
        {submitting ? "Submitting…" : "Submit Review"}
      </button>
    </form>
  );
}
