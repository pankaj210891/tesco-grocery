"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, ChevronLeft, ChevronRight, X, RotateCcw, Eye } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import {
  useAdminUsersStore,
  type AdminUserFilters,
} from "@/store/admin-users.store";
import { useDebounce } from "@/hooks/useDebounce";
import { AdminDateFilter } from "@/components/admin/AdminDateFilter";
import { AdminUserDetail } from "@/components/admin/AdminUserDetail";
import type { User, UserRole } from "@/types";

interface PageData { users: User[]; total: number; page: number; totalPages: number; }

const ROLE_COLORS: Record<string, string> = {
  admin:    "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  vendor:   "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  customer: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

const ROLES: UserRole[] = ["customer", "vendor", "admin"];

function buildQS(filters: AdminUserFilters, page: number): URLSearchParams {
  const qs = new URLSearchParams();
  if (page > 1)          qs.set("page",     String(page));
  if (filters.search)    qs.set("search",   filters.search);
  if (filters.role)      qs.set("role",     filters.role);
  if (filters.status)    qs.set("status",   filters.status);
  if (filters.dateFrom)  qs.set("dateFrom", filters.dateFrom);
  if (filters.dateTo)    qs.set("dateTo",   filters.dateTo);
  if (filters.sortBy && filters.sortBy !== "newest") qs.set("sortBy", filters.sortBy);
  return qs;
}

function hasActiveFilters(f: AdminUserFilters): boolean {
  return !!(f.search || f.role || f.status || f.dateFrom || f.dateTo || (f.sortBy && f.sortBy !== "newest"));
}

function AdminUsersPageInner() {
  const { user, token } = useAuthStore();
  const router   = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { page, filters, setPage, setFilter, resetFilters } = useAdminUsersStore();

  const [data, setData]       = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const debouncedSearch = useDebounce(filters.search, 350);

  const authHeader = { Authorization: `Bearer ${token}` };

  // Sync store from URL on mount
  useEffect(() => {
    const p: Partial<AdminUserFilters> = {
      search:   searchParams.get("search")   ?? "",
      role:     searchParams.get("role")     ?? "",
      status:   searchParams.get("status")   ?? "",
      dateFrom: searchParams.get("dateFrom") ?? "",
      dateTo:   searchParams.get("dateTo")   ?? "",
      sortBy:   searchParams.get("sortBy")   ?? "newest",
    };
    setFilter(p);
    const pg = Number(searchParams.get("page") ?? 1);
    if (pg > 1) setPage(pg);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams({ page: String(page), limit: "20" });
    if (debouncedSearch) qs.set("search",   debouncedSearch);
    if (filters.role)    qs.set("role",     filters.role);
    if (filters.status)  qs.set("status",   filters.status);
    if (filters.dateFrom) qs.set("dateFrom", filters.dateFrom);
    if (filters.dateTo)   qs.set("dateTo",   filters.dateTo);
    if (filters.sortBy)   qs.set("sortBy",   filters.sortBy);

    fetch(`/api/admin/users?${qs}`, { headers: authHeader })
      .then((r) => r.json() as Promise<{ success: boolean; data: PageData }>)
      .then((j) => { if (j.success) setData(j.data); })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedSearch, filters.role, filters.status, filters.dateFrom, filters.dateTo, filters.sortBy, token]);

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    if (user.role !== "admin") { router.push("/"); return; }
  }, [user, router]);

  useEffect(() => {
    if (!user || user.role !== "admin") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load, user]);

  // Sync URL when filters change
  useEffect(() => {
    const qs = buildQS(filters, page);
    const url = qs.toString() ? `${pathname}?${qs.toString()}` : pathname;
    router.replace(url, { scroll: false });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, page]);

  async function updateUser(id: string, patch: { role?: UserRole; status?: "active" | "suspended" }) {
    setUpdating(id);
    await fetch(`/api/admin/users/${id}`, {
      method: "PUT",
      headers: { ...authHeader, "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    setUpdating(null);
    void load();
  }

  const selectCls = "text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#0F4C75]";

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100">Users</h1>

      {/* Filter bar */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4 space-y-3">
        {/* Row 1: Search + Sort + Clear */}
        <div className="flex flex-wrap gap-2 items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              value={filters.search}
              onChange={(e) => setFilter({ search: e.target.value })}
              placeholder="Search name or email…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#0F4C75]"
              data-testid="user-search"
            />
          </div>

          {/* Sort */}
          <select
            value={filters.sortBy}
            onChange={(e) => setFilter({ sortBy: e.target.value })}
            className={selectCls}
            data-testid="user-sort"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="name-asc">Name A–Z</option>
            <option value="name-desc">Name Z–A</option>
          </select>

          {/* Clear */}
          {hasActiveFilters(filters) && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 border border-red-200 dark:border-red-800 transition-colors"
              data-testid="clear-user-filters"
            >
              <RotateCcw className="h-4 w-4" /> Clear
            </button>
          )}
        </div>

        {/* Row 2: Role tabs + Status + Date range */}
        <div className="flex flex-wrap gap-2 items-center">
          {/* Role tabs */}
          <div className="flex gap-1" data-testid="role-filters">
            {(["", "customer", "vendor", "admin"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setFilter({ role: r })}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                  filters.role === r
                    ? "bg-[#0F4C75] text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
                data-testid={`role-filter-${r || "all"}`}
              >
                {r || "All"}
              </button>
            ))}
          </div>

          {/* Status */}
          <div className="flex gap-1" data-testid="status-filters">
            {(["", "active", "suspended"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilter({ status: s })}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                  filters.status === s
                    ? "bg-[#0F4C75] text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
                data-testid={`status-filter-${s || "all"}`}
              >
                {s || "All Status"}
              </button>
            ))}
          </div>

          {/* Registration date range */}
          <AdminDateFilter
            dateFrom={filters.dateFrom}
            dateTo={filters.dateTo}
            label="Registration date"
            onApply={(from, to) => setFilter({ dateFrom: from, dateTo: to })}
            onClear={() => setFilter({ dateFrom: "", dateTo: "" })}
          />
        </div>

        {/* Active filter chips */}
        {hasActiveFilters(filters) && (
          <div className="flex flex-wrap gap-1.5 pt-1" data-testid="active-user-filters">
            {filters.search && (
              <Chip label={`"${filters.search}"`} onRemove={() => setFilter({ search: "" })} />
            )}
            {filters.role && (
              <Chip label={`Role: ${filters.role}`} onRemove={() => setFilter({ role: "" })} />
            )}
            {filters.status && (
              <Chip label={`Status: ${filters.status}`} onRemove={() => setFilter({ status: "" })} />
            )}
            {(filters.dateFrom || filters.dateTo) && (
              <Chip label={`${filters.dateFrom || "…"} → ${filters.dateTo || "…"}`} onRemove={() => setFilter({ dateFrom: "", dateTo: "" })} />
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col" style={{ maxHeight: "calc(100vh - 360px)" }}>
        <div className="overflow-auto flex-1">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-800 sticky top-0 z-10">
              <tr>
                {["Name", "Email", "Role", "Status", "Joined", "Actions", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={6} className="px-4 py-3"><div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" /></td></tr>
                ))
              ) : data?.users.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">No users found</td></tr>
              ) : data?.users.map((u) => (
                <tr key={u._id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30" data-testid="user-row">
                  <td className="px-4 py-3 font-semibold text-gray-900 dark:text-gray-100">{u.name}</td>
                  <td className="px-4 py-3 text-gray-500">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full capitalize ${ROLE_COLORS[u.role] ?? ""}`}>{u.role}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${u.status === "active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{new Date(u.createdAt).toLocaleDateString("en-GB")}</td>
                  <td className="px-4 py-3">
                    {u._id !== user?._id && (
                      <div className="flex items-center gap-2">
                        <select
                          disabled={updating === u._id}
                          value={u.role}
                          onChange={(e) => updateUser(u._id, { role: e.target.value as UserRole })}
                          className="text-xs px-2 py-1 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none disabled:opacity-50"
                          data-testid={`role-select-${u._id}`}
                        >
                          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                        </select>
                        <button
                          disabled={updating === u._id}
                          onClick={() => updateUser(u._id, { status: u.status === "active" ? "suspended" : "active" })}
                          className={`text-xs px-2 py-1 rounded-lg font-semibold disabled:opacity-50 transition-colors ${
                            u.status === "active"
                              ? "bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/30"
                              : "bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-950/30"
                          }`}
                          data-testid={`toggle-status-${u._id}`}
                        >
                          {u.status === "active" ? "Suspend" : "Activate"}
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelectedUserId(u._id)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-[#0F4C75] hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
                      title="View user details"
                      data-testid={`view-user-${u._id}`}
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {data && data.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-sm">
            <span className="text-gray-500" data-testid="user-pagination-info">
              Page {data.page} of {data.totalPages} · {data.total} users
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800"
                data-testid="user-prev-page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                disabled={page >= data.totalPages}
                onClick={() => setPage(page + 1)}
                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800"
                data-testid="user-next-page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedUserId && (
        <AdminUserDetail
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
        />
      )}
    </div>
  );
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 text-xs font-medium">
      {label}
      <button onClick={onRemove} className="hover:text-blue-900 dark:hover:text-blue-100" aria-label={`Remove ${label} filter`}>
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

export default function AdminUsersPage() {
  return (
    <Suspense>
      <AdminUsersPageInner />
    </Suspense>
  );
}
