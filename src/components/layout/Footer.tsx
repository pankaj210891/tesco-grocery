import Link from "next/link";
import { Store } from "lucide-react";

const footerLinks = {
  Shop: [
    { label: "Fresh Food",           href: "/categories/fresh-food"        },
    { label: "Bakery",               href: "/categories/bakery"             },
    { label: "Drinks",               href: "/categories/drinks"             },
    { label: "Treats & Snacks",      href: "/categories/treats-snacks"      },
    { label: "Electronics & Gaming", href: "/categories/electronics-gaming" },
    { label: "All Departments",      href: "/categories"                    },
  ],
  Help: [
    { label: "FAQs",                 href: "/faq"              },
    { label: "Store Locator",        href: "/store-locator"    },
    { label: "Track Your Order",     href: "/account/orders"   },
    { label: "Delivery Information", href: "/faq#delivery"     },
    { label: "Returns Policy",       href: "/faq#returns"      },
    { label: "Contact Us",           href: "/faq#contact"      },
  ],
  About: [
    { label: "About Prakash",          href: "#" },
    { label: "Careers",                href: "#" },
    { label: "Corporate Responsibility",href: "#"},
    { label: "Privacy Policy",         href: "#" },
    { label: "Terms & Conditions",     href: "#" },
  ],
};

export default function Footer() {
  return (
    <footer className="bg-[#0A3352] dark:bg-gray-950 text-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">

          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="bg-white rounded-lg px-2.5 py-1.5 flex items-center gap-1.5">
                <Store className="h-4 w-4 text-[#F57C00]" aria-hidden />
                <span className="text-[#0F4C75] font-black text-lg tracking-tight leading-none">
                  Prakash
                </span>
              </div>
              <span className="text-blue-300 text-sm font-medium">Supermarket</span>
            </div>
            <p className="text-blue-200 text-sm leading-relaxed">
              Fresh food, quality products and everyday value — all in one place.
              Serving families across the UK with pride.
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

        <div className="border-t border-blue-800 dark:border-gray-800 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-blue-300 text-sm">
            &copy; {new Date().getFullYear()} Prakash Supermarket Ltd. All rights reserved.
          </p>
          <p className="text-blue-400 text-xs">
            Built with Next.js &amp; TypeScript
          </p>
        </div>
      </div>
    </footer>
  );
}
