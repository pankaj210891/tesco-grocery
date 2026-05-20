"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  TrendingUp, TrendingDown, Minus,
  ShoppingBag, Banknote, Store, Receipt, BarChart2,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { authClient } from "@/lib/axios";
import type { ApiResponse } from "@/lib/axios";
import { formatPrice } from "@/lib/utils/format";
import { useTheme } from "@/components/providers/ThemeProvider";

// Lazy-load recharts to avoid SSR issues (recharts requires browser APIs)
const AreaChart    = dynamic(() => import("recharts").then((m) => m.AreaChart),    { ssr: false });
const Area         = dynamic(() => import("recharts").then((m) => m.Area),         { ssr: false });
const BarChart     = dynamic(() => import("recharts").then((m) => m.BarChart),     { ssr: false });
const Bar          = dynamic(() => import("recharts").then((m) => m.Bar),          { ssr: false });
const PieChart     = dynamic(() => import("recharts").then((m) => m.PieChart),     { ssr: false });
const Pie          = dynamic(() => import("recharts").then((m) => m.Pie),          { ssr: false });
const Cell         = dynamic(() => import("recharts").then((m) => m.Cell),         { ssr: false });
const XAxis        = dynamic(() => import("recharts").then((m) => m.XAxis),        { ssr: false });
const YAxis        = dynamic(() => import("recharts").then((m) => m.YAxis),        { ssr: false });
const CartesianGrid = dynamic(() => import("recharts").then((m) => m.CartesianGrid), { ssr: false });
const Tooltip      = dynamic(() => import("recharts").then((m) => m.Tooltip),      { ssr: false });
const Legend       = dynamic(() => import("recharts").then((m) => m.Legend),       { ssr: false });
const ResponsiveContainer = dynamic(
  () => import("recharts").then((m) => m.ResponsiveContainer), { ssr: false }
);

interface Summary {
  gross:         number;
  commission:    number;
  vendorNet:     number;
  orderCount:    number;
  avgOrderValue: number;
  trends: {
    gross:      number | null;
    commission: number | null;
    orders:     number | null;
  };
}

interface RevenuePoint { date: string; gross: number; commission: number; vendorNet: number; }
interface StatusPoint  { status: string; count: number; }
interface VendorPoint  { vendorId: string; vendorName: string; gross: number; commission: number; net: number; }
interface CategoryPoint { category: string; revenue: number; }

interface AnalyticsData {
  summary:           Summary;
  revenueByPeriod:   RevenuePoint[];
  ordersByStatus:    StatusPoint[];
  topVendors:        VendorPoint[];
  revenueByCategory: CategoryPoint[];
}

const PERIODS = [
  { value: "7d",  label: "7 days"   },
  { value: "30d", label: "30 days"  },
  { value: "90d", label: "3 months" },
  { value: "12m", label: "12 months"},
] as const;

const PIE_COLORS = ["#0F4C75","#1B7A48","#FCA311","#E8920A","#6C3483","#1A5276","#117A65","#784212"];

const STATUS_COLORS: Record<string, string> = {
  pending:    "#FCA311",
  processing: "#2980B9",
  shipped:    "#8E44AD",
  delivered:  "#27AE60",
  cancelled:  "#E74C3C",
};

