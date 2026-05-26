import type { TourStep } from "./OnboardingTour";

export const VENDOR_TOUR_STEPS: TourStep[] = [
  {
    title:       "Welcome to your Vendor Dashboard",
    description: "This is your seller hub. You can see your order count, revenue, and pending orders at a glance.",
  },
  {
    title:       "List Your Products",
    description: "Go to Products to add new listings. Fill in the name, description, images, price, and variants. Your listing goes live after admin approval.",
  },
  {
    title:       "Manage Your Orders",
    description: "The Orders section shows all orders containing your products. You can accept, reject, or update order status as items are prepared and dispatched.",
  },
  {
    title:       "Track Your Earnings",
    description: "Earnings shows your pending and released payouts. The platform retains a configurable commission percentage — the remainder is your net payout.",
  },
  {
    title:       "View Your Analytics",
    description: "Analytics gives you a monthly revenue chart and a breakdown of your top-selling products. Use it to identify what's working.",
  },
];
