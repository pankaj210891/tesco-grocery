export const SLOT_WINDOWS = [
  "09:00-12:00",
  "12:00-16:00",
  "16:00-20:00",
  "20:00-22:00",
] as const;

export type SlotWindow = typeof SLOT_WINDOWS[number];
