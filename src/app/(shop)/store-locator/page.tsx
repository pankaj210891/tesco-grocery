"use client";

import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  Search,
  ChevronDown,
  ChevronUp,
  Wifi,
  Car,
  Coffee,
  ShoppingBag,
  Pill,
  Banknote,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { Store } from "@/types";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;
type Day = typeof DAYS[number];

const DAY_LABELS: Record<Day, string> = {
  monday: "Mon", tuesday: "Tue", wednesday: "Wed",
  thursday: "Thu", friday: "Fri", saturday: "Sat", sunday: "Sun",
};

const AMENITY_ICONS: Record<string, React.ReactNode> = {
  "Free Parking":       <Car className="h-3.5 w-3.5" />,
  "Parking":            <Car className="h-3.5 w-3.5" />,
  "Cafe":               <Coffee className="h-3.5 w-3.5" />,
  "Pharmacy":           <Pill className="h-3.5 w-3.5" />,
  "ATM":                <Banknote className="h-3.5 w-3.5" />,
  "Click & Collect":    <ShoppingBag className="h-3.5 w-3.5" />,
  "Fresh Bakery":       <span className="text-[11px]">🥐</span>,
  "International Foods":<span className="text-[11px]">🌍</span>,
  "Wi-Fi":              <Wifi className="h-3.5 w-3.5" />,
};

function todayKey(): Day {
  const day = new Date().getDay();
  return DAYS[day === 0 ? 6 : day - 1];
}

/** Returns true if the current local time falls between "HH:MM" open and close strings. */
function isCurrentlyOpen(open: string, close: string): boolean {
  const now  = new Date();
  const mins = now.getHours() * 60 + now.getMinutes();
  const [oh, om] = open.split(":").map(Number);
  const [ch, cm] = close.split(":").map(Number);
  return mins >= oh * 60 + om && mins < ch * 60 + cm;
}

function StoreCard({ store }: { store: Store }) {
  const [expanded, setExpanded] = useState(false);
  const today = todayKey();
  const todayHours = store.openingHours?.[today];
  const isOpenNow =
    !!todayHours &&
    !todayHours.closed &&
    isCurrentlyOpen(todayHours.open, todayHours.close);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-5 pb-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base leading-tight">
              {store.name}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {store.address}, {store.city} {store.postcode}
            </p>
          </div>
          <span
            className={cn(
              "shrink-0 px-2 py-0.5 rounded-full text-[11px] font-bold",
              isOpenNow
                ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
                : "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400"
            )}
          >
            {isOpenNow ? "Open" : "Closed"}
          </span>
        </div>

        {/* Contact */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600 dark:text-gray-400 mb-3">
          <a href={`tel:${store.phone}`} className="flex items-center gap-1.5 hover:text-[#0F4C75] dark:hover:text-blue-400">
            <Phone className="h-3.5 w-3.5" /> {store.phone}
          </a>
          {store.email && (
            <a href={`mailto:${store.email}`} className="flex items-center gap-1.5 hover:text-[#0F4C75] dark:hover:text-blue-400">
              <Mail className="h-3.5 w-3.5" /> {store.email}
            </a>
          )}
        </div>

        {/* Today's hours */}
        {todayHours && (
          <div className="flex items-center gap-1.5 text-sm">
            <Clock className="h-3.5 w-3.5 text-gray-400 shrink-0" />
            <span className="font-medium text-gray-700 dark:text-gray-300">Today:</span>
            <span className="text-gray-600 dark:text-gray-400">
              {todayHours.closed ? "Closed" : `${todayHours.open} – ${todayHours.close}`}
            </span>
          </div>
        )}

        {/* Amenities */}
        {store.amenities.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {store.amenities.map((a) => (
              <span
                key={a}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[11px] font-medium"
              >
                {AMENITY_ICONS[a] ?? null}
                {a}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Full hours toggle */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between px-5 py-3 border-t border-gray-100 dark:border-gray-800 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <Clock className="h-4 w-4" /> Opening hours
        </span>
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {expanded && (
        <div className="px-5 pb-4 pt-2 space-y-1.5">
          {DAYS.map((day) => {
            const h = store.openingHours?.[day];
            const isToday = day === today;
            return (
              <div
                key={day}
                className={cn(
                  "flex justify-between text-sm",
                  isToday ? "font-semibold text-[#0F4C75] dark:text-blue-400" : "text-gray-600 dark:text-gray-400"
                )}
              >
                <span className="w-10">{DAY_LABELS[day]}</span>
                <span>{h ? (h.closed ? "Closed" : `${h.open} – ${h.close}`) : "—"}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function StoreLocatorPage() {
  const [stores,  setStores]  = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");

  useEffect(() => {
    async function load() {
      try {
        const { data } = await axios.get<{ success: boolean; data: Store[] }>("/api/stores");
        if (data.success) setStores(data.data);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return stores;
    return stores.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.city.toLowerCase().includes(q) ||
        s.postcode.toLowerCase().includes(q) ||
        s.address.toLowerCase().includes(q)
    );
  }, [stores, search]);

  const cities = useMemo(() => [...new Set(stores.map((s) => s.city))].sort(), [stores]);

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Hero */}
      <div className="bg-[#0F4C75] text-white py-12 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-white/10 rounded-2xl mb-4">
            <MapPin className="h-7 w-7" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-black mb-2">Find a Store</h1>
          <p className="text-blue-200 text-base mb-6">
            {stores.length} Prakash Supermarket locations across London
          </p>

          {/* Search */}
          <div className="relative max-w-lg mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, city or postcode…"
              className="w-full h-12 pl-10 pr-4 rounded-xl text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#F57C00]"
            />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* City filter chips */}
        {cities.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            <button
              onClick={() => setSearch("")}
              className={cn(
                "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                search === ""
                  ? "bg-[#0F4C75] text-white"
                  : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-[#0F4C75] hover:text-[#0F4C75]"
              )}
            >
              All ({stores.length})
            </button>
            {cities.map((city) => (
              <button
                key={city}
                onClick={() => setSearch(city)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                  search.toLowerCase() === city.toLowerCase()
                    ? "bg-[#0F4C75] text-white"
                    : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-[#0F4C75] hover:text-[#0F4C75]"
                )}
              >
                {city}
              </button>
            ))}
          </div>
        )}

        {/* Results */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-56 rounded-2xl bg-gray-200 dark:bg-gray-800 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-500 dark:text-gray-400">
            <MapPin className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-semibold text-lg">No stores found</p>
            <p className="text-sm">Try a different city or postcode</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((store) => (
              <StoreCard key={store._id} store={store} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
