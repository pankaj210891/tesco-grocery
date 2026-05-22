"use client";

import { useState, useEffect, useCallback } from "react";
import { Package, Search, AlertTriangle, RefreshCw, Save } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth.store";
import NumberInput from "@/components/ui/NumberInput";

interface InventoryProduct {
  _id:               string;
  name:              string;
  slug:              string;
  category:          string;
  brand:             string;
  inStock:           boolean;
  stockQuantity:     number | null;
  lowStockThreshold: number;
}

interface EditRow {
  stockQuantity:     string;
  lowStockThreshold: string;
}

export default function AdminInventoryPage() {
  const { token } = useAuthStore();
  const [products,    setProducts]    = useState<InventoryProduct[]>([]);
  const [total,       setTotal]       = useState(0);
  const [page,        setPage]        = useState(1);
  const [totalPages,  setTotalPages]  = useState(1);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [search,      setSearch]      = useState("");
  const [lowStock,    setLowStock]    = useState(false);
  const [edits,       setEdits]       = useState<Record<string, EditRow>>({});

  const AUTH = { Authorization: `Bearer ${token}` };

  const fetchInventory = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page:     String(page),
        limit:    "20",
        lowStock: String(lowStock),
        ...(search ? { search } : {}),
      });
      const { data } = await axios.get<{
        success: boolean;
        data: {
          products:   InventoryProduct[];
          total:      number;
          totalPages: number;
        };
      }>(`/api/admin/inventory?${params}`, { headers: AUTH });
      setProducts(data.data.products);
      setTotal(data.data.total);
      setTotalPages(data.data.totalPages);
      setEdits({});
    } catch {
      toast.error("Failed to load inventory");
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, page, lowStock, search]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void fetchInventory(); }, [fetchInventory]);

  function handleEdit(productId: string, field: keyof EditRow, value: string) {
    setEdits((prev) => ({
      ...prev,
      [productId]: {
        stockQuantity:     prev[productId]?.stockQuantity     ?? "",
        lowStockThreshold: prev[productId]?.lowStockThreshold ?? "",
        [field]:           value,
      },
    }));
  }

  async function handleSave() {
    const updates = Object.entries(edits)
      .filter(([, row]) => row.stockQuantity !== "" || row.lowStockThreshold !== "")
      .map(([productId, row]) => {
        const update: {
          productId:          string;
          stockQuantity?:     number | null;
          lowStockThreshold?: number;
        } = { productId };
        if (row.stockQuantity !== "") {
          update.stockQuantity = row.stockQuantity === "null" ? null : Number(row.stockQuantity);
        }
        if (row.lowStockThreshold !== "") {
          update.lowStockThreshold = Number(row.lowStockThreshold);
        }
        return update;
      });

    if (updates.length === 0) {
      toast.info("No changes to save");
      return;
    }

    setSaving(true);
    try {
      await axios.patch("/api/admin/inventory", { updates }, { headers: AUTH });
      toast.success(`Updated ${updates.length} product(s)`);
      void fetchInventory();
    } catch {
      toast.error("Failed to save inventory changes");
    } finally {
      setSaving(false);
    }
  }

  function stockLabel(p: InventoryProduct) {
    if (p.stockQuantity === null) return "Untracked";
    if (p.stockQuantity === 0)    return "Out of Stock";
    if (p.stockQuantity <= p.lowStockThreshold) return `Low (${p.stockQuantity})`;
    return String(p.stockQuantity);
  }

  function stockColor(p: InventoryProduct) {
    if (p.stockQuantity === null) return "text-gray-400";
    if (p.stockQuantity === 0)    return "text-red-600 dark:text-red-400 font-semibold";
    if (p.stockQuantity <= p.lowStockThreshold) return "text-amber-600 dark:text-amber-400 font-semibold";
    return "text-green-600 dark:text-green-400";
  }

  const dirtyCount = Object.values(edits).filter(
    (r) => r.stockQuantity !== "" || r.lowStockThreshold !== ""
  ).length;

  return (
    <div className="space-y-6" data-testid="admin-inventory-page">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-[#FCA311]" />
          <h1 className="text-xl font-black text-gray-900 dark:text-white">Inventory Management</h1>
          <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">({total} products)</span>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => void fetchInventory()}
            data-testid="inventory-refresh"
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          {dirtyCount > 0 && (
            <button
              onClick={handleSave}
              disabled={saving}
              data-testid="inventory-save"
              className="flex items-center gap-1.5 px-4 py-2 text-sm bg-[#FCA311] text-white font-semibold rounded-xl hover:bg-[#E8920A] transition-colors disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving…" : `Save ${dirtyCount} Change${dirtyCount !== 1 ? "s" : ""}`}
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search products…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            data-testid="inventory-search"
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FCA311]/40"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={lowStock}
            onChange={(e) => { setLowStock(e.target.checked); setPage(1); }}
            data-testid="inventory-low-stock-filter"
            className="rounded border-gray-300"
          />
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          Low stock only
        </label>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3" data-testid="inventory-loading">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700" data-testid="inventory-empty">
          <Package className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">No products found.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col" style={{ maxHeight: "calc(100vh - 280px)" }} data-testid="inventory-table">
          <div className="overflow-auto flex-1">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-800 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Product</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Category</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Current Stock</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Set Stock</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Low Threshold</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
              {products.map((p) => (
                <tr key={p._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/20" data-testid={`inventory-row-${p._id}`}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800 dark:text-gray-200 truncate max-w-[200px]">{p.name}</p>
                    <p className="text-xs text-gray-400">{p.brand}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{p.category}</td>
                  <td className={`px-4 py-3 ${stockColor(p)}`}>
                    {stockLabel(p)}
                  </td>
                  <td className="px-4 py-3">
                    <NumberInput
                      min={0}
                      placeholder={p.stockQuantity !== null ? String(p.stockQuantity) : "untracked"}
                      value={edits[p._id]?.stockQuantity ?? ""}
                      onChange={(e) => handleEdit(p._id, "stockQuantity", e.target.value)}
                      data-testid={`stock-input-${p._id}`}
                      className="w-24 px-2 py-1 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#FCA311]/40"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <NumberInput
                      min={0}
                      placeholder={String(p.lowStockThreshold)}
                      value={edits[p._id]?.lowStockThreshold ?? ""}
                      onChange={(e) => handleEdit(p._id, "lowStockThreshold", e.target.value)}
                      data-testid={`threshold-input-${p._id}`}
                      className="w-20 px-2 py-1 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#FCA311]/40"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                      p.inStock
                        ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                        : "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
                    }`}>
                      {p.inStock ? "In Stock" : "Out of Stock"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between" data-testid="inventory-pagination">
              <p className="text-xs text-gray-500 dark:text-gray-400">Page {page} of {totalPages}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
