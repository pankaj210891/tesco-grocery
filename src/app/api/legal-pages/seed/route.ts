import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import LegalPage from "@/lib/db/models/legal-page.model";
import { requireAdmin } from "@/lib/utils/apiAuth";

const TERMS_DATA = {
  slug: "terms",
  title: "Terms & Conditions",
  introText:
    "Welcome to Prakash Supermarket. By accessing or using our website and services, you agree to be bound by these Terms & Conditions. Please read them carefully before placing any order or using any feature of our platform. If you do not agree with any part of these terms, please do not use our services.",
  lastUpdated: new Date("2025-01-15T00:00:00.000Z"),
  effectiveDate: new Date("2025-02-01T00:00:00.000Z"),
  version: "2.1",
  isPublished: true,
  sections: [
    {
      id: "acceptance",
      title: "1. Acceptance of Terms",
      order: 1,
      blocks: [
        {
          type: "paragraph",
          text: "By creating an account, placing an order, or otherwise accessing the Prakash Supermarket website (\"Site\") or mobile application, you acknowledge that you have read, understood, and agree to be legally bound by these Terms & Conditions, our Privacy Policy, and any other policies referenced herein.",
        },
        {
          type: "paragraph",
          text: "These terms apply to all visitors, registered users, and any other person who accesses or uses the Site. If you are using the platform on behalf of a business entity, you represent that you have the authority to bind that entity to these terms.",
        },
        {
          type: "highlight",
          text: "You must be at least 18 years of age to use our services and create an account. By using the Site, you confirm that you meet this age requirement.",
        },
      ],
    },
    {
      id: "account",
      title: "2. Account Registration & Security",
      order: 2,
      blocks: [
        {
          type: "paragraph",
          text: "To access certain features such as order tracking, saved addresses, and wish lists, you must register for an account. When registering, you agree to provide accurate, current, and complete information.",
        },
        {
          type: "subheading",
          text: "Your Responsibilities",
        },
        {
          type: "bulletList",
          items: [
            "Maintain the confidentiality of your account password and login credentials.",
            "Not share your account with any third party.",
            "Notify us immediately at support@prakashsupermarket.co.uk if you suspect any unauthorised use of your account.",
            "Keep your personal information, including delivery addresses and payment details, up to date.",
            "Ensure all information you provide is truthful and not misleading.",
          ],
        },
        {
          type: "paragraph",
          text: "Prakash Supermarket reserves the right to suspend or terminate any account found to be in violation of these terms, engaged in fraudulent activity, or where we have reasonable grounds to suspect misuse.",
        },
      ],
    },
    {
      id: "products-pricing",
      title: "3. Products, Pricing & Availability",
      order: 3,
      blocks: [
        {
          type: "paragraph",
          text: "All prices displayed on the Site are in Indian Rupees (₹) and include applicable GST unless otherwise stated. Prices are subject to change without prior notice. We strive to ensure all pricing information is accurate; however, in the event of a pricing error, we reserve the right to cancel or adjust the affected orders.",
        },
        {
          type: "subheading",
          text: "Product Availability",
        },
        {
          type: "paragraph",
          text: "Product availability is subject to change. We make every effort to keep our inventory accurate; however, on rare occasions, an item may be out of stock after your order has been placed. In such cases, we will contact you promptly and offer a suitable substitute, a credit, or a full refund.",
        },
        {
          type: "bulletList",
          items: [
            "Product images are for illustrative purposes and may differ slightly from actual items.",
            "We reserve the right to limit quantities purchased per customer.",
            "Promotional pricing may be subject to additional terms and conditions.",
            "Weight-based products may carry slight variations in final price due to natural variance.",
            "Bundle offers apply only when all items in the bundle are available.",
          ],
        },
        {
          type: "highlight",
          text: "Vendor products on our marketplace are fulfilled by independent sellers. Prakash Supermarket acts as an intermediary platform and is not the seller of record for such items. Each vendor is solely responsible for the accuracy of their product listings.",
        },
      ],
    },
    {
      id: "orders-payment",
      title: "4. Orders & Payment",
      order: 4,
      blocks: [
        {
          type: "paragraph",
          text: "An order placed on our Site constitutes an offer to purchase the selected products. We reserve the right to accept or decline any order at our discretion. An order is confirmed only when you receive a confirmation email containing your order number.",
        },
        {
          type: "subheading",
          text: "Accepted Payment Methods",
        },
        {
          type: "bulletList",
          items: [
            "Credit and Debit Cards (Visa, Mastercard, RuPay)",
            "UPI (Unified Payments Interface)",
            "Razorpay secure payment gateway",
            "Cash on Delivery (COD) — subject to a ₹49 convenience fee for orders under ₹499",
            "Net Banking through supported banks",
          ],
        },
        {
          type: "paragraph",
          text: "All online payments are processed through Razorpay, a PCI-DSS compliant payment gateway. Prakash Supermarket does not store your full card details on our servers. In the event of a payment failure, your order will not be processed. Please retry or contact your bank.",
        },
        {
          type: "subheading",
          text: "GST & Invoicing",
        },
        {
          type: "paragraph",
          text: "A GST-compliant invoice will be generated for every order and made available in your account under Order History. GST rates vary by product category as per Indian tax regulations. The applicable tax will be displayed at checkout before you confirm your order.",
        },
      ],
    },
    {
      id: "delivery",
      title: "5. Delivery & Collection",
      order: 5,
      blocks: [
        {
          type: "paragraph",
          text: "Prakash Supermarket offers home delivery and store collection options. Delivery timeframes and charges are displayed at checkout and may vary based on your location, chosen delivery slot, and order value.",
        },
        {
          type: "subheading",
          text: "Delivery Policy",
        },
        {
          type: "bulletList",
          items: [
            "Standard delivery: 2–5 business days.",
            "Express delivery: Same day or next day, subject to availability and location.",
            "Free delivery on orders above ₹999.",
            "Delivery charges for orders below ₹999 will be displayed at checkout.",
            "Delivery slots must be selected during checkout and are subject to availability.",
            "We are not responsible for delays caused by incorrect addresses or recipient unavailability.",
          ],
        },
        {
          type: "paragraph",
          text: "For perishable and fresh goods, someone must be available at the delivery address during the selected time slot. If a delivery attempt is unsuccessful, we will contact you to reschedule. Perishable goods that cannot be redelivered may be discarded, and a refund will be issued at our discretion.",
        },
        {
          type: "highlight",
          text: "Delivery is currently available in select cities across Maharashtra, Karnataka, and Delhi NCR. We are actively expanding. Enter your postcode at checkout to confirm delivery availability in your area.",
        },
      ],
    },
    {
      id: "returns-refunds",
      title: "6. Returns, Refunds & Cancellations",
      order: 6,
      blocks: [
        {
          type: "paragraph",
          text: "We want you to be completely satisfied with every purchase. If you are not happy with an item, we offer a straightforward returns process.",
        },
        {
          type: "subheading",
          text: "Eligibility for Returns",
        },
        {
          type: "bulletList",
          items: [
            "Items must be returned within 7 days of delivery.",
            "Perishable goods (fresh produce, dairy, meat) are non-returnable unless damaged or defective on delivery.",
            "Returned items must be in their original packaging and unused condition.",
            "Proof of purchase (order number) must be provided.",
            "Personal care and hygiene products cannot be returned once opened.",
          ],
        },
        {
          type: "subheading",
          text: "Refund Timelines",
        },
        {
          type: "bulletList",
          items: [
            "Online payments: Refund within 5–7 business days to the original payment method.",
            "COD orders: Refund via bank transfer within 7–10 business days.",
            "Wallet credits: Instant, upon approval of the return.",
          ],
        },
        {
          type: "subheading",
          text: "Cancellations",
        },
        {
          type: "paragraph",
          text: "You may cancel an order before it moves to the 'Preparing' stage. Once an order is being prepared or has been dispatched, it cannot be cancelled. To cancel, visit your Account > Orders and select the relevant order.",
        },
      ],
    },
    {
      id: "intellectual-property",
      title: "7. Intellectual Property",
      order: 7,
      blocks: [
        {
          type: "paragraph",
          text: "All content on the Prakash Supermarket Site, including but not limited to logos, text, images, graphics, product descriptions, audio/visual content, and the overall look and feel, is the intellectual property of Prakash Supermarket Private Limited or its licensors.",
        },
        {
          type: "bulletList",
          items: [
            "You may not copy, reproduce, distribute, or create derivative works from our content without prior written permission.",
            "The Prakash Supermarket name, logo, and brand marks are registered trademarks.",
            "User-generated content (such as product reviews) remains the intellectual property of the author but grants Prakash Supermarket a non-exclusive licence to display and use such content.",
          ],
        },
      ],
    },
    {
      id: "prohibited-activities",
      title: "8. Prohibited Activities",
      order: 8,
      blocks: [
        {
          type: "paragraph",
          text: "When using our Site and services, you agree not to engage in any of the following prohibited activities:",
        },
        {
          type: "numberedList",
          items: [
            "Engaging in fraudulent transactions or using stolen payment information.",
            "Attempting to gain unauthorised access to our systems, databases, or other user accounts.",
            "Using automated scripts, bots, or scrapers to access or collect data from the Site.",
            "Posting false, misleading, or defamatory reviews or content.",
            "Submitting multiple accounts to exploit promotional offers.",
            "Engaging in any activity that disrupts or impairs the normal functioning of the Site.",
            "Reselling products purchased at promotional prices for commercial gain without authorisation.",
            "Impersonating another user, customer, or employee of Prakash Supermarket.",
          ],
        },
        {
          type: "paragraph",
          text: "Violation of these terms may result in immediate account suspension, cancellation of pending orders, and legal action where warranted.",
        },
      ],
    },
    {
      id: "disclaimer",
      title: "9. Disclaimer of Warranties",
      order: 9,
      blocks: [
        {
          type: "paragraph",
          text: "The Site and its services are provided on an \"as is\" and \"as available\" basis without any warranties of any kind, express or implied. Prakash Supermarket does not warrant that:",
        },
        {
          type: "bulletList",
          items: [
            "The Site will be uninterrupted, error-free, or free from viruses or other harmful components.",
            "The accuracy, completeness, or timeliness of product information, prices, or availability.",
            "Results obtained from using the service will meet your expectations.",
          ],
        },
        {
          type: "paragraph",
          text: "To the maximum extent permitted by applicable law, we disclaim all warranties whether express, implied, statutory, or otherwise.",
        },
      ],
    },
    {
      id: "limitation-liability",
      title: "10. Limitation of Liability",
      order: 10,
      blocks: [
        {
          type: "paragraph",
          text: "To the fullest extent permitted by law, Prakash Supermarket, its directors, employees, partners, and affiliates shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of our services.",
        },
        {
          type: "highlight",
          text: "Our total liability to you in connection with any single claim or series of related claims shall not exceed the amount you paid for the specific transaction giving rise to that claim.",
        },
        {
          type: "paragraph",
          text: "This limitation does not exclude liability for death or personal injury caused by our negligence, fraudulent misrepresentation, or any other liability that cannot be excluded under applicable law.",
        },
      ],
    },
    {
      id: "governing-law",
      title: "11. Governing Law & Jurisdiction",
      order: 11,
      blocks: [
        {
          type: "paragraph",
          text: "These Terms & Conditions shall be governed by and construed in accordance with the laws of India. Any disputes arising in connection with these terms shall be subject to the exclusive jurisdiction of the courts of Mumbai, Maharashtra.",
        },
        {
          type: "paragraph",
          text: "We encourage you to first contact our customer support team at support@prakashsupermarket.co.uk to resolve any disputes amicably before initiating legal proceedings.",
        },
      ],
    },
    {
      id: "changes-terms",
      title: "12. Changes to These Terms",
      order: 12,
      blocks: [
        {
          type: "paragraph",
          text: "Prakash Supermarket reserves the right to update or modify these Terms & Conditions at any time. We will notify users of material changes by posting a prominent notice on the Site or by sending an email to registered users.",
        },
        {
          type: "paragraph",
          text: "Your continued use of the Site following the posting of changes constitutes your acceptance of the revised terms. We recommend reviewing this page periodically to stay informed of any updates.",
        },
      ],
    },
    {
      id: "contact-terms",
      title: "13. Contact Us",
      order: 13,
      blocks: [
        {
          type: "paragraph",
          text: "If you have any questions about these Terms & Conditions, please contact us:",
        },
        {
          type: "bulletList",
          items: [
            "Email: legal@prakashsupermarket.co.uk",
            "Customer Support: support@prakashsupermarket.co.uk",
            "Phone: +91 98765 43210 (Mon–Sat, 9am–6pm IST)",
            "Address: Prakash Supermarket Pvt. Ltd., Bandra Kurla Complex, Mumbai – 400051, Maharashtra, India",
          ],
        },
      ],
    },
  ],
};

