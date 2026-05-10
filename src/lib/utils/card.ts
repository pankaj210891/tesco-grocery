export type CardType = "visa" | "mastercard" | "amex" | "discover" | "other";

export function detectCardType(value: string): CardType {
  const digits = value.replace(/\D/g, "");
  if (/^4/.test(digits)) return "visa";
  if (/^(5[1-5]|2[2-7])/.test(digits)) return "mastercard";
  if (/^3[47]/.test(digits)) return "amex";
  if (/^(6011|65|64[4-9]|622)/.test(digits)) return "discover";
  return "other";
}

export function formatCardNumber(value: string): string {
  const digits = value.replace(/\D/g, "");
  const type = detectCardType(digits);
  if (type === "amex") {
    // 4-6-5
    return digits.replace(/^(\d{0,4})(\d{0,6})(\d{0,5}).*/, (_, a, b, c) =>
      [a, b, c].filter(Boolean).join(" ")
    );
  }
  // 4-4-4-4
  return digits.replace(/(.{4})/g, "$1 ").trim().slice(0, 19);
}

export function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length >= 3) return digits.slice(0, 2) + "/" + digits.slice(2, 4);
  return digits;
}

export const CARD_LABELS: Record<CardType, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "American Express",
  discover: "Discover",
  other: "Card",
};
