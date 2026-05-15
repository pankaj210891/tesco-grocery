"use client";

import { useState } from "react";
import Link from "next/link";
import { Store, Mail, ArrowRight, CheckCircle2, Phone, MapPin } from "lucide-react";

function IconFacebook() {
  return <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></svg>;
}
function IconInstagram() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden><rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" /></svg>;
}
function IconTwitter() {
  return <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" /></svg>;
}
function IconYoutube() {
  return <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden><path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58a2.78 2.78 0 0 0 1.95 1.95C5.12 20 12 20 12 20s6.88 0 8.59-.47a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58zM9.75 15.02V8.98L15.5 12l-5.75 3.02z" /></svg>;
}

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
    { label: "Help Centre",          href: "/help"          },
    { label: "Store Locator",        href: "/store-locator" },
    { label: "Special Offers",       href: "/offers"        },
    { label: "Track Your Order",     href: "/account"       },
    { label: "Delivery Information", href: "/help"          },
    { label: "Returns Policy",       href: "/help"          },
  ],
  About: [
    { label: "About Prakash",            href: "#" },
    { label: "Careers",                  href: "#" },
    { label: "Corporate Responsibility", href: "#" },
    { label: "Privacy Policy",           href: "#" },
    { label: "Terms & Conditions",       href: "#" },
  ],
};

const SOCIALS = [
  { label: "Facebook",  Icon: IconFacebook,  href: "#" },
  { label: "Instagram", Icon: IconInstagram, href: "#" },
  { label: "Twitter",   Icon: IconTwitter,   href: "#" },
  { label: "YouTube",   Icon: IconYoutube,   href: "#" },
];

const AMBER = "#FCA311";

export default function Footer() {
  const [email,     setEmail]     = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubscribe(e: React.FormEvent) {
    e.preventDefault();
    if (email.trim()) {
      setSubmitted(true);
      setEmail("");
    }
  }

  return (
    <footer className="bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 mt-auto">

      {/* Newsletter banner */}
      <div className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl shrink-0" style={{ backgroundColor: "#FCA311" + "18" }}>
                <Mail className="h-6 w-6" style={{ color: AMBER }} aria-hidden />
              </div>
              <div>
                <p className="font-black text-lg text-gray-900 dark:text-white">
                  Get exclusive deals in your inbox
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  Join 50,000+ Prakash shoppers. Unsubscribe anytime.
                </p>
              </div>
            </div>

            {submitted ? (
              <div className="flex items-center gap-2 text-green-600 font-semibold shrink-0">
                <CheckCircle2 className="h-5 w-5" aria-hidden />
                Thanks! You&apos;re subscribed.
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="flex items-center gap-2 w-full sm:w-auto">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your email address"
                  required
                  aria-label="Email address for newsletter"
                  className="flex-1 sm:w-64 h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 text-base md:text-sm focus:outline-none focus:border-[#FCA311] focus:ring-2 focus:ring-[#FCA311]/20 transition-colors"
                />
                <button
                  type="submit"
                  className="h-11 px-5 text-white text-sm font-bold rounded-xl transition-colors transition-transform flex items-center gap-1.5 shrink-0 active:scale-95 hover:brightness-105"
                  style={{ backgroundColor: AMBER }}
                >
                  Subscribe
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Main grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">

          {/* Brand col */}
          <div>
            <Link href="/" aria-label="Prakash Supermarket — Home">
              <div className="inline-flex items-center gap-2 mb-5">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: AMBER }}
                >
                  <Store className="h-4 w-4 text-white" aria-hidden />
                </div>
                <div className="leading-none">
                  <span className="font-black text-xl tracking-tight text-gray-900 dark:text-white">Prakash</span>
                  <span className="block text-[10px] font-medium text-gray-400 tracking-wide">SUPERMARKET</span>
                </div>
              </div>
            </Link>

            <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed mb-5">
              Fresh food, quality products and everyday value — all in one place.
              Serving families with pride.
            </p>

            {/* Contact info */}
            <div className="space-y-2 mb-5">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Phone className="h-4 w-4 shrink-0" style={{ color: AMBER }} />
                +91 98765 43210
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <MapPin className="h-4 w-4 shrink-0" style={{ color: AMBER }} />
                Mumbai, Maharashtra, India
              </div>
            </div>

            {/* Payment methods */}
            <div className="mb-5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">We accept</p>
              <div className="flex flex-wrap gap-2">
                {["Visa", "Mastercard", "Razorpay", "UPI", "COD"].map((m) => (
                  <span key={m} className="px-2.5 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-semibold text-gray-600 dark:text-gray-400">
                    {m}
                  </span>
                ))}
              </div>
            </div>

            {/* Socials */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">Follow us</p>
              <div className="flex gap-2">
                {SOCIALS.map(({ label, Icon, href }) => (
                  <a
                    key={label}
                    href={href}
                    aria-label={label}
                    className="w-9 h-9 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-white hover:border-[#FCA311] transition-colors transition-shadow duration-200"
                    style={{}}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = AMBER; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = ""; }}
                  >
                    <Icon />
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([heading, links]) => (
            <div key={heading}>
              <h3 className="text-sm font-black text-gray-900 dark:text-gray-100 mb-4">
                {heading}
              </h3>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-gray-500 dark:text-gray-400 text-sm hover:text-[#FCA311] dark:hover:text-[#FCA311] transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="border-t border-gray-200 dark:border-gray-800 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-gray-400 dark:text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} Prakash Supermarket. All rights reserved.
          </p>
          <div className="flex items-center gap-5">
            <Link href="#" className="text-gray-400 text-xs hover:text-gray-600 dark:hover:text-gray-200 transition-colors">Privacy</Link>
            <Link href="#" className="text-gray-400 text-xs hover:text-gray-600 dark:hover:text-gray-200 transition-colors">Terms</Link>
            <Link href="#" className="text-gray-400 text-xs hover:text-gray-600 dark:hover:text-gray-200 transition-colors">Cookies</Link>
            <span className="text-gray-300 dark:text-gray-600 text-xs">Built with Next.js</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
