import type { TourStep } from "./OnboardingTour";

export const ADMIN_TOUR_STEPS: TourStep[] = [
  {
    title:       "Welcome to your Admin Dashboard",
    description: "This is your command centre. Here you can see live stats, recent orders, and low-stock alerts — all updated in real time via Server-Sent Events.",
  },
  {
    title:       "Manage Products & Vendors",
    description: "Use the Products section to approve or reject vendor-submitted listings. Vendors can only sell after you approve their products.",
  },
  {
    title:       "Revenue Analytics",
    description: "Visit Analytics → Revenue for platform-wide financial charts. Filter by 7 days, 30 days, 3 months, or 12 months to see gross revenue, platform commission, and vendor payouts.",
  },
  {
    title:       "Invite Vendors",
    description: "Go to Vendors → Invite to send onboarding emails. Vendors receive a secure token link and complete a 3-step wizard to activate their store.",
  },
  {
    title:       "Promo Codes & Offers",
    description: "Create and manage discount codes in Promo Codes. You can set percentage or fixed discounts, expiry dates, per-user limits, and category restrictions.",
  },
  {
    title:       "Homepage Customisation",
    description: "The Homepage Sections editor lets you reorder, enable/disable, and customise every section on the storefront — hero banners, carousels, offers, and brand grids.",
  },
];
