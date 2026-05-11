import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface StatsCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color: "blue" | "green" | "purple" | "orange" | "red";
  sub?: string;
}

const COLOR_MAP = {
  blue:   { bg: "bg-blue-50 dark:bg-blue-950/40",   icon: "bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400",   text: "text-blue-700 dark:text-blue-300" },
  green:  { bg: "bg-green-50 dark:bg-green-950/40", icon: "bg-green-100 dark:bg-green-900/60 text-green-600 dark:text-green-400", text: "text-green-700 dark:text-green-300" },
  purple: { bg: "bg-purple-50 dark:bg-purple-950/40",icon:"bg-purple-100 dark:bg-purple-900/60 text-purple-600 dark:text-purple-400",text:"text-purple-700 dark:text-purple-300"},
  orange: { bg: "bg-orange-50 dark:bg-orange-950/40",icon:"bg-orange-100 dark:bg-orange-900/60 text-orange-600 dark:text-orange-400",text:"text-orange-700 dark:text-orange-300"},
  red:    { bg: "bg-red-50 dark:bg-red-950/40",     icon: "bg-red-100 dark:bg-red-900/60 text-red-600 dark:text-red-400",       text: "text-red-700 dark:text-red-300" },
};

export default function StatsCard({ label, value, icon: Icon, color, sub }: StatsCardProps) {
  const c = COLOR_MAP[color];
  return (
    <div className={cn("rounded-xl p-5 flex items-center gap-4", c.bg)}>
      <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center shrink-0", c.icon)}>
        <Icon className="h-6 w-6" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide truncate">{label}</p>
        <p className={cn("text-2xl font-black", c.text)}>{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}
