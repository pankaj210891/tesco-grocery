import { Truck, RotateCcw, ShieldCheck, Tag } from "lucide-react";

const perks = [
  {
    Icon:  Truck,
    title: "Free Delivery",
    desc:  "On orders over ₹500",
    color: "text-emerald-400",
    bg:    "bg-emerald-400/10",
  },
  {
    Icon:  RotateCcw,
    title: "Easy Returns",
    desc:  "30-day hassle-free",
    color: "text-sky-400",
    bg:    "bg-sky-400/10",
  },
  {
    Icon:  ShieldCheck,
    title: "Quality Guaranteed",
    desc:  "Fresh or money back",
    color: "text-violet-400",
    bg:    "bg-violet-400/10",
  },
  {
    Icon:  Tag,
    title: "Clubcard Prices",
    desc:  "Exclusive member savings",
    color: "text-amber-400",
    bg:    "bg-amber-400/10",
  },
] as const;

export default function PromoStrip() {
  return (
    <section className="bg-[#0A3352] border-b border-white/10" aria-label="Shopping benefits">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
        <ul className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {perks.map(({ Icon, title, desc, color, bg }) => (
            <li
              key={title}
              className="group flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors cursor-default"
            >
              <div className={`shrink-0 w-9 h-9 rounded-xl ${bg} flex items-center justify-center transition-transform group-hover:scale-110 duration-200`}>
                <Icon className={`${color}`} aria-hidden style={{ width: "1.125rem", height: "1.125rem" }} />
              </div>
              <div>
                <p className="text-white text-xs sm:text-sm font-bold leading-tight">{title}</p>
                <p className="text-blue-300 text-[11px] sm:text-xs leading-tight mt-0.5">{desc}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
