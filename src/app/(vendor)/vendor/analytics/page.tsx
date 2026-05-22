"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { IndianRupee, ShoppingBag, Package, TrendingUp, Clock, BarChart2 } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { authClient } from "@/lib/axios";
import type { ApiResponse } from "@/lib/axios";
import { useTheme } from "@/components/providers/ThemeProvider";
import { formatPrice } from "@/lib/utils/format";
import type { VendorAnalytics } from "@/types";

// Lazy-load recharts — it requires browser APIs, cannot SSR
const BarChart = dynamic(() => import("recharts").then((m) => m.BarChart), { ssr: false });
const Bar = dynamic(() => import("recharts").then((m) => m.Bar), { ssr: false });
const XAxis = dynamic(() => import("recharts").then((m) => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then((m) => m.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import("recharts").then((m) => m.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then((m) => m.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(
  () => import("recharts").then((m) => m.ResponsiveContainer), { ssr: false }
);
const Cell = dynamic(() => import("recharts").then((m) => m.Cell), { ssr: false });

const AMBER  = "#FCA311";
const NAVY   = "#0F4C75";
const AMBER2 = "#E8920A";

// "2025-01" → "Jan '25"
function fmtMonth(ym: string): string {
  return new Date(ym + "-01").toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
}

function ChartSkeleton() {
  return (
    <div className="h-64 flex items-center justify-center">
      <div className="h-8 w-8 border-4 border-[#0F4C75]/30 border-t-[#0F4C75] rounded-full animate-spin" />
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  sub?: string;
}

function StatCard({ label, value, icon: Icon, iconBg, iconColor, sub }: StatCardProps) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5">
      <div className="flex items-center gap-3 mb-2">
        <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${iconBg}`}>
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </div>
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</p>
      </div>
      <p className="text-2xl font-black text-gray-900 dark:text-gray-100">{value}</p>
      {sub && <p className="text-xs text-yellow-600 dark:text-yellow-400 font-medium mt-1">{sub}</p>}
    </div>
  );
}

export default function VendorAnalyticsPage() {
  const { user, token } = useAuthStore();
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const gridColor    = isDark ? "#374151" : "#E5E7EB";
  const tickColor    = isDark ? "#9CA3AF" : "#6B7280";
  const tooltipStyle = {
    backgroundColor: isDark ? "#1F2937" : "#ffffff",
    border:          `1px solid ${isDark ? "#374151" : "#E5E7EB"}`,
    borderRadius:    8,
    color:           isDark ? "#F9FAFB" : "#111827",
    fontSize:        12,
  };

  const [data,    setData]    = useState<VendorAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!user)                                          { router.push("/login"); return; }
    if (user.role !== "vendor" && user.role !== "admin") { router.push("/");     return; }
  }, [user, router]);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const { data: res } = await authClient(token).get<ApiResponse<VendorAnalytics>>(
        "/api/vendor/analytics"
      );
      setData(res.data as VendorAnalytics);
    } catch {
      setError("Failed to load analytics — please try again.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  const monthData = (data?.revenueByMonth ?? []).map((m) => ({
    ...m,
    label: fmtMonth(m.month),
  }));

  const topProducts = data?.topProducts ?? [];
  const avgOrderValue = data && data.totalOrders > 0
    ? Math.round(data.totalRevenue / data.totalOrders)
    : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-[#FCA311]/10 flex items-center justify-center">
          <BarChart2 className="h-5 w-5 text-[#FCA311]" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100">Analytics</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Revenue and order performance overview</p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Summary stat cards */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-28 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : data && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4" data-testid="vendor-analytics-stats">
          <StatCard
            label="Total Revenue"
            value={formatPrice(data.totalRevenue)}
            icon={IndianRupee}
            iconBg="bg-green-50 dark:bg-green-950/40"
            iconColor="text-green-600 dark:text-green-400"
            data-testid="stat-total-revenue"
          />
          <StatCard
            label="Total Orders"
            value={data.totalOrders}
            icon={ShoppingBag}
            iconBg="bg-purple-50 dark:bg-purple-950/40"
            iconColor="text-purple-600 dark:text-purple-400"
            sub={data.pendingOrders > 0 ? `${data.pendingOrders} pending` : undefined}
          />
          <StatCard
            label="Avg. Order"
            value={formatPrice(avgOrderValue)}
            icon={TrendingUp}
            iconBg="bg-blue-50 dark:bg-blue-950/40"
            iconColor="text-blue-600 dark:text-blue-400"
          />
          <StatCard
            label="Products"
            value={data.totalProducts}
            icon={Package}
            iconBg="bg-amber-50 dark:bg-amber-950/40"
            iconColor="text-amber-600 dark:text-amber-400"
          />
          <StatCard
            label="Pending"
            value={data.pendingOrders}
            icon={Clock}
            iconBg="bg-yellow-50 dark:bg-yellow-950/40"
            iconColor="text-yellow-600 dark:text-yellow-400"
          />
        </div>
      )}

      {/* Revenue by Month chart */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5">
        <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-5">
          Revenue by Month
          <span className="ml-2 text-xs font-normal text-gray-400">(last 6 months)</span>
        </h2>
        {loading ? (
          <ChartSkeleton />
        ) : monthData.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-gray-400" data-testid="no-revenue-data">
            <BarChart2 className="h-10 w-10 opacity-30 mb-2" />
            <p className="text-sm">No revenue data yet</p>
          </div>
        ) : (
          <div data-testid="revenue-by-month-chart" className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: tickColor, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: tickColor, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => `₹${(v / 1000).toFixed(0)}k`}
                  width={48}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: unknown) => [formatPrice(Number(v)), "Revenue"]}
                  cursor={{ fill: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)" }}
                />
                <Bar dataKey="revenue" radius={[4, 4, 0, 0]} maxBarSize={48}>
                  {monthData.map((_, i) => (
                    <Cell key={i} fill={i === monthData.length - 1 ? AMBER : AMBER2} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Top Products chart */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5">
        <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-5">
          Top Products by Revenue
          <span className="ml-2 text-xs font-normal text-gray-400">(up to 5)</span>
        </h2>
        {loading ? (
          <ChartSkeleton />
        ) : topProducts.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-gray-400" data-testid="no-products-data">
            <Package className="h-10 w-10 opacity-30 mb-2" />
            <p className="text-sm">No product sales data yet</p>
          </div>
        ) : (
          <div data-testid="top-products-chart" className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={topProducts}
                margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fill: tickColor, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => `₹${(v / 1000).toFixed(0)}k`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fill: tickColor, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={120}
                  tickFormatter={(v: string) => v.length > 18 ? v.slice(0, 16) + "…" : v}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: unknown, name: unknown) =>
                    name === "revenue"
                      ? [formatPrice(Number(v)), "Revenue"]
                      : [Number(v), "Units sold"]
                  }
                  cursor={{ fill: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)" }}
                />
                <Bar dataKey="revenue" fill={NAVY} radius={[0, 4, 4, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        {!loading && topProducts.length > 0 && (
          <div className="mt-4 overflow-x-auto" data-testid="top-products-table">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  {["Product", "Units", "Revenue"].map((h) => (
                    <th key={h} className="pb-2 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
                {topProducts.map((p) => (
                  <tr key={p.slug} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                    <td className="py-2.5 font-medium text-gray-900 dark:text-gray-100 truncate max-w-[160px]">{p.name}</td>
                    <td className="py-2.5 text-gray-500 dark:text-gray-400">{p.quantity}</td>
                    <td className="py-2.5 font-bold text-gray-900 dark:text-gray-100">{formatPrice(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
