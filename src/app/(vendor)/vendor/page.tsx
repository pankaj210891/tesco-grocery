"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Package, ShoppingBag, CheckCircle, XCircle, ArrowRight, AlertTriangle, TrendingUp, IndianRupee, BarChart2 } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { authClient } from "@/lib/axios";
import type { ApiResponse } from "@/lib/axios";
import StatsCard from "@/components/admin/StatsCard";
import type { Vendor, VendorAnalytics } from "@/types";
import dynamic from "next/dynamic";
import { VENDOR_TOUR_STEPS } from "@/components/onboarding/vendorTourSteps";

const OnboardingTour = dynamic(
  () => import("@/components/onboarding/OnboardingTour"),
  { ssr: false }
);

interface VendorStats {
  totalProducts:      number;
  inStockProducts:    number;
  outOfStockProducts: number;
  totalOrders:        number;
  pendingOrders:      number;
}

export default function VendorDashboard() {
  const { user, token } = useAuthStore();
  const router = useRouter();
  const [stats, setStats]         = useState<VendorStats | null>(null);
  const [profile, setProfile]     = useState<Vendor | null>(null);
  const [analytics, setAnalytics] = useState<VendorAnalytics | null>(null);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    if (!user)                                          { router.push("/login"); return; }
    if (user.role !== "vendor" && user.role !== "admin") { router.push("/");     return; }

    const client = authClient(token ?? "");
    Promise.allSettled([
      client.get<ApiResponse<VendorStats>>("/api/vendor/stats"),
      client.get<ApiResponse<Vendor>>("/api/vendor/profile"),
      client.get<ApiResponse<VendorAnalytics>>("/api/vendor/analytics"),
    ]).then(([statsResult, profileResult, analyticsResult]) => {
      if (statsResult.status    === "fulfilled") setStats(statsResult.value.data.data as VendorStats);
      if (profileResult.status  === "fulfilled") setProfile(profileResult.value.data.data as Vendor);
      if (analyticsResult.status === "fulfilled") setAnalytics(analyticsResult.value.data.data as VendorAnalytics);
    }).finally(() => setLoading(false));
  }, [user, token, router]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded-lg" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 bg-gray-200 dark:bg-gray-800 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <OnboardingTour tourKey="vendor-dashboard-v1" steps={VENDOR_TOUR_STEPS} />
      <div>
        <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100">Vendor Dashboard</h1>
        {profile && (
          <p className="text-sm text-gray-500 mt-0.5">
            {profile.name} ·{" "}
            <span className={`font-semibold ${profile.status === "active" ? "text-green-600" : "text-yellow-600"}`}>
              {profile.status}
            </span>
          </p>
        )}
      </div>

      {/* Core Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" data-testid="vendor-stats-grid">
          <StatsCard label="Total Products"  value={stats.totalProducts}      icon={Package}     color="blue"   href="/vendor/products" />
          <StatsCard label="In Stock"        value={stats.inStockProducts}    icon={CheckCircle} color="green"  href="/vendor/products?inStock=true" />
          <StatsCard label="Out of Stock"    value={stats.outOfStockProducts} icon={XCircle}     color="red"    href="/vendor/products?inStock=false" />
          <StatsCard label="Orders"          value={stats.totalOrders}        icon={ShoppingBag} color="purple" href="/vendor/orders"
            sub={stats.pendingOrders > 0 ? `${stats.pendingOrders} pending` : undefined} />
        </div>
      )}

      {/* Earnings Analytics */}
      {analytics && (
        <div className="flex items-center justify-between mb-0">
          <span className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Overview</span>
          <Link href="/vendor/analytics" className="flex items-center gap-1 text-xs text-[#FCA311] hover:text-[#E8920A] font-semibold transition-colors">
            <BarChart2 className="h-3.5 w-3.5" /> Full Analytics
          </Link>
        </div>
      )}
      {analytics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-9 w-9 rounded-lg bg-green-50 dark:bg-green-950/40 flex items-center justify-center">
                <IndianRupee className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Total Revenue</p>
            </div>
            <p className="text-2xl font-black text-gray-900 dark:text-gray-100" data-testid="vendor-total-revenue">
              ₹{analytics.totalRevenue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-9 w-9 rounded-lg bg-purple-50 dark:bg-purple-950/40 flex items-center justify-center">
                <ShoppingBag className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Total Orders</p>
            </div>
            <p className="text-2xl font-black text-gray-900 dark:text-gray-100" data-testid="vendor-total-orders">
              {analytics.totalOrders}
            </p>
            {analytics.pendingOrders > 0 && (
              <p className="text-xs text-yellow-600 font-medium mt-1">{analytics.pendingOrders} pending</p>
            )}
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-9 w-9 rounded-lg bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Avg. Order Value</p>
            </div>
            <p className="text-2xl font-black text-gray-900 dark:text-gray-100">
              ₹{analytics.totalOrders > 0 ? Math.round(analytics.totalRevenue / analytics.totalOrders).toLocaleString("en-IN") : 0}
            </p>
          </div>
        </div>
      )}

      {/* Top Products */}
      {analytics && analytics.topProducts.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
            <h2 className="font-bold text-gray-900 dark:text-gray-100 text-sm">Top Products by Revenue</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="vendor-top-products">
              <thead className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-800">
                <tr>
                  {["Product", "Units Sold", "Revenue"].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {analytics.topProducts.map((p) => (
                  <tr key={p.slug} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                    <td className="px-5 py-3 font-medium text-gray-900 dark:text-gray-100">{p.name}</td>
                    <td className="px-5 py-3 text-gray-600 dark:text-gray-400">{p.quantity}</td>
                    <td className="px-5 py-3 font-bold text-gray-900 dark:text-gray-100">
                      ₹{p.revenue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quick Navigation */}
      <div data-testid="vendor-quick-nav">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Manage</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link href="/vendor/products"
            className="group flex items-start gap-4 p-5 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm transition-colors"
          >
            <div className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0 bg-blue-50 dark:bg-blue-950/40">
              <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900 dark:text-gray-100 text-sm">Products</p>
              <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">Add, edit, or remove your products and manage stock levels</p>
              {stats && stats.outOfStockProducts > 0 && (
                <Link
                  href="/vendor/products?inStock=false"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1 text-xs text-red-500 font-medium mt-1.5 hover:underline w-fit"
                >
                  <AlertTriangle className="h-3 w-3" /> {stats.outOfStockProducts} out of stock
                </Link>
              )}
            </div>
            <ArrowRight className="h-4 w-4 text-gray-300 dark:text-gray-600 group-hover:text-gray-500 group-hover:translate-x-0.5 transition-all shrink-0 mt-0.5" />
          </Link>

          <Link href="/vendor/orders"
            className="group flex items-start gap-4 p-5 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm transition-colors"
          >
            <div className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0 bg-purple-50 dark:bg-purple-950/40">
              <ShoppingBag className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900 dark:text-gray-100 text-sm">Orders</p>
              <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">View and update shipment status for your orders</p>
              {stats && stats.pendingOrders > 0 && (
                <p className="flex items-center gap-1 text-xs text-yellow-600 font-medium mt-1.5">
                  <AlertTriangle className="h-3 w-3" /> {stats.pendingOrders} pending
                </p>
              )}
            </div>
            <ArrowRight className="h-4 w-4 text-gray-300 dark:text-gray-600 group-hover:text-gray-500 group-hover:translate-x-0.5 transition-all shrink-0 mt-0.5" />
          </Link>
        </div>
      </div>

      {/* Profile */}
      {profile && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-6" data-testid="vendor-profile-card">
          <h2 className="font-bold text-gray-900 dark:text-gray-100 mb-4 text-sm">Vendor Profile</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            {[
              ["Business Name", profile.name],
              ["Email",         profile.email],
              ["Phone",         profile.phone   || "—"],
              ["City",          profile.city    || "—"],
              ["Address",       profile.address || "—"],
              ["Status",        profile.status],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-xs text-gray-400 uppercase font-semibold">{label}</p>
                <p className="text-gray-900 dark:text-gray-100 font-medium mt-0.5">{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
