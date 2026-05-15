"use client";

import { useEffect, useState } from "react";
import { MapPin, Plus, Pencil, Trash2, Star } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth.store";
import type { Address } from "@/types";
import type { AddressFormData } from "@/lib/validations/address";
import AddressFormModal from "./AddressFormModal";

const LABEL_ICON: Record<Address["label"], string> = {
  Home: "🏠",
  Office: "🏢",
  Other: "📍",
};

function AddressCard({
  address,
  onEdit,
  onDelete,
  onSetDefault,
}: {
  address: Address;
  onEdit: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
}) {
  return (
    <div className="relative bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 space-y-2">
      {address.isDefault && (
        <span className="absolute top-3 right-3 inline-flex items-center gap-1 text-xs font-semibold text-[#FCA311] bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 px-2 py-0.5 rounded-full">
          <Star className="h-3 w-3" aria-hidden /> Default
        </span>
      )}

      <div className="flex items-center gap-2">
        <span className="text-base">{LABEL_ICON[address.label]}</span>
        <span className="text-sm font-black text-gray-900 dark:text-white">
          {address.label === "Other" ? (address.customLabel ?? "Other") : address.label}
        </span>
      </div>

      <div className="text-sm text-gray-600 dark:text-gray-400 space-y-0.5">
        <p className="font-semibold text-gray-800 dark:text-gray-200">{address.fullName}</p>
        <p>{address.phone}</p>
        <p>{address.line1}{address.line2 ? `, ${address.line2}` : ""}</p>
        <p>{address.city}, {address.postcode}</p>
        <p>{address.country}</p>
      </div>

      <div className="flex items-center gap-2 pt-1">
        {!address.isDefault && (
          <button
            onClick={onSetDefault}
            className="text-xs text-[#FCA311] font-semibold hover:underline"
          >
            Set as default
          </button>
        )}
        <button
          onClick={onEdit}
          className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 ml-auto"
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden /> Edit
        </button>
        <button
          onClick={onDelete}
          className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden /> Delete
        </button>
      </div>
    </div>
  );
}

export default function AddressSection() {
  const { token } = useAuthStore();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Address | null>(null);

  const authHeaders = { Authorization: `Bearer ${token}` };

  const [refreshKey, setRefreshKey] = useState(0);
  function refresh() { setRefreshKey((k) => k + 1); }

  useEffect(() => {
    if (!token) return;
    async function load() {
      try {
        const { data: json } = await axios.get("/api/account/addresses", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setAddresses(json.data ?? []);
      } catch {
        toast.error("Failed to load addresses.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [token, refreshKey]);

  async function handleSave(data: AddressFormData) {
    try {
      if (editing) {
        await axios.put(`/api/account/addresses/${editing._id}`, data, { headers: authHeaders });
        toast.success("Address updated.");
      } else {
        await axios.post("/api/account/addresses", data, { headers: authHeaders });
        toast.success("Address added.");
      }
      setShowModal(false);
      setEditing(null);
      refresh();
    } catch {
      toast.error("Failed to save address.");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this address?")) return;
    try {
      await axios.delete(`/api/account/addresses/${id}`, { headers: authHeaders });
      toast.success("Address deleted.");
      refresh();
    } catch {
      toast.error("Failed to delete address.");
    }
  }

  async function handleSetDefault(id: string) {
    try {
      await axios.patch(`/api/account/addresses/${id}/default`, {}, { headers: authHeaders });
      toast.success("Default address updated.");
      refresh();
    } catch {
      toast.error("Failed to update default.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-black text-gray-900 dark:text-white">
          <MapPin className="h-5 w-5 text-[#FCA311]" aria-hidden />
          Saved addresses
        </h2>
        <button
          onClick={() => { setEditing(null); setShowModal(true); }}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#FCA311] text-white text-sm font-semibold rounded-xl hover:bg-[#E8920A] transition-colors"
        >
          <Plus className="h-4 w-4" aria-hidden /> Add address
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2].map((n) => (
            <div key={n} className="animate-pulse h-36 bg-gray-100 rounded-xl" />
          ))}
        </div>
      ) : addresses.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          No addresses saved yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {addresses.map((addr) => (
            <AddressCard
              key={addr._id}
              address={addr}
              onEdit={() => { setEditing(addr); setShowModal(true); }}
              onDelete={() => handleDelete(addr._id)}
              onSetDefault={() => handleSetDefault(addr._id)}
            />
          ))}
        </div>
      )}

      {showModal && (
        <AddressFormModal
          mode={editing ? "edit" : "add"}
          initial={editing ?? undefined}
          onClose={() => { setShowModal(false); setEditing(null); }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
