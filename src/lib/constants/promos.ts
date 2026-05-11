export const VALID_PROMOS: Record<string, { pct: number; label: string }> = {
  TESCO10:  { pct: 0.1,  label: "10% off your order" },
  FRESH5:   { pct: 0.05, label: "5% off fresh items"  },
  SAVE15:   { pct: 0.15, label: "15% off today only"  },
};

export const FREE_DELIVERY_THRESHOLD = 40;
export const DELIVERY_COST = 3.99;
