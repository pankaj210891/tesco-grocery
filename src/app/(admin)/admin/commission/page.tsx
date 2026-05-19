"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Percent, Save, RotateCcw, CheckCircle, AlertCircle } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { authClient } from "@/lib/axios";
import type { ApiResponse } from "@/lib/axios";

interface VendorRate {
  vendorId:   string;
  vendorName: string;
  rate:       number;
}

interface VendorEntry {
  vendorId:   string;
  vendorName: string;
}

interface CommissionData {
  defaultRate: number;
  vendorRates: VendorRate[];
  allVendors:  VendorEntry[];
}

const inputCls =
  "px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#0F4C75] w-full";

export default function CommissionPage() {
  const { user, token } = useAuthStore();
  const router = useRouter();

  const [data, setData]           = useState<CommissionData | null>(null);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [success, setSuccess]     = useState("");
  const [error, setError]         = useState("");

  // Form state
  const [defaultRate, setDefaultRate] = useState<string>("10");
  const [overrides, setOverrides]     = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await authClient(token).get<ApiResponse<CommissionData>>("/api/admin/commission");
      if (res.data.data) {
        const d = res.data.data;
        setData(d);
        setDefaultRate(String(d.defaultRate));
        const map: Record<string, string> = {};
        for (const vr of d.vendorRates) map[vr.vendorId] = String(vr.rate);
        setOverrides(map);
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!user)                    { router.push("/login"); return; }
    if (user.role !== "admin")    { router.push("/");      return; }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [user, router, load]);

  async function handleSave() {
    setSaving(true);
    setSuccess("");
    setError("");
    try {
      const vendorRates = Object.entries(overrides)
        .filter(([, v]) => v !== "" && !isNaN(Number(v)))
        .map(([vendorId, rate]) => ({ vendorId, rate: Number(rate) }));

      await authClient(token!).put("/api/admin/commission", {
        defaultRate: Number(defaultRate),
        vendorRates,
      });
      setSuccess("Commission settings saved.");
      void load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  function clearOverride(vendorId: string) {
    setOverrides((prev) => {
      const next = { ...prev };
      delete next[vendorId];
      return next;
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 border-4 border-[#0F4C75]/30 border-t-[#0F4C75] rounded-full animate-spin" />
      </div>
    );
  }

  const allVendors = data?.allVendors ?? [];

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-[#0F4C75]/10 rounded-xl flex items-center justify-center">
          <Percent className="h-5 w-5 text-[#0F4C75]" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100">Commission Engine</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Set the platform commission rate deducted from vendor earnings per order.
          </p>
        </div>
      </div>

      {success && (
        <div
          data-testid="commission-success"
          className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800/40 rounded-lg px-4 py-3"
        >
          <CheckCircle className="h-4 w-4 shrink-0" /> {success}
        </div>
      )}
      {error && (
        <div
          data-testid="commission-error"
          className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 rounded-lg px-4 py-3"
        >
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {/* Global default rate */}
      <section className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 space-y-4">
        <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-widest">
          Global Default Rate
        </h2>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Applied to all vendors that do not have an individual override.
        </p>
        <div className="flex items-center gap-3 max-w-xs">
          <div className="relative flex-1">
            <input
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={defaultRate}
              data-testid="default-rate-input"
              onChange={(e) => setDefaultRate(e.target.value)}
              className={inputCls}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
          </div>
        </div>
      </section>

      {/* Per-vendor overrides */}
      <section className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 space-y-4">
        <div>
          <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-widest">
            Per-Vendor Overrides
          </h2>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Leave blank to use the global default. Enter a value to override for that vendor.
          </p>
        </div>

        {allVendors.length === 0 ? (
          <p className="text-sm text-gray-400 italic">No active vendors yet.</p>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800" data-testid="vendor-rates-table">
            {allVendors.map((v) => {
              const hasOverride = overrides[v.vendorId] !== undefined;
              const effective   = hasOverride ? overrides[v.vendorId] : defaultRate;
              return (
                <div
                  key={v.vendorId}
                  data-testid={`vendor-rate-row-${v.vendorId}`}
                  className="py-3 flex items-center gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
                      {v.vendorName}
                    </p>
                    {!hasOverride && (
                      <p className="text-[11px] text-gray-400">Using global default ({defaultRate}%)</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="relative w-28">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        value={overrides[v.vendorId] ?? ""}
                        data-testid={`vendor-rate-input-${v.vendorId}`}
                        placeholder={effective}
                        onChange={(e) =>
                          setOverrides((prev) => ({ ...prev, [v.vendorId]: e.target.value }))
                        }
                        className={inputCls}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
                    </div>
                    {hasOverride && (
                      <button
                        type="button"
                        data-testid={`clear-override-${v.vendorId}`}
                        onClick={() => clearOverride(v.vendorId)}
                        title="Remove override — revert to global default"
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Save button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          data-testid="save-commission-btn"
          className="flex items-center gap-2 px-6 py-2.5 bg-[#0F4C75] text-white text-sm font-semibold rounded-lg hover:bg-[#0a3a5c] disabled:opacity-50 transition-colors"
        >
          <Save className="h-4 w-4" />
          {saving ? "Saving…" : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
