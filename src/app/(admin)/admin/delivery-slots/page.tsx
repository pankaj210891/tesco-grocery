"use client";

import { useState, useEffect, useCallback } from "react";
import { Clock, Plus, Trash2, ToggleLeft, ToggleRight, RefreshCw } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth.store";
import { SLOT_WINDOWS, type SlotWindow } from "@/lib/constants/delivery-slots";

interface AdminSlot {
  _id:         string;
  date:        string;
  window:      SlotWindow;
  capacity:    number;
  bookedCount: number;
  isActive:    boolean;
  cutoffTime:  string;
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", {
    weekday: "short", day: "numeric", month: "short",
  });
}

export default function AdminDeliverySlotsPage() {
  const { token } = useAuthStore();
  const [slots,    setSlots]    = useState<AdminSlot[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [seeding,  setSeeding]  = useState(false);
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().slice(0, 10));

  const AUTH = { Authorization: `Bearer ${token}` };

  const fetchSlots = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const { data } = await axios.get<{ success: boolean; data: AdminSlot[] }>(
        `/api/admin/delivery-slots?date=${dateFilter}`,
        { headers: AUTH },
      );
      setSlots(data.data ?? []);
    } catch {
      toast.error("Failed to load slots");
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, dateFilter]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void fetchSlots(); }, [fetchSlots]);

  async function handleSeed(force = false) {
    setSeeding(true);
    try {
      const url = force
        ? "/api/admin/delivery-slots/seed?force=true"
        : "/api/admin/delivery-slots/seed";
      const { data } = await axios.post<{ created: number; skipped: number; message: string }>(
        url,
        {},
        { headers: AUTH },
      );
      if (data.created > 0) {
        toast.success(data.message);
      } else {
        toast.info(data.message);
      }
      void fetchSlots();
    } catch {
      toast.error("Seed failed");
    } finally {
      setSeeding(false);
    }
  }

  async function handleToggleActive(slot: AdminSlot) {
    try {
      await axios.patch(
        `/api/admin/delivery-slots/${slot._id}`,
        { isActive: !slot.isActive },
        { headers: AUTH },
      );
      setSlots((prev) => prev.map((s) => s._id === slot._id ? { ...s, isActive: !s.isActive } : s));
      toast.success(slot.isActive ? "Slot deactivated" : "Slot activated");
    } catch {
      toast.error("Failed to update slot");
    }
  }

  async function handleDelete(slot: AdminSlot) {
    if (!confirm(`Delete slot ${slot.date} ${slot.window}? This cannot be undone.`)) return;
    try {
      await axios.delete(`/api/admin/delivery-slots/${slot._id}`, { headers: AUTH });
      setSlots((prev) => prev.filter((s) => s._id !== slot._id));
      toast.success("Slot deleted");
    } catch (err) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error : null;
      toast.error(msg ?? "Failed to delete slot");
    }
  }

  const grouped = slots.reduce<Record<string, AdminSlot[]>>((acc, slot) => {
    if (!acc[slot.date]) acc[slot.date] = [];
    acc[slot.date].push(slot);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-[#FCA311]" />
          <h1 className="text-xl font-black text-gray-900 dark:text-white">Delivery Slots</h1>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          />
          <button
            onClick={() => void fetchSlots()}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button
            onClick={() => handleSeed(false)}
            disabled={seeding}
            className="flex items-center gap-1.5 px-4 py-2 text-sm bg-[#FCA311] text-white font-semibold rounded-xl hover:bg-[#E8920A] transition-colors disabled:opacity-60"
          >
            <Plus className="h-4 w-4" />
            {seeding ? "Seeding…" : "Seed 14 Days"}
          </button>
          <button
            onClick={() => {
              if (confirm("Force reseed will DELETE all existing future slots and recreate them. Continue?")) {
                void handleSeed(true);
              }
            }}
            disabled={seeding}
            className="flex items-center gap-1.5 px-4 py-2 text-sm bg-red-500 text-white font-semibold rounded-xl hover:bg-red-600 transition-colors disabled:opacity-60"
          >
            <RefreshCw className="h-4 w-4" />
            Force Reseed
          </button>
        </div>
      </div>

      <p className="text-sm text-gray-500 dark:text-gray-400">
        Showing slots for <strong>{dateFilter}</strong>. Use &quot;Seed 14 Days&quot; to auto-create all windows for the next 2 weeks.
      </p>

      {/* Slot table */}
      <div className="overflow-auto" style={{ maxHeight: "calc(100vh - 280px)" }}>
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-16 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
          ))}
        </div>
      ) : slots.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <Clock className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">No slots for this date.</p>
          <button
            onClick={() => void handleSeed(false)}
            className="mt-4 px-4 py-2 text-sm bg-[#FCA311] text-white font-semibold rounded-xl hover:bg-[#E8920A] transition-colors"
          >
            Seed Slots
          </button>
        </div>
      ) : (
        Object.entries(grouped).map(([date, daySlots]) => (
          <div key={date} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80">
              <p className="text-sm font-bold text-gray-700 dark:text-gray-300">{formatDate(date)} — {date}</p>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700">
                  <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Window</th>
                  <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Booked / Capacity</th>
                  <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Status</th>
                  <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                {(SLOT_WINDOWS as readonly SlotWindow[]).map((win) => {
                  const slot = daySlots.find((s) => s.window === win);
                  if (!slot) return null;
                  const pct = (slot.bookedCount / slot.capacity) * 100;
                  return (
                    <tr key={slot._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/20">
                      <td className="px-5 py-3 font-medium text-gray-800 dark:text-gray-200">{win}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-700 dark:text-gray-300">{slot.bookedCount} / {slot.capacity}</span>
                          <div className="w-24 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${pct >= 90 ? "bg-red-500" : pct >= 60 ? "bg-amber-400" : "bg-green-400"}`}
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                          slot.isActive
                            ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                            : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                        }`}>
                          {slot.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleActive(slot)}
                            title={slot.isActive ? "Deactivate" : "Activate"}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-[#FCA311] hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                          >
                            {slot.isActive
                              ? <ToggleRight className="h-4 w-4 text-green-500" />
                              : <ToggleLeft className="h-4 w-4" />
                            }
                          </button>
                          <button
                            onClick={() => handleDelete(slot)}
                            disabled={slot.bookedCount > 0}
                            title={slot.bookedCount > 0 ? "Cannot delete a booked slot" : "Delete slot"}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))
      )}
      </div>
    </div>
  );
}
