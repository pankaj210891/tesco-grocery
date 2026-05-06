import Link from "next/link";

const footerLinks = {
  Shop: [
    { label: "Fresh Food", href: "/categories/fresh-food" },
    { label: "Bakery", href: "/categories/bakery" },
    { label: "Dairy & Eggs", href: "/categories/dairy-eggs" },
    { label: "Drinks", href: "/categories/drinks" },
    { label: "Snacks", href: "/categories/snacks" },
  ],
  Help: [
    { label: "FAQs", href: "#" },
    { label: "Track Your Order", href: "#" },
    { label: "Delivery Information", href: "#" },
    { label: "Returns Policy", href: "#" },
    { label: "Contact Us", href: "#" },
  ],
  About: [
    { label: "About Tesco", href: "#" },
    { label: "Careers", href: "#" },
    { label: "Corporate Responsibility", href: "#" },
    { label: "Privacy Policy", href: "#" },
    { label: "Terms & Conditions", href: "#" },
  ],
};

export default function Footer() {
  return (
    <footer className="bg-[#003B7A] text-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="bg-white rounded px-2 py-0.5">
                <span className="text-[#00539F] font-black text-xl tracking-tight">
                  Tesco
                </span>
              </div>
            </div>
            <p className="text-blue-200 text-sm leading-relaxed">
              Every little helps. Fresh food, quality products, and everyday low
              prices delivered to your door.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([heading, links]) => (
            <div key={heading}>
              <h3 className="font-semibold text-sm uppercase tracking-wider mb-4 text-blue-100">
                {heading}
              </h3>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-blue-200 text-sm hover:text-white transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-blue-700 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-blue-300 text-sm">
            &copy; {new Date().getFullYear()} Tesco PLC. All rights reserved.
          </p>
          <p className="text-blue-400 text-xs">
            Built with Next.js &amp; TypeScript
          </p>
        </div>
      </div>
    </footer>
  );
}