const PRIVACY_DATA = {
  slug: "privacy",
  title: "Privacy Policy",
  introText:
    "At Prakash Supermarket, we are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, share, and safeguard your data when you visit our website or use our services. Please read this policy carefully. If you disagree with its terms, please discontinue your use of our Site.",
  lastUpdated: new Date("2025-01-20T00:00:00.000Z"),
  effectiveDate: new Date("2025-02-01T00:00:00.000Z"),
  version: "2.0",
  isPublished: true,
  sections: [
    {
      id: "introduction",
      title: "1. Introduction",
      order: 1,
      blocks: [
        {
          type: "paragraph",
          text: "Prakash Supermarket Private Limited (\"we\", \"us\", or \"our\") operates the website at www.prakashsupermarket.co.uk and related mobile applications. This Privacy Policy applies to all personal data collected through these channels.",
        },
        {
          type: "paragraph",
          text: "We comply with applicable Indian data protection laws, including the Information Technology Act, 2000, the IT (Amendment) Act, 2008, and the Digital Personal Data Protection Act, 2023 (DPDPA). Our practices are designed to respect your privacy and give you meaningful control over your personal data.",
        },
        {
          type: "highlight",
          text: "This policy was last updated on 20 January 2025. We encourage you to review it periodically as we may update it to reflect changes in our practices or legal requirements.",
        },
      ],
    },
    {
      id: "data-collected",
      title: "2. Information We Collect",
      order: 2,
      blocks: [
        {
          type: "paragraph",
          text: "We collect different types of information depending on how you interact with our platform. The categories of personal data we may collect include:",
        },
        {
          type: "subheading",
          text: "Information You Provide Directly",
        },
        {
          type: "bulletList",
          items: [
            "Account registration details: name, email address, mobile number, and password.",
            "Delivery addresses: full name, phone number, street address, city, pincode, and country.",
            "Payment information: card type, last four digits, expiry date (we do not store full card numbers).",
            "Order history, product reviews, and ratings you submit.",
            "Communications you send us via email, chat, or our contact form.",
            "KYC documents submitted by vendor applicants (PAN, GST, Aadhaar last 4 digits).",
          ],
        },
        {
          type: "subheading",
          text: "Information Collected Automatically",
        },
        {
          type: "bulletList",
          items: [
            "IP address, browser type, device identifiers, and operating system.",
            "Pages visited, links clicked, and time spent on each page.",
            "Search queries, category navigation, and product interactions.",
            "Geolocation data (city/region level) when you use the store locator or delivery checker.",
            "Session data, cookies, and similar tracking technologies.",
          ],
        },
        {
          type: "subheading",
          text: "Information from Third Parties",
        },
        {
          type: "bulletList",
          items: [
            "Payment confirmation data from Razorpay (transaction ID, payment status).",
            "Location data via Google Places API when you search for delivery addresses or nearby stores.",
            "Social login information if you choose to sign in via a third-party OAuth provider (if enabled).",
          ],
        },
      ],
    },
    {
      id: "data-use",
      title: "3. How We Use Your Information",
      order: 3,
      blocks: [
        {
          type: "paragraph",
          text: "We use the personal data we collect for the following purposes, each grounded in a lawful basis under applicable data protection law:",
        },
        {
          type: "numberedList",
          items: [
            "Order Processing: To process, confirm, deliver, and follow up on your orders, including sending receipts and delivery updates.",
            "Account Management: To create and manage your account, authenticate logins, and personalise your experience.",
            "Customer Support: To respond to your queries, complaints, and requests for returns or refunds.",
            "Marketing Communications: To send you promotional emails, personalised offers, and newsletters (only with your consent, which you may withdraw at any time).",
            "Product Recommendations: To suggest products relevant to your browsing and purchase history.",
            "Platform Improvement: To analyse usage patterns, fix bugs, and improve the overall user experience.",
            "Fraud Prevention: To detect and prevent fraudulent transactions, unauthorised access, and abuse of our platform.",
            "Legal Compliance: To meet our obligations under applicable Indian law, tax regulations, and court orders.",
            "Vendor Management: To onboard, verify, and manage vendor accounts on our marketplace.",
          ],
        },
        {
          type: "highlight",
          text: "We will never sell your personal data to third parties for their own marketing purposes.",
        },
      ],
    },
    {
      id: "data-sharing",
      title: "4. Information Sharing & Disclosure",
      order: 4,
      blocks: [
        {
          type: "paragraph",
          text: "We do not share your personal information with third parties except in the following circumstances:",
        },
        {
          type: "subheading",
          text: "Service Providers",
        },
        {
          type: "paragraph",
          text: "We work with trusted third-party service providers who assist us in operating the platform. These providers have access to your data only as necessary to perform their services and are contractually bound to maintain its confidentiality.",
        },
        {
          type: "bulletList",
          items: [
            "Razorpay – Payment processing and fraud detection.",
            "Google (Maps/Places API) – Store locator and address suggestions.",
            "Nodemailer / SMTP providers – Transactional email delivery.",
            "MongoDB Atlas – Secure cloud database hosting.",
            "Delivery partners – Shipping address and contact number for order fulfillment.",
          ],
        },
        {
          type: "subheading",
          text: "Marketplace Vendors",
        },
        {
          type: "paragraph",
          text: "When you purchase a product from a third-party vendor on our marketplace, we share your name, delivery address, and order details with that vendor solely for fulfillment purposes.",
        },
        {
          type: "subheading",
          text: "Legal Requirements",
        },
        {
          type: "paragraph",
          text: "We may disclose your information when required by law, court order, or government regulation, or to protect the rights, property, or safety of Prakash Supermarket, our customers, or others.",
        },
      ],
    },
    {
      id: "cookies",
      title: "5. Cookies & Tracking Technologies",
      order: 5,
      blocks: [
        {
          type: "paragraph",
          text: "We use cookies and similar tracking technologies to enhance your experience on our platform. Cookies are small data files stored on your device.",
        },
        {
          type: "subheading",
          text: "Types of Cookies We Use",
        },
        {
          type: "bulletList",
          items: [
            "Essential Cookies: Necessary for the Site to function (e.g., session management, authentication tokens).",
            "Preference Cookies: Remember your settings such as theme, language, and recently viewed products.",
            "Analytics Cookies: Help us understand how visitors interact with the Site (e.g., page views, bounce rate).",
            "Marketing Cookies: Used to deliver personalised ads and promotional content (only with consent).",
          ],
        },
        {
          type: "paragraph",
          text: "You can control and manage cookie settings through your browser settings. Please note that disabling certain cookies may affect the functionality of our website, including your ability to sign in or add items to your cart.",
        },
      ],
    },
    {
      id: "data-security",
      title: "6. Data Security",
      order: 6,
      blocks: [
        {
          type: "paragraph",
          text: "We implement a range of technical and organisational security measures to protect your personal data against unauthorised access, loss, alteration, or disclosure.",
        },
        {
          type: "bulletList",
          items: [
            "All data transmitted between your browser and our servers is encrypted using TLS (Transport Layer Security).",
            "Passwords are hashed using bcrypt with a sufficient cost factor; we never store plain-text passwords.",
            "Payment data is processed exclusively through Razorpay's PCI-DSS Level 1 certified infrastructure.",
            "Access to personal data within our systems is restricted on a need-to-know basis.",
            "We conduct periodic security reviews and vulnerability assessments.",
            "Authentication tokens (JWTs) have a limited expiry and are stored as HttpOnly cookies.",
          ],
        },
        {
          type: "highlight",
          text: "Despite our best efforts, no method of transmission over the internet or electronic storage is 100% secure. If you believe your data has been compromised, please contact us immediately at security@prakashsupermarket.co.uk.",
        },
      ],
    },
    {
      id: "data-retention",
      title: "7. Data Retention",
      order: 7,
      blocks: [
        {
          type: "paragraph",
          text: "We retain personal data only for as long as necessary to fulfil the purposes for which it was collected, or as required by applicable law. Our retention principles are as follows:",
        },
        {
          type: "bulletList",
          items: [
            "Account information: Retained for the duration of your account's existence plus 3 years after closure.",
            "Order records: Retained for 7 years for GST, tax, and audit compliance.",
            "Payment records: Retained for 7 years as required by Indian financial regulations.",
            "Customer support communications: Retained for 2 years.",
            "Marketing preferences and consent logs: Retained for the duration of the relationship plus 1 year.",
            "Server and access logs: Retained for 90 days for security monitoring.",
          ],
        },
        {
          type: "paragraph",
          text: "Upon expiry of the applicable retention period, we securely delete or anonymise your data. You may request earlier deletion of certain data (see Your Rights below), subject to legal obligations.",
        },
      ],
    },
    {
      id: "your-rights",
      title: "8. Your Rights",
      order: 8,
      blocks: [
        {
          type: "paragraph",
          text: "Under the Digital Personal Data Protection Act, 2023, and other applicable Indian law, you have the following rights with respect to your personal data:",
        },
        {
          type: "numberedList",
          items: [
            "Right of Access: You may request a copy of the personal data we hold about you.",
            "Right to Correction: You may ask us to correct inaccurate or incomplete data.",
            "Right to Erasure: You may request deletion of your personal data, subject to legal retention obligations.",
            "Right to Withdraw Consent: Where processing is based on your consent, you may withdraw it at any time without affecting the lawfulness of prior processing.",
            "Right to Object: You may object to processing of your data for direct marketing purposes at any time.",
            "Right to Data Portability: You may request a machine-readable copy of data you have provided to us.",
            "Right to Grievance Redressal: You have the right to raise a complaint with our Data Protection Officer.",
          ],
        },
        {
          type: "paragraph",
          text: "To exercise any of these rights, please contact our Data Protection Officer at dpo@prakashsupermarket.co.uk. We will respond to verified requests within 30 days.",
        },
        {
          type: "highlight",
          text: "You can also update your name, email, and delivery addresses directly through your Account > Profile settings at any time.",
        },
      ],
    },
    {
      id: "third-party",
      title: "9. Third-Party Links & Services",
      order: 9,
      blocks: [
        {
          type: "paragraph",
          text: "Our Site may contain links to third-party websites, applications, or services. Clicking on these links will redirect you away from our platform. We have no control over and assume no responsibility for the content, privacy policies, or practices of third-party sites.",
        },
        {
          type: "paragraph",
          text: "We encourage you to review the privacy policy of every external site you visit. The inclusion of a link does not imply our endorsement of the linked site.",
        },
      ],
    },
    {
      id: "childrens-privacy",
      title: "10. Children's Privacy",
      order: 10,
      blocks: [
        {
          type: "paragraph",
          text: "Our services are not directed to individuals under the age of 18. We do not knowingly collect personal data from minors. If we become aware that we have inadvertently collected data from a child under 18 without verifiable parental consent, we will take steps to delete that information promptly.",
        },
        {
          type: "paragraph",
          text: "If you are a parent or guardian and believe your child has provided us with personal information, please contact us immediately at support@prakashsupermarket.co.uk.",
        },
      ],
    },
    {
      id: "international",
      title: "11. International Data Transfers",
      order: 11,
      blocks: [
        {
          type: "paragraph",
          text: "Your data is primarily stored and processed in India. However, some of our service providers (such as cloud infrastructure and email services) may process data outside India. Where such transfers occur, we ensure that appropriate safeguards are in place, such as standard contractual clauses or equivalent data protection agreements.",
        },
      ],
    },
    {
      id: "changes-privacy",
      title: "12. Changes to This Policy",
      order: 12,
      blocks: [
        {
          type: "paragraph",
          text: "We may update this Privacy Policy from time to time in response to changes in our practices, technology, legal requirements, or other factors. When we make material changes, we will notify you by updating the \"Last Updated\" date at the top of this policy and, where appropriate, by email or a notice on our homepage.",
        },
        {
          type: "paragraph",
          text: "Your continued use of our services following the posting of changes constitutes your acceptance of the revised Privacy Policy.",
        },
      ],
    },
    {
      id: "contact-privacy",
      title: "13. How to Contact Us",
      order: 13,
      blocks: [
        {
          type: "paragraph",
          text: "If you have any questions, concerns, or complaints about this Privacy Policy or our data practices, please contact our Data Protection Officer:",
        },
        {
          type: "bulletList",
          items: [
            "Data Protection Officer: Prakash Supermarket Pvt. Ltd.",
            "Email: dpo@prakashsupermarket.co.uk",
            "General Support: support@prakashsupermarket.co.uk",
            "Phone: +91 98765 43210 (Mon–Sat, 9am–6pm IST)",
            "Address: Bandra Kurla Complex, Mumbai – 400051, Maharashtra, India",
          ],
        },
        {
          type: "paragraph",
          text: "You also have the right to lodge a complaint with the Data Protection Board of India if you believe your rights under the DPDPA have been violated.",
        },
      ],
    },
  ],
};

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    await connectDB();

    await LegalPage.deleteMany({ slug: { $in: ["terms", "privacy"] } });
    await LegalPage.insertMany([TERMS_DATA, PRIVACY_DATA]);

    return NextResponse.json({
      success: true,
      message: "Legal pages seeded successfully",
      seeded: ["terms", "privacy"],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Seed failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
