"use client";

import Link from "next/link";
import { ChevronRight, FileText, Shield, Clock, Tag, Share2, CheckCircle2 } from "lucide-react";
import { TableOfContents } from "./TableOfContents";
import { LegalSection } from "./LegalSection";
import type { LegalPage } from "@/types";

interface LegalPageLayoutProps {
  page: LegalPage;
  relatedSlug: "terms" | "privacy";
  relatedLabel: string;
  icon: "file" | "shield";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const PAGE_ICON_MAP = {
  file:   <FileText className="h-7 w-7 text-white" aria-hidden />,
  shield: <Shield className="h-7 w-7 text-white" aria-hidden />,
};

const RELATED_ICON_MAP = {
  file:   <FileText className="h-4 w-4 shrink-0 text-amber-500" aria-hidden />,
  shield: <Shield className="h-4 w-4 shrink-0 text-amber-500" aria-hidden />,
};

export function LegalPageLayout({ page, relatedSlug, relatedLabel, icon }: LegalPageLayoutProps) {
  const relatedIcon = relatedSlug === "terms" ? "file" : "shield";

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Hero */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-gray-400 mb-6">
            <Link href="/" className="hover:text-gray-200 transition-colors">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-gray-200">{page.title}</span>
          </nav>

          <div className="flex items-start gap-5">
            <div className="shrink-0 w-14 h-14 rounded-2xl bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
              {PAGE_ICON_MAP[icon]}
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-2">
                {page.title}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  Last updated {formatDate(page.lastUpdated)}
                </span>
                <span className="flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5" />
                  Version {page.version}
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                  Effective {formatDate(page.effectiveDate)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-10 items-start">

          {/* Sidebar */}
          <aside className="lg:sticky lg:top-24 space-y-5">
            {/* TOC */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 shadow-sm">
              <TableOfContents sections={page.sections} />
            </div>

            {/* Related page */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3 px-1">
                Related
              </p>
              <Link
                href={`/${relatedSlug}`}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 group transition-colors"
              >
                <div className="shrink-0 w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                  {RELATED_ICON_MAP[relatedIcon]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors truncate">
                    {relatedLabel}
                  </p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500">Read now →</p>
                </div>
              </Link>
            </div>

            {/* Share */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3 px-1">
                Share
              </p>
              <button
                onClick={() => navigator.clipboard.writeText(window.location.href)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
              >
                <Share2 className="h-4 w-4" />
                Copy link
              </button>
            </div>
          </aside>

          {/* Main content */}
          <article className="min-w-0">
            {/* Intro card */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 sm:p-8 shadow-sm mb-6">
              <p className="text-[15px] text-gray-600 dark:text-gray-400 leading-relaxed">
                {page.introText}
              </p>
            </div>

            {/* Sections */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm divide-y divide-gray-100 dark:divide-gray-800 overflow-hidden">
              {page.sections
                .slice()
                .sort((a, b) => a.order - b.order)
                .map((section) => (
                  <div key={section.id} className="px-6 sm:px-8 py-7">
                    <LegalSection section={section} />
                  </div>
                ))}
            </div>

            {/* Footer CTA */}
            <div className="mt-8 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/40 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="text-base font-bold text-gray-900 dark:text-white mb-1">
                  Have questions about this policy?
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Our support team is available Mon–Sat, 9am–6pm IST.
                </p>
              </div>
              <a
                href="mailto:support@prakashsupermarket.co.uk"
                className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 transition-colors shadow-sm shadow-amber-500/20"
              >
                Contact Support
              </a>
            </div>
          </article>
        </div>
      </div>
    </main>
  );
}
