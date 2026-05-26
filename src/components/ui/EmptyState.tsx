import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface EmptyStateProps {
  icon:         LucideIcon;
  title:        string;
  description?: string;
  action?:      React.ReactNode;
  className?:   string;
  iconBg?:      string;
  iconColor?:   string;
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  iconBg    = "bg-gray-100 dark:bg-gray-800",
  iconColor = "text-gray-400 dark:text-gray-500",
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-14 px-4 text-center",
        className,
      )}
    >
      <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-4", iconBg)}>
        <Icon className={cn("h-7 w-7", iconColor)} aria-hidden />
      </div>
      <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-1.5">{title}</h3>
      {description && (
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