function TrendBadge({ value }: { value: number | null }) {
  if (value === null) return <span className="text-xs text-gray-400">—</span>;
  const up  = value > 0;
  const flat = value === 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-bold ${
      flat ? "text-gray-400" : up ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"
    }`}>
      {flat ? <Minus className="h-3 w-3" /> : up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {Math.abs(value)}%
    </span>
  );
}

function ChartSkeleton() {
  return (
    <div className="h-64 flex items-center justify-center">
      <div className="h-8 w-8 border-4 border-[#0F4C75]/30 border-t-[#0F4C75] rounded-full animate-spin" />
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const { user, token } = useAuthStore();
  const router = useRouter();

  const { resolvedTheme }     = useTheme();
  const isDark                = resolvedTheme === "dark";

  const gridColor    = isDark ? "#374151" : "#E5E7EB";
  const tickColor    = isDark ? "#9CA3AF" : "#6B7280";
  const tooltipStyle = {
    backgroundColor: isDark ? "#1F2937" : "#ffffff",
    border:          `1px solid ${isDark ? "#374151" : "#E5E7EB"}`,
    borderRadius:    8,
    color:           isDark ? "#F9FAFB" : "#111827",
  };

  const [data, setData]       = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod]   = useState<string>("30d");

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await authClient(token).get<ApiResponse<AnalyticsData>>(
        `/api/admin/analytics?period=${period}`
      );
      if (res.data.data) setData(res.data.data);
    } finally {
      setLoading(false);
    }
  }, [token, period]);

  useEffect(() => {
    if (!user)                 { router.push("/login"); return; }
    if (user.role !== "admin") { router.push("/");      return; }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [user, router, load]);

  const s = data?.summary;

  const kpiCards = [
    {
      label:   "Gross Revenue",
      value:   formatPrice(s?.gross ?? 0),
      trend:   s?.trends.gross ?? null,
      icon:    ShoppingBag,
      color:   "text-[#0F4C75]",
      bg:      "bg-[#0F4C75]/10",
      testid:  "kpi-gross",
    },
    {
      label:   "Platform Revenue",
      value:   formatPrice(s?.commission ?? 0),
      trend:   s?.trends.commission ?? null,
      icon:    TrendingUp,
      color:   "text-green-600",
      bg:      "bg-green-50 dark:bg-green-900/20",
      testid:  "kpi-commission",
    },
    {
      label:   "Vendor Payouts",
      value:   formatPrice(s?.vendorNet ?? 0),
      trend:   null,
      icon:    Store,
      color:   "text-purple-600",
      bg:      "bg-purple-50 dark:bg-purple-900/20",
      testid:  "kpi-vendor-net",
    },
    {
      label:   "Orders",
      value:   String(s?.orderCount ?? 0),
      trend:   s?.trends.orders ?? null,
      icon:    Receipt,
      color:   "text-amber-600",
      bg:      "bg-amber-50 dark:bg-amber-900/20",
      testid:  "kpi-orders",
    },
    {
      label:   "Avg Order Value",
      value:   formatPrice(s?.avgOrderValue ?? 0),
      trend:   null,
      icon:    Banknote,
      color:   "text-blue-600",
      bg:      "bg-blue-50 dark:bg-blue-900/20",
      testid:  "kpi-avg",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header + period selector */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#0F4C75]/10 rounded-xl flex items-center justify-center">
            <BarChart2 className="h-5 w-5 text-[#0F4C75]" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100">Revenue Analytics</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Platform-wide financial performance overview.</p>
          </div>
        </div>
        <div className="flex gap-1.5 bg-gray-100 dark:bg-gray-800 rounded-xl p-1" data-testid="period-selector">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              data-testid={`period-${p.value}`}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                period === p.value
                  ? "bg-white dark:bg-gray-900 text-[#0F4C75] shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4" data-testid="analytics-kpis">
        {kpiCards.map(({ label, value, trend, icon: Icon, color, bg, testid }) => (
          <div
            key={label}
            data-testid={testid}
            className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${bg}`}>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
              <TrendBadge value={trend} />
            </div>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">{label}</p>
            <p className="text-xl font-black text-gray-900 dark:text-gray-100 leading-tight">{value}</p>
          </div>
        ))}
      </div>

      {/* Revenue over time — Area chart */}
      <div
        className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6"
        data-testid="chart-revenue-over-time"
      >
        <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-widest mb-4">
          Revenue Over Time
        </h2>
        {loading || !data ? <ChartSkeleton /> : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data.revenueByPeriod} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="gGross"      x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#0F4C75" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#0F4C75" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gCommission" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#27AE60" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#27AE60" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: tickColor }} tickLine={false} axisLine={false} />
              <YAxis tickFormatter={(v) => `₹${(v as number / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: tickColor }} tickLine={false} axisLine={false} width={52} />
              <Tooltip formatter={(v: unknown) => formatPrice(Number(v))} contentStyle={tooltipStyle} />
              <Legend />
              <Area type="monotone" dataKey="gross"      name="Gross Revenue"    stroke="#0F4C75" fill="url(#gGross)"      strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="commission" name="Platform Revenue" stroke="#27AE60" fill="url(#gCommission)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="vendorNet"  name="Vendor Net"       stroke="#8E44AD" fill="none"              strokeWidth={2} dot={false} strokeDasharray="4 3" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Bottom row: two charts side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Orders by status — Bar chart */}
        <div
          className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6"
          data-testid="chart-orders-by-status"
        >
          <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-widest mb-4">
            Orders by Status
          </h2>
          {loading || !data ? <ChartSkeleton /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.ordersByStatus} barSize={32} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="status" tick={{ fontSize: 11, fill: tickColor }} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: tickColor }} tickLine={false} axisLine={false} width={36} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" name="Orders" radius={[4, 4, 0, 0]}>
                  {data.ordersByStatus.map((entry) => (
                    <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? "#94A3B8"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top vendors — Pie chart */}
        <div
          className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6"
          data-testid="chart-top-vendors"
        >
          <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-widest mb-4">
            Top Vendors by Revenue
          </h2>
          {loading || !data || !data.topVendors.length ? (
            data && !data.topVendors.length
              ? <p className="text-sm text-gray-400 text-center py-10">No vendor data for this period.</p>
              : <ChartSkeleton />
          ) : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="55%" height={220}>
                <PieChart>
                  <Pie
                    data={data.topVendors}
                    dataKey="gross"
                    nameKey="vendorName"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    strokeWidth={2}
                  >
                    {data.topVendors.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: unknown) => formatPrice(Number(v))} contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-1.5 min-w-0">
                {data.topVendors.map((v, i) => (
                  <div key={v.vendorId} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-xs text-gray-600 dark:text-gray-400 truncate flex-1">{v.vendorName ?? "Unknown"}</span>
                    <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 shrink-0">{formatPrice(v.gross)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Revenue by category — Horizontal bar */}
      <div
        className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6"
        data-testid="chart-revenue-by-category"
      >
        <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-widest mb-4">
          Revenue by Category
        </h2>
        {loading || !data ? <ChartSkeleton /> : !data.revenueByCategory.length ? (
          <p className="text-sm text-gray-400 text-center py-10">No category data for this period.</p>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(200, data.revenueByCategory.length * 44)}>
            <BarChart
              data={data.revenueByCategory}
              layout="vertical"
              barSize={20}
              margin={{ top: 0, right: 60, bottom: 0, left: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
              <XAxis type="number" tickFormatter={(v) => `₹${(v as number / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: tickColor }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="category" tick={{ fontSize: 11, fill: tickColor }} tickLine={false} axisLine={false} width={110} />
              <Tooltip formatter={(v: unknown) => formatPrice(Number(v))} contentStyle={tooltipStyle} />
              <Bar dataKey="revenue" name="Revenue" fill="#0F4C75" radius={[0, 4, 4, 0]} label={{ position: "right", formatter: (v: unknown) => formatPrice(Number(v)), fontSize: 11 }} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
