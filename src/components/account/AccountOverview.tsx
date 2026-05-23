"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CheckCircle, AlertTriangle, ChevronRight, ChevronUp,
  Package, Truck, Star, User, Shield, Gift,
  Leaf, Mail, Lock, Smartphone, ShoppingBag, BadgeCheck,
} from "lucide-react";
import { useAccountProfile } from "@/hooks/useAccountProfile";
import { formatPrice } from "@/lib/utils/format";
import type { Order, AccountProfile, AccountSetupStep } from "@/types";

// ── Circular progress SVG ──────────────────────────────────────────────────────
function CircularProgress({ percentage }: { percentage: number }) {
  const r = 30;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percentage / 100) * circ;
  return (
    <div className="relative w-[76px] h-[76px] shrink-0">
      <svg width="76" height="76" viewBox="0 0 76 76" className="-rotate-90" aria-hidden>
        <circle cx="38" cy="38" r={r} fill="none" stroke="#E5E7EB" strokeWidth="7" />
        <circle
          cx="38" cy="38" r={r} fill="none"
          stroke="#0F4C75" strokeWidth="7"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-black text-gray-900 dark:text-white">
        {percentage}%
      </span>
    </div>
  );
}

// ── Setup step card ────────────────────────────────────────────────────────────
function SetupStep({ step }: { step: AccountSetupStep }) {
  const completed = step.completed;
  return (
    <div className={`flex-1 min-w-[200px] rounded-xl p-4 border ${
      completed
        ? "bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800/40"
        : "bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/40"
    }`}>
      <div className="flex items-center gap-1.5 mb-1">
        {completed
          ? <CheckCircle className="h-3.5 w-3.5 text-green-600 dark:text-green-400 shrink-0" aria-hidden />
          : <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" aria-hidden />
        }
        <span className={`text-xs font-bold ${completed ? "text-green-700 dark:text-green-400" : "text-amber-700 dark:text-amber-400"}`}>
          {completed ? "Completed" : "To update"}
        </span>
      </div>
      <p className="text-sm font-semibold text-gray-800 dark:text-white leading-snug">{step.label}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{step.description}</p>
      <Link
        href={step.href}
        className={`text-xs font-semibold hover:underline mt-2 inline-block ${
          completed
            ? "text-green-700 dark:text-green-400"
            : "text-[#FCA311] dark:text-amber-400"
        }`}
      >
        {completed ? `Update ${step.label.toLowerCase()}` : step.linkLabel} &rsaquo;
      </Link>
    </div>
  );
}

// ── Account setup card ─────────────────────────────────────────────────────────
function AccountSetupCard({ profile }: { profile: AccountProfile }) {
  const storageKey = `setup-card-hidden-${profile._id}`;
  const [hidden, setHidden] = useState(
    () => typeof window !== "undefined" && localStorage.getItem(storageKey) === "1"
  );
  const { setupProgress } = profile;

  if (hidden || setupProgress.completedSteps === setupProgress.totalSteps) return null;

  function handleHide() {
    localStorage.setItem(storageKey, "1");
    setHidden(true);
  }

  return (
    <div className="bg-white dark:bg-gray-800/80 rounded-xl border border-[#0F4C75]/30 dark:border-[#0F4C75]/40 overflow-hidden">
      <div className="h-1 bg-gray-100 dark:bg-gray-700">
        <div className="h-full bg-[#0F4C75] transition-all duration-700" style={{ width: `${setupProgress.percentage}%` }} />
      </div>
      <div className="p-5">
        <div className="flex items-start gap-4">
          <CircularProgress percentage={setupProgress.percentage} />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white text-sm leading-tight">Account setup incomplete</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Here&rsquo;s how to complete your account setup.</p>
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 mt-0.5">
                  {setupProgress.completedSteps} of {setupProgress.totalSteps} completed
                </p>
              </div>
              <button
                onClick={handleHide}
                className="shrink-0 flex items-center gap-1 text-xs font-semibold text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 px-3 py-1.5 rounded-lg transition-colors"
                aria-label="Hide account setup"
              >
                Hide <ChevronUp className="h-3 w-3" aria-hidden />
              </button>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 mt-4">
          {setupProgress.steps.map((step) => <SetupStep key={step.key} step={step} />)}
        </div>
      </div>
    </div>
  );
}

