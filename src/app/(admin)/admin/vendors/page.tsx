"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { Plus, X, Search, Eye, Pencil, RotateCcw, Mail, CheckCircle, ShieldCheck, ShieldAlert, Clock, FileText } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { authClient, type ApiResponse } from "@/lib/axios";
import { toast } from "sonner";
import {
  useAdminVendorsStore,
  DEFAULT_VENDOR_FILTERS,
  type AdminVendorFilters,
} from "@/store/admin-vendors.store";
import { useAdminFilters } from "@/hooks/useAdminFilters";
import { FilterChip } from "@/components/admin/FilterChip";
import { AdminTableShell } from "@/components/admin/AdminTableShell";
import { useDebounce } from "@/hooks/useDebounce";
import { AdminDateFilter } from "@/components/admin/AdminDateFilter";
import { useScrollLock } from "@/hooks/useScrollLock";
import type { Vendor, VendorStatus, VendorInvite, KycStatus } from "@/types";

interface PageData { vendors: Vendor[]; total: number; page: number; totalPages: number; }
interface InvitePageData { invites: VendorInvite[]; total: number; }

const STATUS_COLORS: Record<string, string> = {
  active:    "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  pending:   "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  suspended: "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300",
};

const KYC_COLORS: Record<KycStatus, string> = {
  not_submitted: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
  pending:       "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  verified:      "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  rejected:      "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300",
};

const KYC_ICONS: Record<KycStatus, React.ElementType> = {
  not_submitted: FileText,
  pending:       Clock,
  verified:      ShieldCheck,
  rejected:      ShieldAlert,
};

const STATUS_TABS = ["", "active", "pending", "suspended"] as const;

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

function buildQS(filters: AdminVendorFilters, page: number): URLSearchParams {
  const qs = new URLSearchParams();
  if (page > 1)          qs.set("page",     String(page));
  if (filters.search)    qs.set("search",   filters.search);
  if (filters.status)    qs.set("status",   filters.status);
  if (filters.dateFrom)  qs.set("dateFrom", filters.dateFrom);
  if (filters.dateTo)    qs.set("dateTo",   filters.dateTo);
  return qs;
}

function hasActiveFilters(f: AdminVendorFilters): boolean {
  return !!(f.search || f.status || f.dateFrom || f.dateTo);
}

