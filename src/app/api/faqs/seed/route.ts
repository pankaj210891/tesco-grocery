import { NextResponse } from "next/server";

const FAQS = [
  // General
  { category: "general", order: 1, question: "What is Prakash Supermarket?", answer: "Prakash Supermarket is a family-run supermarket chain offering a wide range of groceries, fresh food, international produce, and household essentials across London and the surrounding areas." },
  { category: "general", order: 2, question: "Where are your stores located?", answer: "We have stores in Wembley, Harrow, Southall, Ealing, Hayes, and Greenford. Visit our Store Locator page for opening hours, addresses, and directions." },
  { category: "general", order: 3, question: "Do you offer a loyalty programme?", answer: "Yes! Our Prakash Rewards card lets you earn points on every purchase. Points can be redeemed for discounts on future orders. Sign up in-store or via your account page." },

  // Account
  { category: "account", order: 1, question: "How do I create an account?", answer: "Click 'Sign in' in the top navigation, then select 'Create account'. Enter your name, email address, and a secure password. You'll receive a confirmation email shortly." },
  { category: "account", order: 2, question: "I forgot my password. How do I reset it?", answer: "On the sign-in page, click 'Forgot password?' and enter your registered email address. We'll send you a link to reset your password within a few minutes." },
  { category: "account", order: 3, question: "How do I update my personal details?", answer: "Log into your account and go to 'My Account'. From there you can update your name, email address, phone number, and saved addresses." },
  { category: "account", order: 4, question: "Can I save multiple delivery addresses?", answer: "Yes. You can save up to 5 delivery addresses in your account. During checkout you can select any saved address or add a new one." },

  // Orders
  { category: "orders", order: 1, question: "How do I track my order?", answer: "Once your order is confirmed, you'll receive a confirmation email with your order number. You can also view all orders and their current status on your 'Orders' page in your account." },
  { category: "orders", order: 2, question: "Can I cancel or modify my order?", answer: "Orders can be cancelled or modified within 30 minutes of placing them. After that, we begin processing them for dispatch. Contact our customer care team immediately if you need to make changes." },
  { category: "orders", order: 3, question: "What if an item in my order is out of stock?", answer: "We'll notify you by email if any items become unavailable. You can choose a substitute or receive a full refund for those items." },
  { category: "orders", order: 4, question: "Is there a minimum order value?", answer: "There is no minimum order value for standard orders. However, free delivery applies to orders over £50. Orders under £50 attract a £3.99 delivery fee." },

  // Delivery
  { category: "delivery", order: 1, question: "What are your delivery options?", answer: "We offer standard delivery (2–3 working days) and next-day delivery. You can also select Click & Collect at selected stores to pick up your order at no extra charge." },
  { category: "delivery", order: 2, question: "How much does delivery cost?", answer: "Standard delivery is £3.99 for orders under £50. Orders over £50 qualify for free standard delivery. Next-day delivery costs £5.99 regardless of order value." },
  { category: "delivery", order: 3, question: "Do you deliver on weekends?", answer: "Yes, we deliver 7 days a week including Sundays. Delivery slots on Sundays may be more limited, so we recommend booking in advance." },
  { category: "delivery", order: 4, question: "What is Click & Collect?", answer: "Click & Collect lets you order online and pick up from a Prakash Supermarket store at your convenience — completely free of charge. Available at all six of our London locations." },

  // Payments
  { category: "payments", order: 1, question: "What payment methods do you accept?", answer: "We accept Visa, Mastercard, American Express, and Discover credit/debit cards. You can save multiple cards to your account for faster checkout." },
  { category: "payments", order: 2, question: "Is my payment information secure?", answer: "Yes. We use industry-standard encryption (TLS) to protect all payment data. We never store your full card number — only the last four digits and expiry date for your reference." },
  { category: "payments", order: 3, question: "Can I use a promo code?", answer: "Yes. Enter your promo code at checkout in the 'Promo code' field. The discount will be applied to your order total before payment. Only one promo code can be used per order." },
  { category: "payments", order: 4, question: "When is my card charged?", answer: "Your card is charged when your order is confirmed, not when you place it. If any items are unavailable, you'll only be charged for items that are fulfilled." },

  // Returns
  { category: "returns", order: 1, question: "What is your returns policy?", answer: "We accept returns on non-perishable items within 14 days of purchase, provided they are unused and in original packaging. Fresh and frozen foods cannot be returned unless faulty." },
  { category: "returns", order: 2, question: "How do I return an item?", answer: "Bring the item to any Prakash Supermarket store with your receipt or order confirmation email. Alternatively, contact our customer care team to arrange a collection." },
  { category: "returns", order: 3, question: "How long do refunds take?", answer: "Refunds are processed within 3–5 working days once we have received and inspected the returned item. The refund will appear on your original payment method." },
  { category: "returns", order: 4, question: "What if my order arrives damaged?", answer: "We're sorry to hear that. Please contact us within 48 hours of delivery with a photo of the damaged item. We'll arrange a replacement or full refund at no cost to you." },
];

export async function POST() {
  try {
    const { connectDB } = await import("@/lib/db/mongoose");
    await connectDB();
    const FaqModel = (await import("@/lib/db/models/faq.model")).default;

    await FaqModel.deleteMany({});
    await FaqModel.insertMany(FAQS);

    return NextResponse.json({ success: true, message: `Seeded ${FAQS.length} FAQs` });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Seed failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
