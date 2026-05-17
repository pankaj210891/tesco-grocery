"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ChevronRight, ExternalLink } from "lucide-react";
import axios from "axios";
import { cn } from "@/lib/utils/cn";
import MiniBannerCard from "@/components/ui/MiniBannerCard";
import type { CategoryNode, Offer } from "@/types";
import { useScrollLock } from "@/hooks/useScrollLock";

const AMBER = "#FCA311";

const INNER_ANIM_CSS = `
  @keyframes deptColSlideIn {
    from { opacity: 0; transform: translateX(-14px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes deptContentFade {
    from { opacity: 0; transform: translateX(8px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  .dept-col-enter     { animation: deptColSlideIn  0.22s cubic-bezier(0.22,1,0.36,1) both; }
  .dept-content-enter { animation: deptContentFade 0.18s ease-out both; }
`;

const BANNER_PALETTE = [
  { bg: "from-orange-50 to-amber-100 dark:from-orange-950/40 dark:to-amber-900/30",   textColor: "text-orange-900 dark:text-orange-300",  btnColor: "text-orange-700 dark:text-orange-400"  },
  { bg: "from-green-50 to-emerald-100 dark:from-green-950/40 dark:to-emerald-900/30", textColor: "text-green-800 dark:text-green-300",    btnColor: "text-green-700 dark:text-green-400"    },
  { bg: "from-purple-50 to-violet-100 dark:from-purple-950/40 dark:to-violet-900/30", textColor: "text-purple-900 dark:text-purple-300",  btnColor: "text-purple-700 dark:text-purple-400"  },
  { bg: "from-blue-50 to-sky-100 dark:from-blue-950/40 dark:to-sky-900/30",           textColor: "text-blue-900 dark:text-blue-300",      btnColor: "text-blue-700 dark:text-blue-400"      },
  { bg: "from-rose-50 to-pink-100 dark:from-rose-950/40 dark:to-pink-900/30",         textColor: "text-rose-900 dark:text-rose-300",      btnColor: "text-rose-700 dark:text-rose-400"      },
  { bg: "from-teal-50 to-cyan-100 dark:from-teal-950/40 dark:to-cyan-900/30",         textColor: "text-teal-900 dark:text-teal-300",      btnColor: "text-teal-700 dark:text-teal-400"      },
  { bg: "from-amber-50 to-yellow-100 dark:from-amber-950/40 dark:to-yellow-900/30",   textColor: "text-amber-900 dark:text-amber-300",    btnColor: "text-amber-700 dark:text-amber-400"    },
];

function BannerSkeleton() {
  return <div className="min-h-[110px] rounded-2xl animate-pulse bg-gray-100 dark:bg-gray-800" />;
}

function OffersPanel({ offers, offersLoading, onClose }: { offers: Offer[]; offersLoading: boolean; onClose: () => void }) {
  return (
    <div
      className="dept-content-enter flex-1 min-w-0 max-w-[33.33%] overflow-y-auto py-4 px-4 lg:px-5 space-y-3"
      data-testid="dept-banners-panel"
    >
      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 px-0.5">
        Offers &amp; Promotions
      </p>
      {offersLoading ? (
        <><BannerSkeleton /><BannerSkeleton /></>
      ) : offers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <span className="text-4xl mb-3">🏷️</span>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No current offers</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Check back soon for great deals</p>
          <Link href="/offers" onClick={onClose} className="mt-4 text-xs font-bold hover:underline" style={{ color: AMBER }}>
            Browse all promotions →
          </Link>
        </div>
      ) : (
        offers.map((offer, i) => {
          const palette = BANNER_PALETTE[i % BANNER_PALETTE.length];
          const label =
            offer.discountType === "percentage" ? `${offer.discountValue}% Off`
            : offer.discountType === "fixed"    ? `₹${offer.discountValue} Off`
            : "Free Delivery";
          return (
            <MiniBannerCard
              key={offer._id}
              href={offer.href}
              label={label}
              title={offer.title}
              cta="Shop Now"
              code={offer.code}
              emoji={offer.emoji ?? "🎉"}
              bg={palette.bg}
              textColor={palette.textColor}
              btnColor={palette.btnColor}
              onClick={onClose}
              data-testid="dept-mini-banner"
            />
          );
        })
      )}
    </div>
  );
}