// ── Orders section ─────────────────────────────────────────────────────────────
function OrdersCard({
  orders,
  ordersLoading,
  onSwitchTab,
}: {
  orders: Order[];
  ordersLoading: boolean;
  onSwitchTab: (tab: "orders" | "addresses") => void;
}) {
  const recent = orders[0];
  return (
    <div className="bg-white dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700/60 overflow-hidden">
      <div className="flex flex-col sm:flex-row">
        {/* Links column */}
        <div className="sm:w-56 shrink-0 p-5 border-b sm:border-b-0 sm:border-r border-gray-100 dark:border-gray-700/60">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
              <Package className="h-3.5 w-3.5 text-[#FCA311]" aria-hidden />
            </div>
            <h3 className="font-bold text-gray-900 dark:text-white text-sm">Orders</h3>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">View orders and manage your deliveries.</p>
          <nav className="space-y-1">
            {/* B2: replaced href="#orders" with button onClick */}
            <button
              onClick={() => onSwitchTab("orders")}
              className="block w-full text-left text-sm text-[#0F4C75] dark:text-blue-400 hover:underline py-0.5"
            >
              My orders
            </button>
            <span className="block text-sm text-gray-400 dark:text-gray-500 py-0.5 cursor-not-allowed" title="Coming soon">
              Payment wallet
            </span>
            <span className="flex items-center gap-1 text-sm text-gray-400 dark:text-gray-500 py-0.5 cursor-not-allowed" title="Coming soon">
              Delivery Pass
              <span className="text-[10px] font-bold bg-gray-300 dark:bg-gray-600 text-white px-1.5 py-0.5 rounded-full ml-1">Soon</span>
            </span>
          </nav>
        </div>

        {/* Status column */}
        <div className="flex-1 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-gray-900 dark:text-white">Order status</span>
            {/* B2: replaced href="#orders" with button onClick */}
            <button
              onClick={() => onSwitchTab("orders")}
              className="text-xs font-semibold text-[#0F4C75] dark:text-blue-400 hover:underline flex items-center gap-0.5"
            >
              View all <ChevronRight className="h-3 w-3" aria-hidden />
            </button>
          </div>

          {ordersLoading ? (
            <div className="animate-pulse h-16 bg-gray-100 dark:bg-gray-700/40 rounded-xl" />
          ) : recent ? (
            <Link
              href={`/account/orders/${recent.orderNumber}`}
              className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-700/50 hover:border-[#FCA311]/40 hover:bg-amber-50/30 transition-colors group"
            >
              <Truck className="h-8 w-8 text-gray-400 shrink-0" aria-hidden />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">{recent.orderNumber}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{recent.status}</p>
              </div>
              <span className="text-sm font-bold text-gray-900 dark:text-white">{formatPrice(recent.total)}</span>
              <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-[#FCA311] transition-colors" aria-hidden />
            </Link>
          ) : (
            <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-700/50">
              <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0">
                <ShoppingBag className="h-5 w-5 text-gray-400" aria-hidden />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">You haven&rsquo;t ordered anything yet</p>
                <Link href="/products" className="text-xs text-[#FCA311] hover:underline font-semibold">
                  Place an order now &rsaquo;
                </Link>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30">
            <div>
              <p className="text-sm font-bold text-[#0F4C75] dark:text-blue-300">Delivery Pass.</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Save on every delivery</p>
            </div>
            <span className="flex items-center gap-1 text-xs font-bold text-gray-400 dark:text-gray-500 cursor-not-allowed" title="Coming soon">
              Coming soon <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Rewards card ───────────────────────────────────────────────────────────────
function RewardsCard() {
  return (
    <div className="bg-white dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700/60 overflow-hidden">
      <div className="flex flex-col sm:flex-row">
        <div className="sm:w-44 shrink-0 p-5 border-b sm:border-b-0 sm:border-r border-gray-100 dark:border-gray-700/60">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-lg bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
              <Gift className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" aria-hidden />
            </div>
            <h3 className="font-bold text-gray-900 dark:text-white text-sm">Rewards</h3>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Earn points every time you shop.</p>
          <nav className="space-y-1">
            {["About Rewards", "Join Rewards", "Rewards Together"].map((label) => (
              <span key={label} className="block text-sm text-gray-400 dark:text-gray-500 py-0.5 cursor-not-allowed" title="Coming soon">
                {label}
              </span>
            ))}
          </nav>
        </div>
        <div className="flex-1 p-5 flex flex-col justify-between bg-gradient-to-br from-purple-50 to-white dark:from-purple-900/10 dark:to-gray-800/80">
          <div>
            <p className="text-sm font-bold text-gray-900 dark:text-white mb-1">Feel the power of Rewards</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Get exclusive Rewards Prices, collect points and save with our 100+ partners.
            </p>
          </div>
          <div className="flex items-center gap-3 mt-4">
            <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Star className="h-5 w-5 text-purple-600 dark:text-purple-400" aria-hidden />
            </div>
            {/* B9: disabled until rewards feature is built */}
            <button
              disabled
              className="flex items-center gap-1 px-4 py-2 border-2 border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500 text-xs font-bold rounded-full cursor-not-allowed opacity-60"
              title="Coming soon"
              aria-label="Join Rewards — coming soon"
            >
              Join now <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Details + Security ─────────────────────────────────────────────────────────
function DetailsAndSecurityCards({
  onSwitchTab,
  profile,
}: {
  onSwitchTab: (tab: "orders" | "addresses") => void;
  profile:     AccountProfile | null;
}) {
  const phoneVerified = profile?.isPhoneVerified;
  const hasPhone      = !!profile?.phone;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Details and preferences */}
      <div className="bg-white dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700/60 p-5">
        <div className="flex items-center gap-2 mb-2">
          <User className="h-4 w-4 text-gray-500 dark:text-gray-400 shrink-0" aria-hidden />
          <h3 className="font-bold text-gray-900 dark:text-white text-sm">Details and preferences</h3>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Manage your personal information, addresses and marketing.</p>
        <nav className="space-y-1">
          <Link href="/account/profile" className="block text-sm text-[#0F4C75] dark:text-blue-400 hover:underline py-0.5">
            Personal details
          </Link>
          <Link href="/account/preferences/marketing" className="block text-sm text-[#0F4C75] dark:text-blue-400 hover:underline py-0.5">
            Marketing preferences
          </Link>
          <Link href="/account/preferences/dietary" className="block text-sm text-[#0F4C75] dark:text-blue-400 hover:underline py-0.5">
            Dietary preferences
          </Link>
          <button
            onClick={() => onSwitchTab("addresses")}
            className="block w-full text-left text-sm text-[#0F4C75] dark:text-blue-400 hover:underline py-0.5"
          >
            Saved addresses
          </button>
        </nav>
      </div>

      {/* Security and password */}
      <div className="bg-white dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700/60 p-5">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="h-4 w-4 text-gray-500 dark:text-gray-400 shrink-0" aria-hidden />
          <h3 className="font-bold text-gray-900 dark:text-white text-sm">Security and password</h3>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Manage your account security and settings.</p>
        <nav className="space-y-1">
          <Link
            href="/account/security/change-password"
            className="flex items-center gap-2 text-sm text-[#0F4C75] dark:text-blue-400 hover:underline py-0.5"
          >
            <Lock className="h-3.5 w-3.5 text-gray-400 shrink-0" aria-hidden />
            Change password
          </Link>
          <Link
            href="/account/profile"
            className="flex items-center justify-between gap-2 py-0.5 group"
          >
            <span className="flex items-center gap-2 text-sm text-[#0F4C75] dark:text-blue-400 group-hover:underline">
              <Smartphone className="h-3.5 w-3.5 text-gray-400 shrink-0" aria-hidden />
              {hasPhone ? "Mobile number" : "Add mobile number"}
            </span>
            {hasPhone && (
              phoneVerified
                ? <span className="flex items-center gap-1 text-[10px] font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full">
                    <BadgeCheck className="h-3 w-3" aria-hidden /> Verified
                  </span>
                : <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">
                    <AlertTriangle className="h-3 w-3" aria-hidden /> Unverified
                  </span>
            )}
          </Link>
        </nav>
      </div>
    </div>
  );
}

// ── Promo section ──────────────────────────────────────────────────────────────
const PROMOS = [
  {
    title:     "Book a delivery slot",
    subtitle:  "Reserve a time for home delivery or click & collect.",
    href:      "#",
    bg:        "from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20",
    Icon:      Truck,
    iconBg:    "bg-blue-100 dark:bg-blue-800/40",
    iconColor: "text-[#0F4C75] dark:text-blue-400",
    cta:       "Book a slot",
  },
  {
    title:     "Earn rewards on every purchase",
    subtitle:  "Collect points and redeem for exclusive discounts.",
    href:      "#",
    bg:        "from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20",
    Icon:      Star,
    iconBg:    "bg-purple-100 dark:bg-purple-800/40",
    iconColor: "text-purple-600 dark:text-purple-400",
    cta:       "Join Rewards",
  },
  {
    title:     "Healthy eating made simple",
    subtitle:  "Browse our organic, vegan and dietary-friendly range.",
    href:      "/products",
    bg:        "from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20",
    Icon:      Leaf,
    iconBg:    "bg-green-100 dark:bg-green-800/40",
    iconColor: "text-green-600 dark:text-green-400",
    cta:       "Shop now",
  },
] as const;

function PromoSection() {
  return (
    <div className="bg-white dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700/60 p-5">
      <h3 className="font-bold text-gray-900 dark:text-white text-sm mb-4 text-center">
        Get the most from Prakash Supermarket
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {PROMOS.map(({ title, subtitle, href, bg, Icon, iconBg, iconColor, cta }) => (
          <Link
            key={title}
            href={href}
            className={`group bg-gradient-to-br ${bg} rounded-xl p-4 flex flex-col gap-3 hover:shadow-sm transition-shadow`}
          >
            <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center`}>
              <Icon className={`h-5 w-5 ${iconColor}`} aria-hidden />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-white leading-snug">{title}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>
            </div>
            <span className="mt-auto text-xs font-bold text-[#0F4C75] dark:text-blue-400 flex items-center gap-1 group-hover:underline">
              {cta} <ChevronRight className="h-3 w-3" aria-hidden />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ── Quick stats ────────────────────────────────────────────────────────────────
function QuickStats({ orders }: { orders: Order[] }) {
  const delivered  = orders.filter((o) => o.status === "delivered" || o.status === "completed").length;
  // B6: include all active in-progress statuses
  const inProgress = orders.filter((o) =>
    ["pending", "partially_confirmed", "processing", "shipped", "partially_delivered"].includes(o.status)
  ).length;
  return (
    <div className="grid grid-cols-3 gap-3">
      {[
        { label: "Total orders", value: orders.length, color: "text-[#FCA311]" },
        { label: "Delivered",    value: delivered,      color: "text-green-600 dark:text-green-400" },
        { label: "In progress",  value: inProgress,     color: "text-amber-600 dark:text-amber-400" },
      ].map(({ label, value, color }) => (
        <div key={label} className="bg-white dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700/60 p-3 text-center">
          <p className={`text-xl font-black ${color}`}>{value}</p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
        </div>
      ))}
    </div>
  );
}

// ── Skeleton loader ────────────────────────────────────────────────────────────
function ProfileSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-36 bg-gray-100 dark:bg-gray-700/40 rounded-xl" />
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────────────────
interface AccountOverviewProps {
  userName:      string;
  userEmail:     string;
  orders:        Order[];
  ordersLoading: boolean;
  onSwitchTab:   (tab: "orders" | "addresses") => void;
}

export default function AccountOverview({
  userName,
  userEmail,
  orders,
  ordersLoading,
  onSwitchTab,
}: AccountOverviewProps) {
  // B4: consume error state
  const { profile, loading: profileLoading, error: profileError, refresh: retryProfile } = useAccountProfile();
  const firstName = userName.split(" ")[0];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-black text-gray-900 dark:text-white">
          Hello {firstName},{" "}
          <span className="text-[#0F4C75] dark:text-blue-400">here&rsquo;s your account overview</span>
        </h1>
      </div>

      {/* Account setup progress — B4: show error state if fetch failed */}
      {profileLoading ? (
        <ProfileSkeleton />
      ) : profileError ? (
        <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/40 rounded-xl p-4 flex items-center justify-between gap-3">
          <p className="text-sm text-red-600 dark:text-red-400">{profileError}</p>
          <button
            onClick={retryProfile}
            className="shrink-0 text-xs font-semibold text-red-600 dark:text-red-400 hover:underline"
          >
            Retry
          </button>
        </div>
      ) : profile ? (
        <AccountSetupCard profile={profile} />
      ) : null}

      {/* Email banner */}
      <div className="bg-gradient-to-r from-[#0F4C75] to-[#1a6fa5] rounded-xl p-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
          <Mail className="h-4 w-4 text-white" aria-hidden />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-white/70">Account email</p>
          <p className="text-sm font-bold text-white truncate">{userEmail}</p>
        </div>
      </div>

      {/* Quick stats — only show once orders are loaded */}
      {!ordersLoading && <QuickStats orders={orders} />}

      {/* Orders section */}
      <OrdersCard orders={orders} ordersLoading={ordersLoading} onSwitchTab={onSwitchTab} />

      {/* Rewards — B3: full-width row, no longer sharing a column with Details/Security */}
      <RewardsCard />

      {/* Details and Security — B3: own full-width row, inner sm:grid-cols-2 has full space */}
      <DetailsAndSecurityCards onSwitchTab={onSwitchTab} profile={profile} />

      {/* Promo section */}
      <PromoSection />
    </div>
  );
}
