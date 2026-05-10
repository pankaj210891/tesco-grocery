"use client";

import { useEffect } from "react";
import { X, CreditCard, Check } from "lucide-react";
import { CARD_LABELS } from "@/lib/utils/card";
import type { PaymentMethod, CardType } from "@/types";

interface PaymentSelectModalProps {
  payments: PaymentMethod[];
  selected: PaymentMethod | null;
  onSelect: (payment: PaymentMethod | null) => void;
  onClose: () => void;
}

export default function PaymentSelectModal({
  payments,
  selected,
  onSelect,
  onClose,
}: PaymentSelectModalProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/40 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="flex items-center gap-2 font-black text-gray-900">
            <CreditCard className="h-4 w-4 text-[#00539F]" aria-hidden />
            Choose card
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <ul className="p-4 space-y-2">
          {payments.map((pm) => {
            const isSelected = selected?._id === pm._id;
            return (
              <li key={pm._id}>
                <button
                  onClick={() => { onSelect(pm); onClose(); }}
                  className={`w-full text-left p-4 rounded-xl border transition-colors ${
                    isSelected
                      ? "border-[#00539F] bg-blue-50"
                      : "border-gray-100 hover:border-[#00539F]/40 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm space-y-0.5">
                      <p className="font-semibold text-gray-900">
                        {CARD_LABELS[pm.cardType as CardType]} ending {pm.lastFour}
                      </p>
                      <p className="text-gray-600">{pm.cardholderName}</p>
                      <p className="text-gray-400 text-xs">
                        Expires {pm.expiryMonth}/{pm.expiryYear}
                      </p>
                    </div>
                    {isSelected && (
                      <Check className="h-4 w-4 text-[#00539F] shrink-0" aria-hidden />
                    )}
                  </div>
                </button>
              </li>
            );
          })}

          <li>
            <button
              onClick={() => { onSelect(null); onClose(); }}
              className="w-full text-left p-4 rounded-xl border border-dashed border-gray-200 hover:border-gray-400 transition-colors text-sm text-gray-500 hover:text-gray-700"
            >
              Use a new card
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
}
