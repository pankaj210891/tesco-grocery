"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Package, ShoppingBag, CheckCircle, XCircle, ArrowRight, AlertTriangle } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import StatsCard from "@/components/admin/StatsCard";
import type { Vendor } from "@/types";

interface VendorStats {
  totalProducts:     number;
  inStockProducts:   number;
  outOfStockProducts: number;
  totalOrders:       number;
  pendingOrders:     number;
}

export default function VendorDashboard() {
  const { user, token } = useAuthStore();
  const router = useRouter();
  const [stats, setStats]     = useState<VendorStats | null>(null);
  const [profile, setProfile] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    if (user.role !== "vendor" && user.role !== "admin") { router.push("/"); return; }

    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch("/api/vendor/stats",   { headers }).then((r) => r.json() as Promise<{ success: boolean; data: VendorStats }>),
      fetch("/api/vendor/profile", { headers }).then((r) => r.json() as Promise<{ success: boolean; data: Vendor }>),
    ]).then(([statsRes, profileRes]) => {
      if (statsRes.success)   setStats(statsRes.data);
      if (profileRes.success) setProfile(profileRes.data);
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

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard label="Total Products"  value={stats.totalProducts}      icon={Package}     color="blue"   href="/vendor/products" />
          <StatsCard label="In Stock"        value={stats.inStockProducts}    icon={CheckCircle} color="green"  href="/vendor/products" />
          <StatsCard label="Out of Stock"    value={stats.outOfStockProducts} icon={XCircle}     color="red"    href="/vendor/products" />
          <StatsCard label="Orders"          value={stats.totalOrders}        icon={ShoppingBag} color="purple" href="/vendor/orders"   sub={stats.pendingOrders > 0 ? `${stats.pendingOrders} pending` : undefined} />
        </div>
      )}

      {/* Quick Navigation */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Manage</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link href="/vendor/products"
            className="group flex items-start gap-4 p-5 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm transition-colors transition-shadow"
          >
            <div className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0 bg-blue-50 dark:bg-blue-950/40">
              <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900 dark:text-gray-100 text-sm">Products</p>
              <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">Add, edit, or remove your products and manage stock levels</p>
              {stats && stats.outOfStockProducts > 0 && (
                <p className="flex items-center gap-1 text-xs text-red-500 font-medium mt-1.5">
                  <AlertTriangle className="h-3 w-3" /> {stats.outOfStockProducts} out of stock
                </p>
              )}
            </div>
            <ArrowRight className="h-4 w-4 text-gray-300 dark:text-gray-600 group-hover:text-gray-500 dark:group-hover:text-gray-400 group-hover:translate-x-0.5 transition-colors transition-transform shrink-0 mt-0.5" />
          </Link>

          <Link href="/vendor/orders"
            className="group flex items-start gap-4 p-5 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm transition-colors transition-shadow"
          >
            <div className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0 bg-purple-50 dark:bg-purple-950/40">
              <ShoppingBag className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900 dark:text-gray-100 text-sm">Orders</p>
              <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">View and track orders containing your products</p>
              {stats && stats.pendingOrders > 0 && (
                <p className="flex items-center gap-1 text-xs text-yellow-600 font-medium mt-1.5">
                  <AlertTriangle className="h-3 w-3" /> {stats.pendingOrders} pending
                </p>
              )}
            </div>
            <ArrowRight className="h-4 w-4 text-gray-300 dark:text-gray-600 group-hover:text-gray-500 dark:group-hover:text-gray-400 group-hover:translate-x-0.5 transition-colors transition-transform shrink-0 mt-0.5" />
          </Link>
        </div>
      </div>

      {/* Profile */}
      {profile && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-6">
          <h2 className="font-bold text-gray-900 dark:text-gray-100 mb-4 text-sm">Vendor Profile</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            {[
              ["Business Name", profile.name],
              ["Email",        profile.email],
              ["Phone",        profile.phone   || "—"],
              ["City",         profile.city    || "—"],
              ["Address",      profile.address || "—"],
              ["Status",       profile.status],
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
