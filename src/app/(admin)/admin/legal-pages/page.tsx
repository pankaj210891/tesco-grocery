"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileText, Shield, RefreshCw, Eye, Clock, Tag,
  CheckCircle2, XCircle, ExternalLink, Loader2, Pencil,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { authClient } from "@/lib/axios";
import { toast } from "sonner";
import type { LegalPage } from "@/types";

const PAGE_META = {
  terms:   { label: "Terms & Conditions", icon: FileText, color: "blue",  href: "/terms" },
  privacy: { label: "Privacy Policy",     icon: Shield,   color: "green", href: "/privacy" },
} as const;

const COLOR_MAP = {
  blue:  { bg: "bg-blue-50 dark:bg-blue-900/20",  icon: "text-blue-500",  badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  green: { bg: "bg-green-50 dark:bg-green-900/20", icon: "text-green-500", badge: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

interface SeedState { loading: boolean; done: boolean; }

export default function AdminLegalPagesPage() {
  const { token, user, hasHydrated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!hasHydrated) return;
    if (!user) { router.push("/login"); return; }
    if (user.role !== "admin") router.push("/");
  }, [hasHydrated, user, router]);
  const [pages, setPages]   = useState<LegalPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [seed, setSeed]     = useState<SeedState>({ loading: false, done: false });
  const [toggling, setToggling] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const { data } = await authClient(token).get<{ success: boolean; data: LegalPage[] }>(
        "/api/admin/legal-pages"
      );
      if (data.success) setPages(data.data);
    } catch {
      toast.error("Failed to load legal pages");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function handleSeed() {
    if (!token) return;
    setSeed({ loading: true, done: false });
    try {
      const { data } = await authClient(token).post<{ success: boolean; message?: string }>(
        "/api/legal-pages/seed"
      );
      if (data.success) {
        toast.success("Legal pages seeded successfully");
        setSeed({ loading: false, done: true });
        void load();
      } else {
        toast.error("Seed failed");
        setSeed({ loading: false, done: false });
      }
    } catch {
      toast.error("Seed request failed");
      setSeed({ loading: false, done: false });
    }
  }

  async function togglePublish(page: LegalPage) {
    if (!token) return;
    setToggling(page._id);
    try {
      const { data } = await authClient(token).put<{ success: boolean; data: LegalPage }>(
        `/api/admin/legal-pages/${page._id}`,
        { isPublished: !page.isPublished }
      );
      if (data.success) {
        setPages((prev) => prev.map((p) => (p._id === page._id ? data.data : p)));
        toast.success(`Page ${data.data.isPublished ? "published" : "unpublished"}`);
      }
    } catch {
      toast.error("Failed to update page");
    } finally {
      setToggling(null);
    }
  }

  const missing = (["terms", "privacy"] as const).filter(
    (slug) => !pages.find((p) => p.slug === slug)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">Legal Pages</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Manage Terms & Conditions and Privacy Policy content served to customers.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => void load()}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          {missing.length > 0 && (
            <button
              onClick={() => void handleSeed()}
              disabled={seed.loading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 transition-colors shadow-sm shadow-amber-500/20 disabled:opacity-60"
            >
              {seed.loading
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <RefreshCw className="h-4 w-4" />
              }
              Seed Content
            </button>
          )}
        </div>
      </div>

      {/* Missing pages notice */}
      {!loading && missing.length > 0 && (
        <div className="rounded-2xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/40 p-4 text-sm text-amber-800 dark:text-amber-300">
          <strong>Missing pages:</strong> {missing.map((s) => PAGE_META[s].label).join(", ")} —
          click <strong>Seed Content</strong> to create them with default content.
        </div>
      )}

      {/* Page cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[1, 2].map((i) => (
            <div key={i} className="h-48 rounded-2xl bg-gray-200 dark:bg-gray-800 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {(["terms", "privacy"] as const).map((slug) => {
            const meta  = PAGE_META[slug];
            const page  = pages.find((p) => p.slug === slug);
            const color = COLOR_MAP[meta.color];
            const Icon  = meta.icon;

            if (!page) {
              return (
                <div key={slug} className="rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 p-6 flex flex-col items-center justify-center gap-3 text-center min-h-[200px]">
                  <div className={`w-12 h-12 rounded-2xl ${color.bg} flex items-center justify-center`}>
                    <Icon className={`h-6 w-6 ${color.icon}`} aria-hidden />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-600 dark:text-gray-400">{meta.label}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Not seeded yet</p>
                  </div>
                </div>
              );
            }

            return (
              <div key={slug} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                {/* Card top */}
                <div className={`${color.bg} px-6 py-5 flex items-center gap-4`}>
                  <div className="w-11 h-11 rounded-xl bg-white/70 dark:bg-gray-900/40 flex items-center justify-center shrink-0">
                    <Icon className={`h-5 w-5 ${color.icon}`} aria-hidden />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 dark:text-white">{meta.label}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                      {page.sections.length} sections · v{page.version}
                    </p>
                  </div>
                  <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold ${
                    page.isPublished
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                  }`}>
                    {page.isPublished ? "Published" : "Draft"}
                  </span>
                </div>

                {/* Card body */}
                <div className="px-6 py-5 space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 shrink-0" />
                      Updated {formatDate(page.lastUpdated)}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Tag className="h-3.5 w-3.5 shrink-0" />
                      Effective {formatDate(page.effectiveDate)}
                    </div>
                  </div>

                  <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                    {page.introText}
                  </p>

                  {/* Sections preview */}
                  <div className="flex flex-wrap gap-1.5">
                    {page.sections.slice(0, 5).map((s) => (
                      <span key={s.id} className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-xs text-gray-500 dark:text-gray-400">
                        {s.title.replace(/^\d+\.\s*/, "")}
                      </span>
                    ))}
                    {page.sections.length > 5 && (
                      <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-xs text-gray-500 dark:text-gray-400">
                        +{page.sections.length - 5} more
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => void togglePublish(page)}
                        disabled={toggling === page._id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                      >
                        {toggling === page._id
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : page.isPublished
                          ? <XCircle className="h-3.5 w-3.5 text-red-500" />
                          : <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                        }
                        {page.isPublished ? "Unpublish" : "Publish"}
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/legal-pages/${page.slug}`}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </Link>
                      <Link
                        href={meta.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Preview
                        <ExternalLink className="h-3 w-3 opacity-60" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Info note */}
      <div className="rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-5">
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">About Legal Pages</h3>
        <ul className="space-y-1.5 text-sm text-gray-500 dark:text-gray-400">
          <li className="flex items-start gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
            Content is stored in MongoDB and served as server-rendered pages for optimal SEO.
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
            Pages are cached with ISR (1-hour revalidation) for performance.
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
            Use the <strong>Seed Content</strong> button to populate both pages with the default content. Existing data will be replaced.
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
            Click <strong>Edit</strong> on any page card to open the full content editor — update sections, blocks, metadata, and publish status.
          </li>
        </ul>
      </div>
    </div>
  );
}
