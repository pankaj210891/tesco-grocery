"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Package, ShoppingBag, Users, Store, TrendingUp, ArrowRight } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import StatsCard from "@/components/admin/StatsCard";

interface DashStats {
  totalProducts:    number;
  totalOrders:      number;
  pendingOrders:    number;
  processingOrders: number;
  totalUsers:       number;
  totalVendors:     number;
  totalRevenue:     number;
  recentOrders:     Array<{
    _id: string; orderNumber: string;
    delivery: { fullName: string };
    total: number; status: string; createdAt: string;
  }>;
  lowStock: Array<{ _id: string; name: string; category: string }>;
}

const STATUS_COLORS: Record<string, string> = {
  pending:    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  processing: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  shipped:    "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  delivered:  "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  cancelled:  "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

export default function AdminDashboard() {
  const { user, token } = useAuthStore();
  const router = useRouter();
  const [stats, setStats] = useState<DashStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    if (user.role !== "admin") { router.push("/"); return; }

    fetch("/api/admin/stats", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json() as Promise<{ success: boolean; data: DashStats }>)
      .then((j) => { if (j.success) setStats(j.data); })
      .finally(() => setLoading(false));
  }, [user, token, router]);

  if (loading || !stats) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded-lg" />
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 dark:bg-gray-800 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Welcome back, {user?.name}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatsCard label="Products"  value={stats.totalProducts} icon={Package}     color="blue"   href="/admin/products" />
        <StatsCard label="Orders"    value={stats.totalOrders}   icon={ShoppingBag} color="green"  sub={`${stats.pendingOrders} pending`} href="/admin/orders" />
        <StatsCard label="Users"     value={stats.totalUsers}    icon={Users}       color="purple" href="/admin/users" />
        <StatsCard label="Vendors"   value={stats.totalVendors}  icon={Store}       color="orange" href="/admin/vendors" />
        <StatsCard label="Revenue"   value={`£${stats.totalRevenue.toFixed(2)}`} icon={TrendingUp} color="red" />
      </div>

      {/* Quick Navigation */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Manage</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { href: "/admin/products", icon: Package,     color: "text-blue-600 dark:text-blue-400",   bg: "bg-blue-50 dark:bg-blue-950/40",   title: "Products",  desc: "Add, edit, or remove products and manage inventory" },
            { href: "/admin/orders",   icon: ShoppingBag, color: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-950/40", title: "Orders",    desc: "View all customer orders and update their status" },
            { href: "/admin/users",    icon: Users,       color: "text-purple-600 dark:text-purple-400",bg: "bg-purple-50 dark:bg-purple-950/40",title: "Users",   desc: "Manage customer accounts, roles, and access" },
            { href: "/admin/vendors",  icon: Store,       color: "text-orange-600 dark:text-orange-400",bg: "bg-orange-50 dark:bg-orange-950/40",title: "Vendors", desc: "Approve and manage vendor stores and accounts" },
          ].map(({ href, icon: Icon, color, bg, title, desc }) => (
            <Link key={href} href={href}
              className="group flex items-start gap-4 p-5 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm transition-all"
            >
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${bg}`}>
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 dark:text-gray-100 text-sm">{title}</p>
                <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{desc}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-300 dark:text-gray-600 group-hover:text-gray-500 dark:group-hover:text-gray-400 group-hover:translate-x-0.5 transition-all shrink-0 mt-0.5" />
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <div className="xl:col-span-2 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <h2 className="font-bold text-gray-900 dark:text-gray-100 text-sm">Recent Orders</h2>
            <Link href="/admin/orders" className="text-xs font-semibold text-[#0F4C75] hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {stats.recentOrders.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-gray-400">No orders yet</p>
            ) : stats.recentOrders.map((order) => (
              <div key={order._id} className="px-5 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">#{order.orderNumber}</p>
                  <p className="text-xs text-gray-400 truncate">{order.delivery.fullName}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[order.status] ?? ""}`}>
                    {order.status}
                  </span>
                  <span className="text-sm font-bold text-gray-900 dark:text-gray-100">£{order.total.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Out of Stock */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <h2 className="font-bold text-gray-900 dark:text-gray-100 text-sm">Out of Stock</h2>
            <Link href="/admin/products" className="text-xs font-semibold text-[#0F4C75] hover:underline">Manage</Link>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {stats.lowStock.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-gray-400">All products in stock</p>
            ) : stats.lowStock.map((p) => (
              <div key={p._id} className="px-5 py-3">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{p.name}</p>
                <p className="text-xs text-gray-400">{p.category}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
