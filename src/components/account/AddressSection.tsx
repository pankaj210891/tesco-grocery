"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { MapPin, Plus, Pencil, Trash2, Star, AlertTriangle, X } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth.store";
import { authClient } from "@/lib/axios";
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
  confirmingDelete,
  onEdit,
  onRequestDelete,
  onConfirmDelete,
  onCancelDelete,
  onSetDefault,
}: {
  address: Address;
  confirmingDelete: boolean;
  onEdit: () => void;
  onRequestDelete: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
  onSetDefault: () => void;
}) {
  return (
    <div
      data-testid="address-card"
      className="relative bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 space-y-2"
    >
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

      {confirmingDelete ? (
        <div className="flex items-center gap-2 pt-1 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40">
          <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" aria-hidden />
          <span className="flex-1 text-xs text-red-600 dark:text-red-400 font-medium">Delete this address?</span>
          <button
            onClick={onConfirmDelete}
            data-testid="address-confirm-delete"
            className="text-xs font-bold text-white bg-red-500 hover:bg-red-600 px-2.5 py-1 rounded-lg transition-colors"
          >
            Delete
          </button>
          <button
            onClick={onCancelDelete}
            data-testid="address-cancel-delete"
            aria-label="Cancel delete"
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 pt-1">
          {!address.isDefault && (
            <button
              onClick={onSetDefault}
              data-testid="address-set-default"
              className="text-xs text-[#FCA311] font-semibold hover:underline"
            >
              Set as default
            </button>
          )}
          <button
            onClick={onEdit}
            data-testid="address-edit"
            className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 ml-auto"
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden /> Edit
          </button>
          <button
            onClick={onRequestDelete}
            data-testid="address-delete"
            className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden /> Delete
          </button>
        </div>
      )}
    </div>
  );
}

export interface AddressSectionHandle {
  openAddModal: () => void;
}

interface AddressSectionProps {
  onCountChange?: (count: number) => void;
  showHeader?: boolean;
}

const AddressSection = forwardRef<AddressSectionHandle, AddressSectionProps>(
function AddressSection({ onCountChange, showHeader = true }, ref) {
  const { token } = useAuthStore();
  const [addresses, setAddresses]       = useState<Address[]>([]);
  const [loading, setLoading]           = useState(true);
  const [showModal, setShowModal]       = useState(false);
  const [editing, setEditing]           = useState<Address | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey]     = useState(0);

  // Keep a stable ref so onCountChange doesn't need to be a dep of the effect
  const onCountChangeRef = useRef(onCountChange);
  useEffect(() => { onCountChangeRef.current = onCountChange; });

  function refresh() { setRefreshKey((k) => k + 1); }

  useEffect(() => {
    if (!token) return;
    async function load() {
      try {
        const client = authClient(token!);
        const { data: json } = await client.get("/api/account/addresses");
        const list: Address[] = (json as { data: Address[] }).data ?? [];
        setAddresses(list);
        onCountChangeRef.current?.(list.length);
      } catch {
        toast.error("Failed to load addresses.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [token, refreshKey]);

  async function handleSave(data: AddressFormData) {
    if (!token) return;
    const client = authClient(token);
    try {
      if (editing) {
        await client.put(`/api/account/addresses/${editing._id}`, data);
        toast.success("Address updated.");
      } else {
        await client.post("/api/account/addresses", data);
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
    if (!token) return;
    try {
      const client = authClient(token);
      await client.delete(`/api/account/addresses/${id}`);
      toast.success("Address deleted.");
      setConfirmDeleteId(null);
      refresh();
    } catch {
      toast.error("Failed to delete address.");
    }
  }

  async function handleSetDefault(id: string) {
    if (!token) return;
    try {
      const client = authClient(token);
      await client.patch(`/api/account/addresses/${id}/default`, {});
      toast.success("Default address updated.");
      refresh();
    } catch {
      toast.error("Failed to update default.");
    }
  }

  function openAddModal() {
    setEditing(null);
    setShowModal(true);
  }

  useImperativeHandle(ref, () => ({ openAddModal }));

  return (
    <div className="space-y-4">
      {showHeader && (
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-black text-gray-900 dark:text-white">
            <MapPin className="h-5 w-5 text-[#FCA311]" aria-hidden />
            Saved addresses
            {!loading && addresses.length > 0 && (
              <span className="text-sm font-normal text-gray-400 dark:text-gray-500">
                ({addresses.length})
              </span>
            )}
          </h2>
          <button
            onClick={openAddModal}
            data-testid="add-address-btn"
            className="flex items-center gap-1.5 px-4 py-2 bg-[#FCA311] text-white text-sm font-semibold rounded-xl hover:bg-[#E8920A] transition-colors"
          >
            <Plus className="h-4 w-4" aria-hidden /> Add address
          </button>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2].map((n) => (
            <div key={n} className="animate-pulse h-36 bg-gray-100 dark:bg-gray-700/40 rounded-xl" />
          ))}
        </div>
      ) : addresses.length === 0 ? (
        <div data-testid="addresses-empty-state" className="text-center py-12">
          <div className="w-14 h-14 rounded-full bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center mx-auto mb-3">
            <MapPin className="h-7 w-7 text-[#FCA311]" aria-hidden />
          </div>
          <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">
            No saved addresses yet
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
            Add a delivery address to speed up checkout.
          </p>
          <button
            onClick={openAddModal}
            data-testid="add-address-empty-cta"
            className="px-5 py-2 bg-[#FCA311] text-white text-sm font-bold rounded-xl hover:bg-[#E8920A] transition-colors"
          >
            Add your first address
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {addresses.map((addr) => (
            <AddressCard
              key={addr._id}
              address={addr}
              confirmingDelete={confirmDeleteId === addr._id}
              onEdit={() => { setEditing(addr); setShowModal(true); }}
              onRequestDelete={() => setConfirmDeleteId(addr._id)}
              onConfirmDelete={() => handleDelete(addr._id)}
              onCancelDelete={() => setConfirmDeleteId(null)}
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
});

AddressSection.displayName = "AddressSection";

export default AddressSection;
