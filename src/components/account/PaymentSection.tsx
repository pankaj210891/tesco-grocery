"use client";

import { useEffect, useState } from "react";
import { CreditCard, Plus, Trash2, Star } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth.store";
import { CARD_LABELS } from "@/lib/utils/card";
import type { PaymentMethod, CardType } from "@/types";
import PaymentFormModal, { type PaymentSaveData } from "./PaymentFormModal";

function PaymentCard({
  method,
  onDelete,
  onSetDefault,
}: {
  method: PaymentMethod;
  onDelete: () => void;
  onSetDefault: () => void;
}) {
  return (
    <div className="relative bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 space-y-2">
      {method.isDefault && (
        <span className="absolute top-3 right-3 inline-flex items-center gap-1 text-xs font-semibold text-[#00539F] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
          <Star className="h-3 w-3" aria-hidden /> Default
        </span>
      )}

      <div className="flex items-center gap-2">
        <CreditCard className="h-4 w-4 text-gray-400" aria-hidden />
        <span className="text-sm font-black text-gray-900 dark:text-white">
          {CARD_LABELS[method.cardType as CardType]}
        </span>
      </div>

      <p className="text-sm text-gray-700 dark:text-gray-300 font-mono tracking-wider">
        **** **** **** {method.lastFour}
      </p>
      <p className="text-sm text-gray-600 dark:text-gray-400">{method.cardholderName}</p>
      <p className="text-xs text-gray-400 dark:text-gray-500">
        Expires {method.expiryMonth}/{method.expiryYear}
      </p>

      <div className="flex items-center gap-2 pt-1">
        {!method.isDefault && (
          <button
            onClick={onSetDefault}
            className="text-xs text-[#00539F] font-semibold hover:underline"
          >
            Set as default
          </button>
        )}
        <button
          onClick={onDelete}
          className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 ml-auto"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden /> Delete
        </button>
      </div>
    </div>
  );
}

export default function PaymentSection() {
  const { token } = useAuthStore();
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const authHeaders = { Authorization: `Bearer ${token}` };

  const [refreshKey, setRefreshKey] = useState(0);
  function refresh() { setRefreshKey((k) => k + 1); }

  useEffect(() => {
    if (!token) return;
    async function load() {
      try {
        const { data: json } = await axios.get("/api/account/payment-methods", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setMethods(json.data ?? []);
      } catch {
        toast.error("Failed to load payment methods.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [token, refreshKey]);

  async function handleSave(data: PaymentSaveData) {
    try {
      await axios.post("/api/account/payment-methods", data, { headers: authHeaders });
      toast.success("Card saved.");
      setShowModal(false);
      refresh();
    } catch {
      toast.error("Failed to save card.");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this card?")) return;
    try {
      await axios.delete(`/api/account/payment-methods/${id}`, { headers: authHeaders });
      toast.success("Card deleted.");
      refresh();
    } catch {
      toast.error("Failed to delete card.");
    }
  }

  async function handleSetDefault(id: string) {
    try {
      await axios.patch(`/api/account/payment-methods/${id}/default`, {}, { headers: authHeaders });
      toast.success("Default card updated.");
      refresh();
    } catch {
      toast.error("Failed to update default.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-black text-gray-900 dark:text-white">
          <CreditCard className="h-5 w-5 text-[#00539F]" aria-hidden />
          Saved cards
        </h2>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#00539F] text-white text-sm font-semibold rounded-xl hover:bg-[#003B7A] transition-colors"
        >
          <Plus className="h-4 w-4" aria-hidden /> Add card
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2].map((n) => (
            <div key={n} className="animate-pulse h-32 bg-gray-100 rounded-xl" />
          ))}
        </div>
      ) : methods.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          No payment cards saved yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {methods.map((m) => (
            <PaymentCard
              key={m._id}
              method={m}
              onDelete={() => handleDelete(m._id)}
              onSetDefault={() => handleSetDefault(m._id)}
            />
          ))}
        </div>
      )}

      {showModal && (
        <PaymentFormModal onClose={() => setShowModal(false)} onSave={handleSave} />
      )}
    </div>
  );
}