function SkeletonRow({ wide = false }: { wide?: boolean }) {
  return (
    <div className={cn("px-4 py-2.5 flex items-center gap-3", wide && "px-5")}>
      <div className="w-4 h-4 rounded bg-gray-100 dark:bg-gray-800 animate-pulse shrink-0" />
      <div className={cn("h-3 rounded bg-gray-100 dark:bg-gray-800 animate-pulse", wide ? "w-36" : "w-28")} />
    </div>
  );
}

function DeptRow({
  node, active, onExpand, onNavigate,
}: { node: CategoryNode; active: boolean; onExpand: () => void; onNavigate: () => void }) {
  const hasChildren = node.children.length > 0;

  function handleClick(e: React.MouseEvent) {
    if (hasChildren) { e.preventDefault(); onExpand(); }
    else { onNavigate(); }
  }

  return (
    <li>
      <Link
        href={`/products?category=${node.slug}`}
        onClick={handleClick}
        data-testid="dept-row"
        className={cn(
          "flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium border-l-2 transition-colors duration-100",
          active
            ? "border-[#FCA311] bg-amber-50 dark:bg-amber-950/20 text-[#FCA311] font-semibold"
            : "border-transparent text-gray-700 dark:text-gray-300 hover:border-[#FCA311] hover:bg-amber-50 dark:hover:bg-amber-950/20 hover:text-[#FCA311]",
        )}
      >
        <span className="text-[15px] shrink-0 leading-none">{node.emoji}</span>
        <span className="flex-1 truncate">{node.name}</span>
        {hasChildren && (
          <ChevronRight className={cn("h-3.5 w-3.5 shrink-0", active ? "text-[#FCA311]" : "text-gray-300 dark:text-gray-600")} />
        )}
      </Link>
    </li>
  );
}

function SubDeptRow({
  node, active, onExpand, onNavigate,
}: { node: CategoryNode; active: boolean; onExpand: () => void; onNavigate: () => void }) {
  const hasChildren = node.children.length > 0;

  function handleClick(e: React.MouseEvent) {
    if (hasChildren) { e.preventDefault(); onExpand(); }
    else { onNavigate(); }
  }

  return (
    <li>
      <Link
        href={`/products?category=${node.slug}`}
        onClick={handleClick}
        data-testid="dept-subdept-row"
        className={cn(
          "flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium border-l-2 transition-colors duration-100",
          active
            ? "border-[#FCA311] bg-amber-50 dark:bg-amber-950/20 text-[#FCA311] font-semibold"
            : "border-transparent text-gray-600 dark:text-gray-400 hover:border-[#FCA311] hover:bg-amber-50 dark:hover:bg-amber-950/20 hover:text-[#FCA311]",
        )}
      >
        <span className="text-[13px] shrink-0 leading-none">{node.emoji}</span>
        <span className="flex-1 truncate">{node.name}</span>
        {hasChildren && (
          <ChevronRight className={cn("h-3 w-3 shrink-0", active ? "text-[#FCA311]" : "text-gray-300 dark:text-gray-600")} />
        )}
      </Link>
    </li>
  );
}

