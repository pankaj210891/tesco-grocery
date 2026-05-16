"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, ChevronLeft, ChevronRight, X, Search, Eye, Pencil } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import type { Vendor, VendorStatus } from "@/types";
import { useScrollLock } from "@/hooks/useScrollLock";

interface PageData { vendors: Vendor[]; total: number; page: number; totalPages: number; }

const STATUS_COLORS: Record<string, string> = {
  active:    "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  pending:   "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  suspended: "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300",
};

const EMPTY_FORM = {
  name: "", slug: "", description: "", email: "", phone: "",
  address: "", city: "", ownerId: "", ownerName: "", status: "pending" as VendorStatus,
};

type VendorForm = typeof EMPTY_FORM;

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function vendorToForm(v: Vendor): VendorForm {
  return {
    name: v.name, slug: v.slug, description: v.description,
    email: v.email, phone: v.phone, address: v.address,
    city: v.city, ownerId: v.ownerId, ownerName: v.ownerName, status: v.status,
  };
}

export default function AdminVendorsPage() {
  const { user, token } = useAuthStore();
  const router = useRouter();

  const [data, setData]         = useState<PageData | null>(null);
  const [page, setPage]         = useState(1);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [updating, setUpdating] = useState<string | null>(null);

  // Add vendor modal
  const [addModal, setAddModal] = useState(false);
  const [addForm, setAddForm]   = useState({ ...EMPTY_FORM });
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError]   = useState("");

  // View/Edit vendor modal
  const [viewVendor, setViewVendor] = useState<Vendor | null>(null);
  const [editMode, setEditMode]     = useState(false);
  const [editForm, setEditForm]     = useState<VendorForm>({ ...EMPTY_FORM });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError]   = useState("");

  useScrollLock(addModal || viewVendor !== null);

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

  async function handleAddSave() {
    setAddSaving(true); setAddError("");
    const res  = await fetch("/api/admin/vendors", {
      method: "POST",
      headers: { ...authHeader, "Content-Type": "application/json" },
      body: JSON.stringify(addForm),
    });
    const json = await res.json() as { success: boolean; error?: string };
    setAddSaving(false);
    if (!json.success) { setAddError(json.error ?? "Failed"); return; }
    setAddModal(false);
    void load();
  }

  async function handleEditSave() {
    if (!viewVendor) return;
    if (!editForm.name.trim()) { setEditError("Name is required"); return; }
    if (!editForm.email.trim()) { setEditError("Email is required"); return; }
    setEditSaving(true); setEditError("");
    const res = await fetch(`/api/admin/vendors/${viewVendor._id}`, {
      method: "PUT",
      headers: { ...authHeader, "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    const json = await res.json() as { success: boolean; error?: string; data?: Vendor };
    setEditSaving(false);
    if (!json.success) { setEditError(json.error ?? "Failed"); return; }
    if (json.data) {
      setViewVendor(json.data);
      setData((prev) => {
        if (!prev) return prev;
        return { ...prev, vendors: prev.vendors.map((v) => v._id === json.data!._id ? json.data! : v) };
      });
    }
    setEditMode(false);
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

  function openView(v: Vendor) {
    setViewVendor(v);
    setEditForm(vendorToForm(v));
    setEditMode(false);
    setEditError("");
  }

  const inputCls = "w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#0F4C75]";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100">Vendors</h1>
        <button
          onClick={() => { setAddForm({ ...EMPTY_FORM }); setAddError(""); setAddModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-[#0F4C75] text-white text-sm font-semibold rounded-lg hover:bg-[#0A3352] transition-colors"
          data-testid="add-vendor-btn"
        >
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
          data-testid="vendor-search"
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
                <tr key={v._id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30" data-testid="vendor-row">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{v.name}</p>
                    <p className="text-xs text-gray-400 font-mono">{v.slug}</p>
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
                      <button
                        onClick={() => openView(v)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-[#0F4C75] hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
                        title="View details"
                        data-testid={`view-vendor-${v._id}`}
                      >
                        <Eye className="h-4 w-4" />
                      </button>
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
      {addModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <h2 className="font-bold text-gray-900 dark:text-gray-100">Add Vendor</h2>
              <button onClick={() => setAddModal(false)}><X className="h-5 w-5 text-gray-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              {addError && <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2">{addError}</p>}
              {([
                { field: "name", label: "Business Name" },
                { field: "slug", label: "Slug" },
                { field: "email", label: "Email" },
                { field: "phone", label: "Phone" },
                { field: "address", label: "Address" },
                { field: "city", label: "City" },
                { field: "ownerId", label: "Owner User ID" },
                { field: "ownerName", label: "Owner Name" },
              ] as { field: keyof VendorForm; label: string }[]).map(({ field, label }) => (
                <div key={field}>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{label}</label>
                  <input
                    type="text"
                    value={String(addForm[field])}
                    onChange={(e) => {
                      const val = e.target.value;
                      setAddForm((f) => ({ ...f, [field]: val, ...(field === "name" ? { slug: slugify(val) } : {}) }));
                    }}
                    className={inputCls}
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Status</label>
                <select value={addForm.status} onChange={(e) => setAddForm((f) => ({ ...f, status: e.target.value as VendorStatus }))} className={inputCls}>
                  <option value="pending">Pending</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-3 justify-end">
              <button onClick={() => setAddModal(false)} className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">Cancel</button>
              <button onClick={() => void handleAddSave()} disabled={addSaving} className="px-4 py-2 text-sm font-semibold text-white bg-[#0F4C75] rounded-lg hover:bg-[#0A3352] disabled:opacity-50">
                {addSaving ? "Saving…" : "Add Vendor"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View/Edit Vendor Modal */}
      {viewVendor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" data-testid="vendor-detail-modal">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <div>
                <h2 className="font-bold text-gray-900 dark:text-gray-100">{viewVendor.name}</h2>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[viewVendor.status] ?? ""}`}>{viewVendor.status}</span>
              </div>
              <div className="flex items-center gap-2">
                {!editMode && (
                  <button
                    onClick={() => { setEditMode(true); setEditForm(vendorToForm(viewVendor)); setEditError(""); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    data-testid="vendor-edit-btn"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                )}
                <button onClick={() => { setViewVendor(null); setEditMode(false); }} data-testid="vendor-modal-close">
                  <X className="h-5 w-5 text-gray-400" />
                </button>
              </div>
            </div>

            <div className="p-6">
              {editError && <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2 mb-4">{editError}</p>}

              {editMode ? (
                <div className="space-y-4">
                  {([
                    { field: "name", label: "Business Name" },
                    { field: "slug", label: "Slug" },
                    { field: "description", label: "Description" },
                    { field: "email", label: "Email" },
                    { field: "phone", label: "Phone" },
                    { field: "address", label: "Address" },
                    { field: "city", label: "City" },
                    { field: "ownerName", label: "Owner Name" },
                  ] as { field: keyof VendorForm; label: string }[]).map(({ field, label }) => (
                    <div key={field}>
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{label}</label>
                      <input
                        type="text"
                        value={String(editForm[field])}
                        onChange={(e) => setEditForm((f) => ({ ...f, [field]: e.target.value }))}
                        className={inputCls}
                        data-testid={`vendor-edit-${field}`}
                      />
                    </div>
                  ))}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Status</label>
                    <select
                      value={editForm.status}
                      onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value as VendorStatus }))}
                      className={inputCls}
                      data-testid="vendor-edit-status"
                    >
                      <option value="pending">Pending</option>
                      <option value="active">Active</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </div>
                </div>
              ) : (
                <dl className="space-y-3">
                  {[
                    { label: "Business Name",  value: viewVendor.name },
                    { label: "Slug",           value: viewVendor.slug },
                    { label: "Description",    value: viewVendor.description || "—" },
                    { label: "Email",          value: viewVendor.email },
                    { label: "Phone",          value: viewVendor.phone || "—" },
                    { label: "Address",        value: viewVendor.address || "—" },
                    { label: "City",           value: viewVendor.city || "—" },
                    { label: "Owner Name",     value: viewVendor.ownerName },
                    { label: "Owner ID",       value: viewVendor.ownerId },
                    { label: "Joined",         value: new Date(viewVendor.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex gap-3">
                      <dt className="w-32 shrink-0 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{label}</dt>
                      <dd className="text-sm text-gray-900 dark:text-gray-100 break-all">{value}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>

            <div className="px-6 pb-6 flex gap-3 justify-end border-t border-gray-100 dark:border-gray-800 pt-4">
              {editMode ? (
                <>
                  <button onClick={() => { setEditMode(false); setEditError(""); }} className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">Cancel</button>
                  <button onClick={() => void handleEditSave()} disabled={editSaving} className="px-4 py-2 text-sm font-semibold text-white bg-[#0F4C75] rounded-lg hover:bg-[#0A3352] disabled:opacity-50" data-testid="vendor-save-btn">
                    {editSaving ? "Saving…" : "Save Changes"}
                  </button>
                </>
              ) : (
                <button onClick={() => { setViewVendor(null); }} className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">Close</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
