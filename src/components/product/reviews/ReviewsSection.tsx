"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, ChevronDown } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import RatingBreakdown from "./RatingBreakdown";
import ReviewCard from "./ReviewCard";
import ReviewForm from "./ReviewForm";
import type { Review, RatingSummary } from "@/types";

interface ReviewsData {
  reviews:    Review[];
  summary:    RatingSummary;
  page:       number;
  totalPages: number;
}

interface Props {
  productSlug:    string;
  onCountLoaded?: (count: number) => void;
}

export default function ReviewsSection({ productSlug, onCountLoaded }: Props) {
  const { user, token } = useAuthStore();
  const router = useRouter();
  const [data,    setData]    = useState<ReviewsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [page,    setPage]    = useState(1);
  const [allReviews, setAllReviews] = useState<Review[]>([]);

  const hasReviewed = useMemo(
    () => !!user && allReviews.some((r) => r.userId === user._id),
    [user, allReviews]
  );

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res  = await fetch(`/api/products/${productSlug}/reviews?page=${page}&limit=10`);
        const json = await res.json() as { success: boolean; data: ReviewsData };
        if (json.success) {
          setData(json.data);
          setAllReviews((prev) =>
            page === 1 ? json.data.reviews : [...prev, ...json.data.reviews]
          );
          if (page === 1) onCountLoaded?.(json.data.summary.total);
        }
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [productSlug, page, onCountLoaded]);

  async function syncSummary() {
    const res  = await fetch(`/api/products/${productSlug}/reviews?page=1&limit=1`);
    const json = await res.json() as { success: boolean; data: ReviewsData };
    if (json.success) {
      setData((prev) => prev ? { ...prev, summary: json.data.summary } : json.data);
      onCountLoaded?.(json.data.summary.total);
    }
  }

  function handleSubmitted(review: Review) {
    setAllReviews((prev) => [review, ...prev]);
    void syncSummary();
    router.refresh();
  }

  function handleDeleted(id: string) {
    setAllReviews((prev) => prev.filter((r) => r._id !== id));
    void syncSummary();
    router.refresh();
  }

  function handleUpdated(updated: Review) {
    setAllReviews((prev) => prev.map((r) => (r._id === updated._id ? updated : r)));
    void syncSummary();
    router.refresh();
  }

  const summary = data?.summary;

  return (
    <div className="space-y-8">
      {/* Heading */}
      <div className="flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-[#0F4C75] dark:text-blue-400" />
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
          Customer Reviews
          {summary && summary.total > 0 && (
            <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
              ({summary.total})
            </span>
          )}
        </h2>
      </div>

      {/* Rating breakdown skeleton / data */}
      {loading && !summary ? (
        <div className="h-20 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
      ) : summary && summary.total > 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5">
          <RatingBreakdown summary={summary} />
        </div>
      ) : null}

      {/* Write a review */}
      {!user ? (
        <div className="bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Sign in to leave a review
          </p>
          <a
            href="/login"
            className="inline-block px-4 py-2 rounded-lg bg-[#0F4C75] text-white text-sm font-semibold hover:bg-[#0A3352] transition-colors"
          >
            Sign in
          </a>
        </div>
      ) : hasReviewed ? (
        <div className="bg-green-50 dark:bg-green-950/30 rounded-xl border border-green-100 dark:border-green-900 p-4 text-center">
          <p className="text-sm text-green-700 dark:text-green-400 font-medium">
            You have already reviewed this product. Edit or delete your review below.
          </p>
        </div>
      ) : (
        <ReviewForm productSlug={productSlug} token={token!} onSubmitted={handleSubmitted} />
      )}

      {/* Review list */}
      {allReviews.length === 0 && !loading ? (
        <div className="text-center py-10 text-gray-400">
          <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No reviews yet. Be the first!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {allReviews.map((review) => (
            <ReviewCard
              key={review._id}
              review={review}
              currentUserId={user?._id}
              token={token ?? undefined}
              onDeleted={handleDeleted}
              onUpdated={handleUpdated}
            />
          ))}

          {loading && (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-24 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
              ))}
            </div>
          )}

          {data && page < data.totalPages && !loading && (
            <button
              onClick={() => setPage((p) => p + 1)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-400 hover:border-[#0F4C75] hover:text-[#0F4C75] dark:hover:text-blue-400 transition-colors"
            >
              Load more reviews <ChevronDown className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
