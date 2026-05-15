"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, ChevronLeft, ChevronRight, X, Search } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import type { Vendor, VendorStatus } from "@/types";

interface PageData { vendors: Vendor[]; total: number; page: number; totalPages: number; }

const STATUS_COLORS: Record<string, string> = {
  active:    "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  pending:   "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  suspended: "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300",
};

const EMPTY_FORM = { name:"", slug:"", description:"", email:"", phone:"", address:"", city:"", ownerId:"", ownerName:"", status:"pending" as VendorStatus };
function slugify(s: string) { return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""); }

export default function AdminVendorsPage() {
  const { user, token } = useAuthStore();
  const router = useRouter();
  const [data, setData]       = useState<PageData | null>(null);
  const [page, setPage]       = useState(1);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(false);
  const [form, setForm]       = useState({ ...EMPTY_FORM });
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");
  const [updating, setUpdating] = useState<string | null>(null);
  const [search, setSearch]     = useState("");

  const authHeader = { Authorization: `Bearer ${token}` };

  const load = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams({ page: String(page), limit: "20" });
    if (search) qs.set("q", search);
    fetch(`/api/admin/vendors?${qs}`, { headers: authHeader })
      .then((r) => r.json() as Promise<{ success: boolean; data: PageData }>)
      .then((j) => { if (j.success) setData(j.data); })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, token, search]);

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    if (user.role !== "admin") { router.push("/"); return; }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [user, router, load]);

  async function handleSave() {
    setSaving(true); setError("");
    const res  = await fetch("/api/admin/vendors", {
      method: "POST",
      headers: { ...authHeader, "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = await res.json() as { success: boolean; error?: string };
    setSaving(false);
    if (!json.success) { setError(json.error ?? "Failed"); return; }
    setModal(false);
     
    void load();
  }

  async function updateStatus(id: string, status: VendorStatus) {
    setUpdating(id);
    await fetch(`/api/admin/vendors/${id}`, {
      method: "PUT",
      headers: { ...authHeader, "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setUpdating(null);
     
    void load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this vendor? Their products will not be deleted.")) return;
    await fetch(`/api/admin/vendors/${id}`, { method: "DELETE", headers: authHeader });
     
    void load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100">Vendors</h1>
        <button onClick={() => { setForm({ ...EMPTY_FORM }); setError(""); setModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-[#0F4C75] text-white text-sm font-semibold rounded-lg hover:bg-[#0A3352] transition-colors">
          <Plus className="h-4 w-4" /> Add Vendor
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search name, email, city…"
          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#0F4C75]"
        />
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col" style={{ maxHeight: "calc(100vh - 280px)" }}>
        <div className="overflow-auto flex-1">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-800 sticky top-0 z-10">
              <tr>
                {["Vendor", "Owner", "City", "Email", "Status", "Joined", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}><td colSpan={7} className="px-4 py-3"><div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" /></td></tr>
                ))
              ) : data?.vendors.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">No vendors yet</td></tr>
              ) : data?.vendors.map((v) => (
                <tr key={v._id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{v.name}</p>
                    <p className="text-xs text-gray-400">{v.city}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{v.ownerName}</td>
                  <td className="px-4 py-3 text-gray-500">{v.city || "—"}</td>
                  <td className="px-4 py-3 text-gray-500">{v.email}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[v.status] ?? ""}`}>{v.status}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{new Date(v.createdAt).toLocaleDateString("en-GB")}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {v.status !== "active" && (
                        <button disabled={updating === v._id} onClick={() => updateStatus(v._id, "active")} className="text-xs px-2 py-1 rounded-lg font-semibold bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-950/30 disabled:opacity-50">Approve</button>
                      )}
                      {v.status === "active" && (
                        <button disabled={updating === v._id} onClick={() => updateStatus(v._id, "suspended")} className="text-xs px-2 py-1 rounded-lg font-semibold bg-yellow-50 text-yellow-700 hover:bg-yellow-100 dark:bg-yellow-950/30 disabled:opacity-50">Suspend</button>
                      )}
                      <button onClick={() => handleDelete(v._id)} className="text-xs px-2 py-1 rounded-lg font-semibold bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/30">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data && data.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-sm">
            <span className="text-gray-500">Page {data.page} of {data.totalPages}</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
              <button disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)} className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
        )}
      </div>

      {/* Add Vendor Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <h2 className="font-bold text-gray-900 dark:text-gray-100">Add Vendor</h2>
              <button onClick={() => setModal(false)}><X className="h-5 w-5 text-gray-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              {error && <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2">{error}</p>}
              {([
                { field: "name", label: "Business Name" },
                { field: "slug", label: "Slug" },
                { field: "email", label: "Email" },
                { field: "phone", label: "Phone" },
                { field: "address", label: "Address" },
                { field: "city", label: "City" },
                { field: "ownerId", label: "Owner User ID" },
                { field: "ownerName", label: "Owner Name" },
              ] as { field: keyof typeof form; label: string }[]).map(({ field, label }) => (
                <div key={field}>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{label}</label>
                  <input
                    type="text"
                    value={String(form[field])}
                    onChange={(e) => {
                      const val = e.target.value;
                      setForm((f) => ({
                        ...f,
                        [field]: val,
                        ...(field === "name" ? { slug: slugify(val) } : {}),
                      }));
                    }}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#0F4C75]"
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Status</label>
                <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as VendorStatus }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none">
                  <option value="pending">Pending</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-3 justify-end">
              <button onClick={() => setModal(false)} className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm font-semibold text-white bg-[#0F4C75] rounded-lg hover:bg-[#0A3352] disabled:opacity-50">
                {saving ? "Saving…" : "Add Vendor"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
