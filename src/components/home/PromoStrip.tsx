import { Truck, RotateCcw, ShieldCheck, Tag } from "lucide-react";

const perks = [
  {
    Icon:  Truck,
    title: "Free Delivery",
    desc:  "On orders over ₹500",
    iconBg: "bg-amber-50 dark:bg-amber-950/30",
    iconColor: "text-[#FCA311]",
  },
  {
    Icon:  RotateCcw,
    title: "Easy Returns",
    desc:  "30-day hassle-free",
    iconBg: "bg-green-50 dark:bg-green-950/30",
    iconColor: "text-green-600",
  },
  {
    Icon:  ShieldCheck,
    title: "Quality Guaranteed",
    desc:  "Fresh or money back",
    iconBg: "bg-blue-50 dark:bg-blue-950/30",
    iconColor: "text-blue-600 dark:text-blue-400",
  },
  {
    Icon:  Tag,
    title: "Member Savings",
    desc:  "Exclusive club prices",
    iconBg: "bg-purple-50 dark:bg-purple-950/30",
    iconColor: "text-purple-600",
  },
] as const;

export default function PromoStrip() {
  return (
    <section
      className="bg-white dark:bg-gray-900 border-y border-gray-100 dark:border-gray-800"
      aria-label="Shopping benefits"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <ul className="grid grid-cols-2 lg:grid-cols-4 gap-1">
          {perks.map(({ Icon, title, desc, iconBg, iconColor }) => (
            <li
              key={title}
              className="group flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-default"
            >
              <div className={`shrink-0 w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center transition-transform group-hover:scale-110 duration-200`}>
                <Icon className={`${iconColor} h-5 w-5`} aria-hidden />
              </div>
              <div>
                <p className="text-gray-900 dark:text-gray-100 text-sm font-bold leading-tight">{title}</p>
                <p className="text-gray-500 dark:text-gray-400 text-xs leading-tight mt-0.5">{desc}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