function AdminVendorsPageInner() {
  const { user, token } = useAuthStore();

  const { page, filters, setPage, setFilter, resetFilters } = useAdminVendorsStore();

  const { filterReady } = useAdminFilters({
    defaultFilters: DEFAULT_VENDOR_FILTERS,
    buildQS,
    setFilter,
    setPage,
    filters,
    page,
  });

  const [data, setData]         = useState<PageData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [updating, setUpdating] = useState<string | null>(null);

  // Add vendor modal
  const [addModal, setAddModal] = useState(false);
  const [addForm, setAddForm]   = useState({ ...EMPTY_FORM });
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError]   = useState("");

  // Invite vendor modal
  const [inviteModal,   setInviteModal]   = useState(false);
  const [inviteForm,    setInviteForm]    = useState({ email: "", businessName: "", contactName: "" });
  const [inviteSaving,  setInviteSaving]  = useState(false);
  const [inviteError,   setInviteError]   = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");

  // View/Edit vendor modal
  const [viewVendor, setViewVendor] = useState<Vendor | null>(null);
  const [editMode, setEditMode]     = useState(false);
  const [editForm, setEditForm]     = useState<VendorForm>({ ...EMPTY_FORM });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError]   = useState("");

  // KYC review
  const [kycReviewing,   setKycReviewing]   = useState(false);
  const [kycRejReason,   setKycRejReason]   = useState("");
  const [kycReviewError, setKycReviewError] = useState("");

  useScrollLock(addModal || inviteModal || viewVendor !== null);

  // ── Tabs ─────────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"vendors" | "invites">("vendors");

  // ── Invite list ───────────────────────────────────────────────────────────────
  const [inviteData,        setInviteData]        = useState<InvitePageData | null>(null);
  const [inviteListLoading, setInviteListLoading] = useState(false);

  const debouncedSearch = useDebounce(filters.search, 350);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const qs = new URLSearchParams({ page: String(page), limit: "20" });
    if (debouncedSearch)  qs.set("q",        debouncedSearch);
    if (filters.status)   qs.set("status",   filters.status);
    if (filters.dateFrom) qs.set("dateFrom", filters.dateFrom);
    if (filters.dateTo)   qs.set("dateTo",   filters.dateTo);
    try {
      const res = await authClient(token!).get<ApiResponse<PageData>>(`/api/admin/vendors?${qs}`);
      if (res.data.data) setData(res.data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load vendors");
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, filters.status, filters.dateFrom, filters.dateTo, token]);

  const loadInvites = useCallback(async () => {
    setInviteListLoading(true);
    try {
      const res = await authClient(token!).get<ApiResponse<InvitePageData>>("/api/admin/vendors/invite");
      if (res.data.data) setInviteData(res.data.data);
    } catch {
      // invite list is secondary; silently ignore
    } finally {
      setInviteListLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!filterReady || !user || user.role !== "admin") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    void loadInvites();
  }, [load, loadInvites, user, filterReady]);

  async function handleAddSave() {
    setAddSaving(true); setAddError("");
    try {
      await authClient(token!).post<ApiResponse<Vendor>>("/api/admin/vendors", addForm);
      setAddModal(false);
      void load();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Failed to create vendor");
    } finally {
      setAddSaving(false);
    }
  }

  async function handleEditSave() {
    if (!viewVendor) return;
    if (!editForm.name.trim()) { setEditError("Name is required"); return; }
    if (!editForm.email.trim()) { setEditError("Email is required"); return; }
    setEditSaving(true); setEditError("");
    try {
      const res = await authClient(token!).put<ApiResponse<Vendor>>(`/api/admin/vendors/${viewVendor._id}`, editForm);
      const updated = res.data.data;
      if (updated) {
        setViewVendor(updated);
        setData((prev) => {
          if (!prev) return prev;
          return { ...prev, vendors: prev.vendors.map((v) => v._id === updated._id ? updated : v) };
        });
      }
      setEditMode(false);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to update vendor");
    } finally {
      setEditSaving(false);
    }
  }

  async function handleInviteSave() {
    if (!inviteForm.email.trim())        { setInviteError("Email is required"); return; }
    if (!inviteForm.businessName.trim()) { setInviteError("Business name is required"); return; }
    if (!inviteForm.contactName.trim())  { setInviteError("Contact name is required"); return; }
    setInviteSaving(true); setInviteError(""); setInviteSuccess("");
    try {
      const res = await authClient(token!).post<ApiResponse<unknown>>("/api/admin/vendors/invite", inviteForm);
      setInviteSuccess(res.data.message ?? `Invite sent to ${inviteForm.email}`);
      setInviteForm({ email: "", businessName: "", contactName: "" });
      void loadInvites();
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Failed to send invite");
    } finally {
      setInviteSaving(false);
    }
  }

  async function updateStatus(id: string, status: VendorStatus) {
    setUpdating(id);
    try {
      await authClient(token!).put<ApiResponse<Vendor>>(`/api/admin/vendors/${id}`, { status });
      void load();
    } catch {
      toast.error("Failed to update vendor status. Please try again.");
    } finally {
      setUpdating(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this vendor? Their products will not be deleted.")) return;
    try {
      await authClient(token!).delete<ApiResponse<unknown>>(`/api/admin/vendors/${id}`);
      void load();
    } catch {
      toast.error("Failed to delete vendor. Please try again.");
    }
  }

  async function handleKycReview(action: "verified" | "rejected") {
    if (!viewVendor) return;
    setKycReviewing(true);
    setKycReviewError("");
    try {
      const res = await authClient(token!).put<ApiResponse<Vendor["kyc"]>>(
        `/api/admin/vendors/${viewVendor._id}/kyc`,
        { action, rejectionReason: kycRejReason },
      );
      const kycData = res.data.data;
      setViewVendor((v) => v ? { ...v, kyc: kycData } : v);
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          vendors: prev.vendors.map((v) =>
            v._id === viewVendor._id ? { ...v, kyc: kycData } : v,
          ),
        };
      });
      setKycRejReason("");
    } catch (err) {
      setKycReviewError(err instanceof Error ? err.message : "Failed to update KYC");
    } finally {
      setKycReviewing(false);
    }
  }

  function openView(v: Vendor) {
    setViewVendor(v);
    setEditForm(vendorToForm(v));
    setEditMode(false);
    setEditError("");
    setKycRejReason("");
    setKycReviewError("");
  }

  const filteredInvites = (inviteData?.invites ?? []).filter((inv) => {
    if (!filters.search) return true;
    const q = filters.search.toLowerCase();
    return (
      inv.email.toLowerCase().includes(q) ||
      inv.businessName.toLowerCase().includes(q) ||
      inv.contactName.toLowerCase().includes(q)
    );
  });

  const inputCls = "w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#0F4C75]";

  return (
    <div className="space-y-4">

      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100">Vendors</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => { setInviteForm({ email: "", businessName: "", contactName: "" }); setInviteError(""); setInviteSuccess(""); setInviteModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-[#14532d] text-white text-sm font-semibold rounded-lg hover:bg-[#0f3d20] transition-colors"
            data-testid="invite-vendor-btn"
          >
            <Mail className="h-4 w-4" /> Invite Vendor
          </button>
          <button
            onClick={() => { setAddForm({ ...EMPTY_FORM }); setAddError(""); setAddModal(true); }}
            disabled={activeTab === "invites"}
            title={activeTab === "invites" ? "Switch to Vendors tab to add a vendor" : undefined}
            className={`flex items-center gap-2 px-4 py-2 bg-[#0F4C75] text-white text-sm font-semibold rounded-lg transition-colors ${
              activeTab === "invites" ? "opacity-40 cursor-not-allowed" : "hover:bg-[#0A3352]"
            }`}
            data-testid="add-vendor-btn"
          >
            <Plus className="h-4 w-4" /> Add Vendor
          </button>
        </div>
      </div>

      {/* ── Filter bar — search always active; status/date disabled on Invites tab ── */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4 space-y-3">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[160px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              value={filters.search}
              onChange={(e) => setFilter({ search: e.target.value })}
              placeholder={activeTab === "invites" ? "Search invites…" : "Search name, email, city…"}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#0F4C75]"
              data-testid="vendor-search"
            />
          </div>
          {hasActiveFilters(filters) && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 border border-red-200 dark:border-red-800 transition-colors"
              data-testid="clear-vendor-filters"
            >
              <RotateCcw className="h-4 w-4" /> Clear
            </button>
          )}
        </div>

        <div
          className={`flex flex-wrap gap-2 items-center transition-opacity ${
            activeTab === "invites" ? "opacity-40 pointer-events-none select-none" : ""
          }`}
          title={activeTab === "invites" ? "Status and date filters apply to the Vendors tab" : undefined}
        >
          <div className="flex flex-wrap gap-1" data-testid="vendor-status-tabs">
            {STATUS_TABS.map((s) => (
              <button
                key={s}
                onClick={() => setFilter({ status: s })}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                  filters.status === s
                    ? "bg-[#0F4C75] text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
                data-testid={`vendor-status-${s || "all"}`}
              >
                {s || "All"}
              </button>
            ))}
          </div>
          <AdminDateFilter
            dateFrom={filters.dateFrom}
            dateTo={filters.dateTo}
            label="Joined date"
            onApply={(from, to) => setFilter({ dateFrom: from, dateTo: to })}
            onClear={() => setFilter({ dateFrom: "", dateTo: "" })}
          />
        </div>

        {hasActiveFilters(filters) && (
          <div className="flex flex-wrap gap-1.5 pt-1" data-testid="active-vendor-filters">
            {filters.search && (
              <FilterChip label={`"${filters.search}"`} onRemove={() => setFilter({ search: "" })} />
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

      {/* ── Tabbed card ─────────────────────────────────────────────────────── */}
      <div
        className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col"
        style={{ height: "max(360px, calc(100vh - 320px))" }}
      >
        {/* Tab strip — overflow-x-auto so tabs stay readable on narrow screens */}
        <div className="flex border-b border-gray-100 dark:border-gray-800 shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab("vendors")}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === "vendors"
                ? "border-[#0F4C75] text-[#0F4C75] dark:text-blue-400 dark:border-blue-400"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
            data-testid="tab-vendors"
          >
            Vendors
            {data && (
              <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                activeTab === "vendors"
                  ? "bg-blue-100 text-[#0F4C75] dark:bg-blue-900/40 dark:text-blue-300"
                  : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
              }`}>
                {data.total}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("invites")}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === "invites"
                ? "border-[#14532d] text-[#14532d] dark:text-green-400 dark:border-green-400"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
            data-testid="tab-invites"
          >
            Pending Invites
            {inviteData && inviteData.total > 0 && (
              <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                activeTab === "invites"
                  ? "bg-green-100 text-[#14532d] dark:bg-green-900/40 dark:text-green-300"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
              }`}>
                {inviteData.total}
              </span>
            )}
          </button>
        </div>

        {/* ── Vendors tab ─────────────────────────────────────────────────── */}
        {activeTab === "vendors" && (
          <AdminTableShell
            bare
            headerRow={
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">Vendor</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap hidden sm:table-cell">Owner</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap hidden md:table-cell">City</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap hidden sm:table-cell">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap hidden md:table-cell">KYC</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap hidden lg:table-cell">Joined</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">Actions</th>
              </tr>
            }
            loading={loading}
            skeletonRows={4}
            colSpan={8}
            isEmpty={!loading && !error && (data?.vendors.length ?? 0) === 0}
            emptyMessage={error ? error : "No vendors found"}
            tableClassName="w-full text-sm min-w-[640px]"
            pagination={data && data.totalPages > 1 ? {
              page: data.page,
              totalPages: data.totalPages,
              total: data.total,
              label: "vendors",
              onPageChange: setPage,
              testIdPrefix: "vendor",
            } : undefined}
          >
            {data?.vendors.map((v) => (
              <tr key={v._id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30" data-testid="vendor-row">
                <td className="px-4 py-3">
                  <p className="font-semibold text-gray-900 dark:text-gray-100">{v.name}</p>
                  <p className="text-xs text-gray-400 font-mono">{v.slug}</p>
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden sm:table-cell">{v.ownerName}</td>
                <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{v.city || "—"}</td>
                <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{v.email}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[v.status] ?? ""}`}>{v.status}</span>
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  {(() => {
                    const kycSt = v.kyc?.status ?? "not_submitted";
                    const KycIcon = KYC_ICONS[kycSt];
                    return (
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${KYC_COLORS[kycSt]}`}
                        data-testid={`kyc-badge-${v._id}`}
                      >
                        <KycIcon className="h-3 w-3" />
                        {kycSt.replace("_", " ")}
                      </span>
                    );
                  })()}
                </td>
                <td className="px-4 py-3 text-gray-400 whitespace-nowrap hidden lg:table-cell">{new Date(v.createdAt).toLocaleDateString("en-GB")}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      onClick={() => openView(v)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-[#0F4C75] hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
                      title="View details"
                      data-testid={`view-vendor-${v._id}`}
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    {v.status !== "active" && (
                      <button disabled={updating === v._id} onClick={() => updateStatus(v._id, "active")} className="text-xs px-2 py-1 rounded-lg font-semibold bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-950/30 disabled:opacity-50" data-testid={`approve-vendor-${v._id}`}>Approve</button>
                    )}
                    {v.status === "active" && (
                      <button disabled={updating === v._id} onClick={() => updateStatus(v._id, "suspended")} className="text-xs px-2 py-1 rounded-lg font-semibold bg-yellow-50 text-yellow-700 hover:bg-yellow-100 dark:bg-yellow-950/30 disabled:opacity-50" data-testid={`suspend-vendor-${v._id}`}>Suspend</button>
                    )}
                    <button onClick={() => handleDelete(v._id)} className="text-xs px-2 py-1 rounded-lg font-semibold bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/30" data-testid={`delete-vendor-${v._id}`}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </AdminTableShell>
        )}

        {/* ── Invites tab ─────────────────────────────────────────────────── */}
        {activeTab === "invites" && (
          <div className="overflow-auto flex-1">
            {inviteListLoading ? (
              <div className="px-4 py-4 space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                ))}
              </div>
            ) : !inviteData || inviteData.invites.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16 text-gray-400">
                <Mail className="h-8 w-8 opacity-40" />
                <p className="text-sm">No invites sent yet</p>
                <button
                  onClick={() => { setInviteForm({ email: "", businessName: "", contactName: "" }); setInviteError(""); setInviteSuccess(""); setInviteModal(true); }}
                  className="text-sm font-semibold text-[#14532d] hover:underline"
                >
                  Send your first invite
                </button>
              </div>
            ) : (
              <table className="w-full text-sm min-w-[520px]">
                <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-800 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">Business</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap hidden sm:table-cell">Contact</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap hidden md:table-cell">Sent</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap hidden sm:table-cell">Expires</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {filteredInvites.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">No invites match your search</td></tr>
                  ) : filteredInvites.map((inv) => {
                    const expired     = inv.status === "expired" || new Date(inv.expiresAt) < new Date();
                    const accepted    = inv.status === "accepted";
                    const statusLabel = accepted ? "accepted" : expired ? "expired" : "pending";
                    const statusCls   = accepted
                      ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                      : expired
                        ? "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                        : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300";
                    return (
                      <tr key={inv._id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30" data-testid="invite-row">
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{inv.email}</td>
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{inv.businessName}</td>
                        <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{inv.contactName}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${statusCls}`}>{statusLabel}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap hidden md:table-cell">
                          {new Date(inv.createdAt).toLocaleDateString("en-GB")}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap hidden sm:table-cell">
                          {expired || accepted ? "—" : new Date(inv.expiresAt).toLocaleDateString("en-GB")}
                        </td>
                        <td className="px-4 py-3">
                          {!accepted && (
                            <button
                              onClick={() => {
                                setInviteForm({ email: inv.email, businessName: inv.businessName, contactName: inv.contactName });
                                setInviteError(""); setInviteSuccess(""); setInviteModal(true);
                              }}
                              className="text-xs px-2 py-1 rounded-lg font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/30 dark:text-blue-300 whitespace-nowrap"
                              data-testid={`resend-invite-${inv._id}`}
                            >
                              Resend
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Invite Vendor Modal */}
      {inviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <div>
                <h2 className="font-bold text-gray-900 dark:text-gray-100">Invite Vendor</h2>
                <p className="text-xs text-gray-500 mt-0.5">Send an onboarding email with a secure invite link</p>
              </div>
              <button onClick={() => setInviteModal(false)}><X className="h-5 w-5 text-gray-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              {inviteError && (
                <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2">{inviteError}</p>
              )}
              {inviteSuccess ? (
                <div className="flex flex-col items-center gap-3 py-4 text-center">
                  <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-[#14532d]" />
                  </div>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">Invite Sent!</p>
                  <p className="text-sm text-gray-500">{inviteSuccess}</p>
                  <p className="text-xs text-gray-400">The vendor will receive an email with a link valid for 72 hours.</p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Vendor Email *</label>
                    <input
                      type="email"
                      value={inviteForm.email}
                      onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))}
                      placeholder="vendor@example.com"
                      className={inputCls}
                      data-testid="invite-vendor-email"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Business Name *</label>
                    <input
                      type="text"
                      value={inviteForm.businessName}
                      onChange={(e) => setInviteForm((f) => ({ ...f, businessName: e.target.value }))}
                      placeholder="e.g. Fresh Farms Co."
                      className={inputCls}
                      data-testid="invite-vendor-business-name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Contact Name *</label>
                    <input
                      type="text"
                      value={inviteForm.contactName}
                      onChange={(e) => setInviteForm((f) => ({ ...f, contactName: e.target.value }))}
                      placeholder="Person receiving the invite"
                      className={inputCls}
                      data-testid="invite-vendor-contact-name"
                    />
                  </div>
                  <p className="text-xs text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2">
                    An email with a secure 72-hour onboarding link will be sent to the vendor. They will set up their account and store — no password required from you.
                  </p>
                </>
              )}
            </div>
            <div className="px-6 pb-6 flex gap-3 justify-end">
              {inviteSuccess ? (
                <>
                  <button
                    onClick={() => { setInviteSuccess(""); setInviteForm({ email: "", businessName: "", contactName: "" }); }}
                    className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    Send Another
                  </button>
                  <button
                    onClick={() => setInviteModal(false)}
                    className="px-4 py-2 text-sm font-semibold text-white bg-[#14532d] rounded-lg hover:bg-[#0f3d20]"
                  >
                    Done
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => setInviteModal(false)} className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">Cancel</button>
                  <button
                    onClick={() => void handleInviteSave()}
                    disabled={inviteSaving}
                    className="px-4 py-2 text-sm font-semibold text-white bg-[#14532d] rounded-lg hover:bg-[#0f3d20] disabled:opacity-50 flex items-center gap-2"
                    data-testid="invite-vendor-send-btn"
                  >
                    {inviteSaving ? "Sending…" : <><Mail className="h-4 w-4" /> Send Invite</>}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

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
                { field: "name",        label: "Business Name"  },
                { field: "slug",        label: "Slug"           },
                { field: "description", label: "Description"    },
                { field: "email",       label: "Email"          },
                { field: "phone",       label: "Phone"          },
                { field: "address",     label: "Address"        },
                { field: "city",        label: "City"           },
                { field: "ownerId",     label: "Owner User ID"  },
                { field: "ownerName",   label: "Owner Name"     },
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

            {/* KYC review section — shown only in view mode */}
            {!editMode && viewVendor.kyc && (
              <div className="mx-6 mb-4 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden" data-testid="vendor-kyc-section">
                <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                  <h3 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">KYC Documents</h3>
                  {(() => {
                    const kycSt = viewVendor.kyc!.status;
                    const KycIcon = KYC_ICONS[kycSt];
                    return (
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${KYC_COLORS[kycSt]}`} data-testid="vendor-modal-kyc-badge">
                        <KycIcon className="h-3 w-3" />
                        {kycSt.replace("_", " ")}
                      </span>
                    );
                  })()}
                </div>
                <div className="p-4 text-sm space-y-2">
                  {viewVendor.kyc.status === "not_submitted" && (
                    <p className="text-gray-400 text-xs">Vendor has not submitted KYC documents yet.</p>
                  )}
                  {(viewVendor.kyc.status === "pending" || viewVendor.kyc.status === "verified" || viewVendor.kyc.status === "rejected") && (
                    <dl className="space-y-1.5">
                      <div className="flex gap-3">
                        <dt className="w-24 shrink-0 text-xs font-semibold text-gray-400 uppercase">PAN</dt>
                        <dd className="font-mono text-gray-900 dark:text-gray-100 text-xs">{viewVendor.kyc.panNumber || "—"}</dd>
                      </div>
                      {viewVendor.kyc.gstNumber && (
                        <div className="flex gap-3">
                          <dt className="w-24 shrink-0 text-xs font-semibold text-gray-400 uppercase">GST</dt>
                          <dd className="font-mono text-gray-900 dark:text-gray-100 text-xs">{viewVendor.kyc.gstNumber}</dd>
                        </div>
                      )}
                      <div className="flex gap-3">
                        <dt className="w-24 shrink-0 text-xs font-semibold text-gray-400 uppercase">Aadhaar</dt>
                        <dd className="font-mono text-gray-900 dark:text-gray-100 text-xs">XXXX XXXX {viewVendor.kyc.aadhaarLast4}</dd>
                      </div>
                      {viewVendor.kyc.rejectionReason && (
                        <div className="flex gap-3">
                          <dt className="w-24 shrink-0 text-xs font-semibold text-gray-400 uppercase">Reason</dt>
                          <dd className="text-red-600 dark:text-red-400 text-xs">{viewVendor.kyc.rejectionReason}</dd>
                        </div>
                      )}
                    </dl>
                  )}
                  {viewVendor.kyc.status === "pending" && (
                    <div className="pt-3 space-y-2" data-testid="kyc-review-panel">
                      {kycReviewError && (
                        <p className="text-xs text-red-600 bg-red-50 dark:bg-red-950/30 rounded px-2 py-1">{kycReviewError}</p>
                      )}
                      <input
                        type="text"
                        value={kycRejReason}
                        onChange={(e) => setKycRejReason(e.target.value)}
                        placeholder="Rejection reason (required if rejecting)"
                        className="w-full px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#0F4C75]"
                        data-testid="kyc-rejection-reason-input"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => void handleKycReview("verified")}
                          disabled={kycReviewing}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-950/30 dark:text-green-300 rounded-lg disabled:opacity-50 transition-colors"
                          data-testid="kyc-approve-btn"
                        >
                          <ShieldCheck className="h-3.5 w-3.5" />
                          {kycReviewing ? "Processing…" : "Approve"}
                        </button>
                        <button
                          onClick={() => void handleKycReview("rejected")}
                          disabled={kycReviewing}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/30 rounded-lg disabled:opacity-50 transition-colors"
                          data-testid="kyc-reject-btn"
                        >
                          <ShieldAlert className="h-3.5 w-3.5" />
                          Reject
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

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

export default function AdminVendorsPage() {
  return (
    <Suspense>
      <AdminVendorsPageInner />
    </Suspense>
  );
}
