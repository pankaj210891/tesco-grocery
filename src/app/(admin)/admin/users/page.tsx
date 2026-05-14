"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import type { User, UserRole } from "@/types";

interface PageData { users: User[]; total: number; page: number; totalPages: number; }

const ROLE_COLORS: Record<string, string> = {
  admin:    "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  vendor:   "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  customer: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

const ROLES: UserRole[] = ["customer", "vendor", "admin"];

export default function AdminUsersPage() {
  const { user, token } = useAuthStore();
  const router = useRouter();
  const [data, setData]       = useState<PageData | null>(null);
  const [page, setPage]       = useState(1);
  const [search, setSearch]   = useState("");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const authHeader = { Authorization: `Bearer ${token}` };

  const load = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams({ page: String(page), limit: "20" });
    if (search) qs.set("search", search);
    fetch(`/api/admin/users?${qs}`, { headers: authHeader })
      .then((r) => r.json() as Promise<{ success: boolean; data: PageData }>)
      .then((j) => { if (j.success) setData(j.data); })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, token]);

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    if (user.role !== "admin") { router.push("/"); return; }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [user, router, load]);

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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100">Users</h1>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search by name or email…"
          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#0F4C75]"
        />
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col" style={{ maxHeight: "calc(100vh - 280px)" }}>
        <div className="overflow-auto flex-1">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-800 sticky top-0 z-10">
              <tr>
                {["Name", "Email", "Role", "Status", "Joined", "Actions"].map((h) => (
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
                <tr key={u._id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
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
                        >
                          {u.status === "active" ? "Suspend" : "Activate"}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data && data.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-sm">
            <span className="text-gray-500">Page {data.page} of {data.totalPages} · {data.total} users</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)} className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
