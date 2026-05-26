"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { Search, RotateCcw, Eye } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { authClient } from "@/lib/axios";
import {
  useAdminUsersStore,
  DEFAULT_USER_FILTERS,
  type AdminUserFilters,
} from "@/store/admin-users.store";
import { useAdminFilters } from "@/hooks/useAdminFilters";
import { FilterChip } from "@/components/admin/FilterChip";
import { AdminTableShell } from "@/components/admin/AdminTableShell";
import { useDebounce } from "@/hooks/useDebounce";
import { AdminDateFilter } from "@/components/admin/AdminDateFilter";
import dynamic from "next/dynamic";
import type { User, UserRole } from "@/types";

const AdminUserDetail = dynamic(
  () => import("@/components/admin/AdminUserDetail").then((m) => ({ default: m.AdminUserDetail })),
  { loading: () => <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"><div className="bg-white dark:bg-gray-900 rounded-xl p-8 animate-pulse w-full max-w-xl mx-4 h-48" /></div> }
);

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

  const { page, filters, setPage, setFilter, resetFilters } = useAdminUsersStore();

  const { filterReady } = useAdminFilters({
    defaultFilters: DEFAULT_USER_FILTERS,
    buildQS,
    setFilter,
    setPage,
    filters,
    page,
  });

  const [data, setData]           = useState<PageData | null>(null);
  const [loading, setLoading]     = useState(true);
  const [updating, setUpdating]   = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const debouncedSearch = useDebounce(filters.search, 350);

  const load = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams({ page: String(page), limit: "20" });
    if (debouncedSearch) qs.set("search",   debouncedSearch);
    if (filters.role)    qs.set("role",     filters.role);
    if (filters.status)  qs.set("status",   filters.status);
    if (filters.dateFrom) qs.set("dateFrom", filters.dateFrom);
    if (filters.dateTo)   qs.set("dateTo",   filters.dateTo);
    if (filters.sortBy)   qs.set("sortBy",   filters.sortBy);

    authClient(token!).get<{ success: boolean; data: PageData }>(`/api/admin/users?${qs}`)
      .then((res) => { if (res.data.success) setData(res.data.data); })
      .finally(() => setLoading(false));

  }, [page, debouncedSearch, filters.role, filters.status, filters.dateFrom, filters.dateTo, filters.sortBy, token]);

  useEffect(() => {
    if (!user || user.role !== "admin" || !filterReady) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load, user, filterReady]);

  async function updateUser(id: string, patch: { role?: UserRole; status?: "active" | "suspended" }) {
    setUpdating(id);
    await authClient(token!).put(`/api/admin/users/${id}`, patch);
    setUpdating(null);
    void load();
  }

  const selectCls = "text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#0F4C75]";

  const headerRow = (
    <tr>
      {["Name", "Email", "Role", "Status", "Joined", "Actions", ""].map((h) => (
        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
      ))}
    </tr>
  );

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100">Users</h1>

      {/* Filter bar */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4 space-y-3">
        {/* Row 1: Search + Sort + Clear */}
        <div className="flex flex-wrap gap-2 items-center">
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
              <FilterChip label={`"${filters.search}"`} onRemove={() => setFilter({ search: "" })} />
            )}
            {filters.role && (
              <FilterChip label={`Role: ${filters.role}`} onRemove={() => setFilter({ role: "" })} />
            )}
            {filters.status && (
              <FilterChip label={`Status: ${filters.status}`} onRemove={() => setFilter({ status: "" })} />
            )}
            {(filters.dateFrom || filters.dateTo) && (
              <FilterChip label={`${filters.dateFrom || "…"} → ${filters.dateTo || "…"}`} onRemove={() => setFilter({ dateFrom: "", dateTo: "" })} />
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <AdminTableShell
        headerRow={headerRow}
        loading={loading}
        colSpan={7}
        isEmpty={!loading && (data?.users.length ?? 0) === 0}
        emptyMessage="No users found"
        containerStyle={{ maxHeight: "calc(100vh - 360px)" }}
        pagination={data && data.totalPages > 1 ? {
          page: data.page,
          totalPages: data.totalPages,
          total: data.total,
          label: "users",
          onPageChange: setPage,
          testIdPrefix: "user",
        } : undefined}
      >
        {data?.users.map((u) => (
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
      </AdminTableShell>

      {selectedUserId && (
        <AdminUserDetail
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
        />
      )}
    </div>
  );
}

export default function AdminUsersPage() {
  return (
    <Suspense>
      <AdminUsersPageInner />
    </Suspense>
  );
}
