"use client";

import { detectCardType, formatCardNumber } from "@/lib/utils/card";
import type { CardType } from "@/lib/utils/card";
import { cn } from "@/lib/utils/cn";

function VisaIcon() {
  return (
    <svg width="32" height="20" viewBox="0 0 32 20" aria-label="Visa">
      <rect width="32" height="20" rx="3" fill="#1A1F71" />
      <text x="16" y="14" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold" fontFamily="Arial">VISA</text>
    </svg>
  );
}

function MastercardIcon() {
  return (
    <svg width="32" height="20" viewBox="0 0 32 20" aria-label="Mastercard">
      <circle cx="12" cy="10" r="8" fill="#EB001B" />
      <circle cx="20" cy="10" r="8" fill="#F79E1B" />
      <path d="M16 4.27a8 8 0 0 1 0 11.46A8 8 0 0 1 16 4.27z" fill="#FF5F00" />
    </svg>
  );
}

function AmexIcon() {
  return (
    <svg width="32" height="20" viewBox="0 0 32 20" aria-label="Amex">
      <rect width="32" height="20" rx="3" fill="#007BC1" />
      <text x="16" y="14" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold" fontFamily="Arial">AMEX</text>
    </svg>
  );
}

function DiscoverIcon() {
  return (
    <svg width="32" height="20" viewBox="0 0 32 20" aria-label="Discover">
      <rect width="32" height="20" rx="3" fill="#FF6600" />
      <text x="16" y="14" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold" fontFamily="Arial">DISC</text>
    </svg>
  );
}

const CARD_ICONS: Record<CardType, React.FC> = {
  visa: VisaIcon,
  mastercard: MastercardIcon,
  amex: AmexIcon,
  discover: DiscoverIcon,
  other: () => null,
};

interface CardNumberInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: boolean;
  placeholder?: string;
}

export default function CardNumberInput({
  value,
  onChange,
  error,
  placeholder = "1234 5678 9012 3456",
}: CardNumberInputProps) {
  const isMasked = value.startsWith("*");
  const cardType = isMasked ? "other" : detectCardType(value);
  const CardIcon = CARD_ICONS[cardType];

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (isMasked) return;
    onChange(formatCardNumber(e.target.value));
  }

  return (
    <div className="relative">
      <input
        type="text"
        inputMode="numeric"
        placeholder={placeholder}
        maxLength={19}
        readOnly={isMasked}
        value={value}
        onChange={handleChange}
        className={cn(
          "w-full pl-3.5 pr-12 py-2.5 text-sm border rounded-xl outline-none transition-colors bg-white",
          "placeholder:text-gray-400 text-gray-900",
          error
            ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100"
            : "border-gray-300 focus:border-[#00539F] focus:ring-2 focus:ring-blue-100",
          isMasked && "bg-gray-50 cursor-default"
        )}
      />
      {cardType !== "other" && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <CardIcon />
        </span>
      )}
    </div>
  );
}