function SubSubList({ parent: parentNode, items, onClose }: { parent: CategoryNode; items: CategoryNode[]; onClose: () => void }) {
  if (items.length === 0) {
    return (
      <div className="dept-content-enter flex flex-col items-center justify-center h-full gap-3 text-center px-6">
        <span className="text-3xl">{parentNode.emoji}</span>
        <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">{parentNode.name}</p>
        <Link href={`/products?category=${parentNode.slug}`} onClick={onClose} className="text-xs font-bold hover:underline" style={{ color: AMBER }}>
          Browse all {parentNode.name} →
        </Link>
      </div>
    );
  }

  return (
    <div className="dept-content-enter h-full flex flex-col overflow-hidden">
      <ul className="flex-1 overflow-y-auto py-1.5" role="list" data-testid="dept-subsubdept-grid">
        {items.map((sub) => (
          <li key={sub._id}>
            <Link
              href={`/products?category=${sub.slug}`}
              onClick={onClose}
              data-testid="dept-subsubdept-item"
              className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-600 dark:text-gray-400 hover:text-[#FCA311] hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-colors duration-100"
            >
              <span className="text-[13px] shrink-0 leading-none">{sub.emoji}</span>
              <span className="truncate">{sub.name}</span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="shrink-0 border-t border-gray-100 dark:border-gray-800 p-3">
        <Link
          href={`/products?category=${parentNode.slug}`}
          onClick={onClose}
          className="flex items-center justify-center gap-1.5 w-full py-2 text-xs font-bold rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-colors"
          style={{ color: AMBER }}
        >
          See all {parentNode.name} <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

interface Props {
  isOpen:  boolean;
  onClose: () => void;
}

export default function DepartmentMegaPanel({ isOpen, onClose }: Props) {
  const [shouldRender, setShouldRender] = useState(false);
  const [visible,      setVisible]      = useState(false);

  const [tree,         setTree]         = useState<CategoryNode[]>([]);
  const [treeLoading,  setTreeLoading]  = useState(false);
  const [treeLoaded,   setTreeLoaded]   = useState(false);

  const [offers,        setOffers]        = useState<Offer[]>([]);
  const [offersLoading, setOffersLoading] = useState(false);
  const [offersLoaded,  setOffersLoaded]  = useState(false);

  // null = nothing selected
  const [activeDepIdx, setActiveDepIdx] = useState<number | null>(null);
  const [activeSubIdx, setActiveSubIdx] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShouldRender(true);
      let raf2: number;
      const raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => setVisible(true));
      });
      return () => { cancelAnimationFrame(raf1); cancelAnimationFrame(raf2!); };
    } else {
      setVisible(false);
      setActiveDepIdx(null);
      setActiveSubIdx(null);
      const t = setTimeout(() => setShouldRender(false), 220);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || treeLoaded) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTreeLoading(true);
    axios
      .get<{ success: boolean; data: CategoryNode[] }>("/api/categories/tree")
      .then(({ data }) => setTree(data.data ?? []))
      .catch(() => setTree([]))
      .finally(() => { setTreeLoading(false); setTreeLoaded(true); });
  }, [isOpen, treeLoaded]);

  useEffect(() => {
    if (!isOpen || offersLoaded) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOffersLoading(true);
    axios
      .get<{ success: boolean; data: Offer[] }>("/api/offers")
      .then(({ data }) => {
        const all = data.data ?? [];
        const shuffled = [...all].sort(() => Math.random() - 0.5);
        setOffers(shuffled.slice(0, 2));
      })
      .catch(() => setOffers([]))
      .finally(() => { setOffersLoading(false); setOffersLoaded(true); });
  }, [isOpen, offersLoaded]);

  const handleClose = useCallback(() => onClose(), [onClose]);
  useScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") handleClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, handleClose]);

  const activeDept      = activeDepIdx !== null ? (tree[activeDepIdx] ?? null) : null;
  const subDepts        = activeDept?.children ?? [];
  const activeSub       = activeSubIdx !== null ? (subDepts[activeSubIdx] ?? null) : null;
  const subSubItems     = activeSub?.children ?? [];
  const showSubDeptCol  = activeDept !== null && subDepts.length > 0;
  const showSubSubDepts = activeSub !== null && subSubItems.length > 0;

  // Key changes when switching right-panel content so CSS enter animation replays
  const rightPanelKey = showSubSubDepts ? `subsubdept-${activeDepIdx}-${activeSubIdx}` : "offers";

  const PANEL_MAX_H = "calc(100dvh - 108px)";

  if (!shouldRender) return null;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: INNER_ANIM_CSS }} />

      <div
        data-testid="dept-mega-panel"
        className={cn(
          "absolute top-full left-0 right-0 z-50",
          "transition-[opacity,transform] duration-[220ms] ease-out",
          visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-3 pointer-events-none",
        )}
        role="dialog"
        aria-label="Shop by department"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            className="bg-white dark:bg-gray-900 shadow-2xl border-t-2 border-[#FCA311] flex overflow-hidden"
            style={{ maxHeight: PANEL_MAX_H }}
          >

            {/* Col 1: Departments — flex-1 capped at 1/3 */}
            <div
              className="flex-1 min-w-0 max-w-[33.33%] border-r border-gray-100 dark:border-gray-800 flex flex-col"
              data-testid="dept-category-list"
            >
              <ul className="flex-1 overflow-y-auto py-1.5" role="list">
                {treeLoading
                  ? Array.from({ length: 10 }).map((_, i) => <SkeletonRow key={i} />)
                  : tree.map((dept, i) => (
                      <DeptRow
                        key={dept._id}
                        node={dept}
                        active={i === activeDepIdx}
                        onExpand={() => {
                          setActiveDepIdx(i === activeDepIdx ? null : i);
                          setActiveSubIdx(null);
                        }}
                        onNavigate={handleClose}
                      />
                    ))}
              </ul>
              <div className="shrink-0 border-t border-gray-100 dark:border-gray-800 p-3">
                <Link
                  href="/categories"
                  onClick={handleClose}
                  className="flex items-center justify-center gap-1.5 w-full py-2 text-xs font-bold rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-colors"
                  style={{ color: AMBER }}
                >
                  View All Departments <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            </div>

            {/* Col 2: Sub-departments — visible only when a dept with children is selected */}
            {showSubDeptCol && (
              <div
                className="dept-col-enter flex-1 min-w-0 max-w-[33.33%] border-r border-gray-100 dark:border-gray-800 flex flex-col overflow-hidden"
                data-testid="dept-subdept-list"
                key={`subdept-col-${activeDepIdx}`}
              >
                <ul className="py-1.5 flex-1 overflow-y-auto" role="list">
                  {subDepts.map((sub, i) => (
                    <SubDeptRow
                      key={sub._id}
                      node={sub}
                      active={i === activeSubIdx}
                      onExpand={() => setActiveSubIdx(i === activeSubIdx ? null : i)}
                      onNavigate={handleClose}
                    />
                  ))}
                </ul>
                <div className="shrink-0 border-t border-gray-100 dark:border-gray-800 p-3">
                  <Link
                    href={`/products?category=${activeDept!.slug}`}
                    onClick={handleClose}
                    className="flex items-center justify-center gap-1.5 w-full py-2 text-xs font-bold rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-colors"
                    style={{ color: AMBER }}
                  >
                    See all {activeDept!.name} <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            )}

            {/* Right panel: Sub-sub-depts when sub selected, otherwise Offers */}
            {showSubSubDepts ? (
              <div
                className="flex-1 min-w-0 max-w-[33.33%] overflow-hidden"
                data-testid="dept-subsubdept-panel"
                key={rightPanelKey}
              >
                <SubSubList parent={activeSub!} items={subSubItems} onClose={handleClose} />
              </div>
            ) : (
              <OffersPanel
                key={rightPanelKey}
                offers={offers}
                offersLoading={offersLoading}
                onClose={handleClose}
              />
            )}

          </div>
        </div>
      </div>
    </>
  );
}
