import { Truck, RotateCcw, ShieldCheck, Tag } from "lucide-react";

const perks = [
  {
    icon: Truck,
    title: "Free Delivery",
    desc: "On orders over ₹500",
  },
  {
    icon: RotateCcw,
    title: "Easy Returns",
    desc: "30-day hassle-free returns",
  },
  {
    icon: ShieldCheck,
    title: "Quality Guaranteed",
    desc: "Fresh or your money back",
  },
  {
    icon: Tag,
    title: "Clubcard Prices",
    desc: "Exclusive member savings",
  },
];

export default function PromoStrip() {
  return (
    <section
      className="bg-[#00539F]"
      aria-label="Shopping benefits"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <ul className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {perks.map(({ icon: Icon, title, desc }) => (
            <li key={title} className="flex items-center gap-3">
              <Icon className="h-6 w-6 text-white shrink-0" aria-hidden />
              <div>
                <p className="text-white text-sm font-bold leading-tight">{title}</p>
                <p className="text-blue-200 text-xs">{desc}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
