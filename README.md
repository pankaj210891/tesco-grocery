# Prakash Supermarket — Full-Stack Grocery eCommerce

A production-quality, full-stack grocery eCommerce application built with Next.js 16 App Router, MongoDB, and Zustand. Covers the complete online supermarket experience — from product browsing and checkout through to vendor management and admin oversight.

---

## Tech Stack

| Layer     | Technology                                   |
| --------- | -------------------------------------------- |
| Framework | Next.js 16.2 (App Router, Server Components) |
| Database  | MongoDB Atlas + Mongoose 9                   |
| Auth      | JWT (jsonwebtoken) + bcryptjs                |
| State     | Zustand 5 with localStorage persistence      |
| Forms     | React Hook Form + Zod v4                     |
| Styling   | Tailwind CSS 4                               |
| HTTP      | Axios                                        |
| Payments  | Razorpay + Cash on Delivery                  |
| UI Icons  | Lucide React                                 |
| Toasts    | Sonner                                       |
| Images    | sharp (local WebP generation)                |

---

## Feature Completion

### Storefront (Customer-facing)

- [x] Dynamic homepage with DB-driven hero banner, carousels, offer cards, brand grid, category tiles, and info cards
- [x] Product catalogue — search, category filter, brand filter, price range, in-stock toggle, sort, pagination
- [x] Product detail pages — image gallery, related products, customer reviews with rating summary
- [x] Category browsing — grid view with category images, product counts, and per-category filters
- [x] Shopping cart — add/remove/update quantity, persisted to localStorage, synced to MongoDB when logged in
- [x] Wishlist / Favourites — guest (localStorage) and authenticated (MongoDB) with cross-device sync
- [x] Special offers page — active promo codes with countdown timers, discount type badges
- [x] Store locator — 7 store locations with opening hours, amenities, and map coordinates
- [x] Help / FAQ page — categorised FAQs (general, orders, delivery, payments, returns, account)
- [x] Search page — full-text search with live results
- [x] Network status toasts — persistent "You are offline" error toast + auto-dismissing "Back online" success toast

### Checkout & Payments

- [x] Multi-step checkout — delivery details, promo code application, payment method selection
- [x] Razorpay payment gateway integration (create order → verify signature)
- [x] Cash on Delivery with configurable COD charge
- [x] Promo code engine — percentage, fixed, and free-delivery discount types; per-user limits, first-order-only, eligible categories, usage tracking
- [x] Eligible promo cards shown in cart and checkout (shared `EligiblePromoCard` component)
- [x] "Add new address" in checkout address dialog opens inline form, saves to account, and auto-selects the new address
- [x] Order confirmation page with order number and summary

### Authentication & Accounts

- [x] Register and login with JWT
- [x] Forgot password / reset password flow
- [x] **Role-based routing** — admin and vendor users who navigate to the customer storefront are automatically redirected to their respective dashboards (`/admin`, `/vendor`) before any shop content is painted
- [x] Account dashboard — profile, order history, order detail view
- [x] Saved addresses — full CRUD, default address selection
- [x] Saved payment methods — card management with default selection
- [x] Wishlist management page

### Vendor Portal

- [x] Vendor dashboard with revenue and order statistics
- [x] Product management — list, create, edit, delete own products
- [x] Order management — view and update status of vendor orders
- [x] Vendor profile management

### Admin Panel

- [x] Admin dashboard with sitewide stats (revenue, orders, users, products)
- [x] Product management — full CRUD across all vendors
- [x] Category management — create, edit, delete, reorder
- [x] Order management — view all orders, update status, date filtering
- [x] User management — list users, suspend/activate accounts
- [x] Vendor management — approve, suspend, view vendor profiles
- [x] Promo code management — full CRUD with eligibility rules

### UI & DX

- [x] Dark mode — Tailwind class strategy, theme persisted to localStorage, zero flash on refresh
- [x] Theme-switch layout-shift prevention — all `transition-all` replaced with scoped transitions (`transition-colors`, `transition-shadow`, `transition-transform`, `transition-[width]`) across every themed component
- [x] Scroll lock — `useScrollLock` hook applied to every modal, drawer, and overlay app-wide; stacking-safe via ref-count; compensates scrollbar width to prevent layout shift on open
- [x] Fully responsive — desktop, tablet, and mobile
- [x] ESLint + Prettier + commitlint + husky pre-commit hooks

### Data & Infrastructure

- [x] 204 seeded products across 21 categories with realistic pricing (INR)
- [x] 838 locally-generated WebP product/category images (no external image dependencies)
- [x] Master seed endpoint with partial re-seed support (`POST /api/seed/master`)
- [x] MongoDB-only data architecture — no mock data, no localStorage for business data
- [x] Role-based access control — customer / vendor / admin

### REST API Surface (60+ routes)

- Auth: register, login, forgot/reset password
- Products: list (filters/pagination), detail, reviews
- Categories: list, detail
- Cart: get, add, update, remove (per-user)
- Wishlist: get, add, remove, sync
- Orders: create, list (user), detail (user)
- Payments: Razorpay create-order, verify; COD
- Offers: list, validate, apply, eligible-check
- Stores: list, detail
- FAQs: list, detail
- Homepage sections: list
- Account: addresses CRUD, payment methods CRUD, orders
- Admin: products, categories, orders, users, vendors, promo codes, stats
- Vendor: products, orders, profile, stats

---

## Local Setup

### Prerequisites

- Node.js 20+
- MongoDB Atlas account (or local MongoDB 7+)

### Steps

```bash
# 1. Clone
git clone https://github.com/pankaj210891/tesco-grocery.git
cd tesco-grocery

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env.local
# Fill in MONGODB_URI, JWT_SECRET, and optionally Razorpay + SMTP variables

# 4. Generate product & category images
npm run generate-images

# 5. Start the development server
npm run dev

# 6. Seed the database (server must be running)
curl -X POST http://localhost:3000/api/seed/master
```

Open [http://localhost:3000](http://localhost:3000).

To seed only specific collections:

```bash
curl -X POST http://localhost:3000/api/seed/master \
  -H "Content-Type: application/json" \
  -d '{"collections":["categories","products"]}'
```

---

## Environment Variables

| Variable                      | Description                                               | Required |
| ----------------------------- | --------------------------------------------------------- | -------- |
| `MONGODB_URI`                 | MongoDB Atlas connection string                           | Yes      |
| `JWT_SECRET`                  | Random 64-byte secret (`openssl rand -base64 64`)         | Yes      |
| `NEXT_PUBLIC_APP_URL`         | Public base URL (e.g. `http://localhost:3000`)            | Yes      |
| `NEXT_PUBLIC_APP_NAME`        | Site name shown in emails and meta tags                   | Yes      |
| `RAZORPAY_KEY_ID`             | Razorpay API key (public)                                 | Optional |
| `RAZORPAY_KEY_SECRET`         | Razorpay API secret                                       | Optional |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Same key exposed to the browser for Razorpay checkout SDK | Optional |
| `RAZORPAY_WEBHOOK_SECRET`     | Razorpay webhook signing secret                           | Optional |
| `SMTP_HOST`                   | SMTP server host (e.g. `smtp.gmail.com`)                  | Optional |
| `SMTP_PORT`                   | SMTP port (usually `587`)                                 | Optional |
| `SMTP_USER`                   | SMTP username / Gmail address                             | Optional |
| `SMTP_PASS`                   | SMTP password or Gmail App Password                       | Optional |
| `MAIL_FROM_EMAIL`             | From address for transactional emails                     | Optional |
| `MAIL_FROM_NAME`              | From name for transactional emails                        | Optional |

> **Never commit `.env.local`** — it is gitignored. Use `.env.example` as the authoritative template.

---

## Scripts

```bash
npm run dev              # Development server (Turbopack)
npm run build            # Production build
npm run start            # Production server
npm run lint             # ESLint (zero warnings enforced)
npm run type-check       # TypeScript check (no emit)
npm run generate-images  # Generate all WebP product/category images via sharp
```

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/          # Login, Register, Forgot/Reset Password
│   ├── (shop)/          # Storefront — Home, Products, Categories, Cart,
│   │                    #   Checkout, Offers, Search, Store Locator, Help, Account
│   ├── (admin)/         # Admin panel — Dashboard, Products, Categories,
│   │                    #   Orders, Users, Vendors, Promo Codes
│   ├── (vendor)/        # Vendor portal — Dashboard, Products, Orders
│   └── api/             # REST API route handlers (60+ routes)
├── components/
│   ├── account/         # AddressFormModal, PaymentFormModal, OrderTimeline…
│   ├── admin/           # AdminSidebar, StatsCard…
│   ├── cart/            # CartItem, OrderSummary…
│   ├── checkout/        # CheckoutPageContent, EligiblePromoCard, AddressSelectModal…
│   ├── home/            # HeroBanner, CategoryGrid, homepage sections…
│   ├── layout/          # Navbar, Footer, RoleGuard, NetworkStatus, ScrollRestorer…
│   ├── product/         # ProductCard, RatingStars, MobileFiltersDrawer…
│   ├── providers/       # ThemeProvider
│   ├── ui/              # ThemeToggle, DateFilter, NavArrow, CardNumberInput…
│   └── vendor/          # VendorSidebar…
├── hooks/               # useScrollLock, useAuthData, useHydrated, useDateFilter…
├── lib/
│   ├── db/              # Mongoose models & connection
│   ├── email/           # Nodemailer transport + HTML templates
│   ├── utils/           # Shared utilities (format, cn, card, apiAuth…)
│   └── validations/     # Zod schemas (checkout, address, auth…)
├── services/            # Business logic layer (promo, address, cart…)
├── store/               # Zustand stores (cart, auth, wishlist)
└── types/               # Shared TypeScript interfaces
public/
└── images/
    ├── products/        # 204 product dirs × 4 WebP views (816 files)
    ├── categories/      # 21 category WebP banners
    └── placeholder-product.webp
scripts/
└── generate-images.mjs  # sharp SVG→WebP image generator
```

---

## Seed Accounts (after running master seed)

| Role     | Email                    | Password      |
| -------- | ------------------------ | ------------- |
| Admin    | priya.sharma@example.com | `Prakash@123` |
| Vendor   | neha.verma@example.com   | `Prakash@123` |
| Customer | rahul.mehta@example.com  | `Prakash@123` |

---

## Role-Based Routing

| User Role  | After login lands at | Visits any `/` shop page    |
| ---------- | -------------------- | --------------------------- |
| `customer` | `/` (homepage)       | Renders normally            |
| `vendor`   | `/vendor`            | Auto-redirected → `/vendor` |
| `admin`    | `/admin`             | Auto-redirected → `/admin`  |

The redirect is implemented in `src/components/layout/RoleGuard.tsx`, which wraps the entire `(shop)` route group layout. It waits for Zustand store rehydration before deciding — so there is no flash of shop content for privileged users and no hydration mismatch.

---

## Git Workflow

Branch naming follows [GIT-WORKFLOW.md](GIT-WORKFLOW.md):

| Branch type | Pattern            | Based on  | Merges into        |
| ----------- | ------------------ | --------- | ------------------ |
| Feature     | `feature/<name>`   | `develop` | `develop`          |
| Bugfix      | `bugfix/<name>`    | `develop` | `develop`          |
| Release     | `release/v<x.y.z>` | `develop` | `main` + `develop` |
| Hotfix      | `hotfix/<name>`    | `main`    | `main` + `develop` |

Commits follow [Conventional Commits](https://www.conventionalcommits.org) — enforced via commitlint + husky.

---

## Changelog

### v1.8.0

- **feat(ui):** Network status toast notifications — persistent "You are offline" error toast (stays until connection returns); auto-dismissing "You are back online" success toast (3 s). Uses existing Sonner Toaster; stacking-safe via shared toast ID.
- **feat(auth):** Role-based redirection — admin and vendor users navigating to the customer storefront are automatically redirected to `/admin` or `/vendor` before shop content is painted (`RoleGuard` component in `(shop)/layout.tsx`).

### v1.7.0

- **refactor:** Deleted unused `mock-products.ts` and `categories.ts` (no consumers after MongoDB migration).
- **refactor:** Extracted shared `EligiblePromoCard` component — was duplicated identically in `OrderSummary` and `CheckoutPricingSummary`.
- **refactor:** Removed inline `StarRating` function from `ProductCard`; reuses `RatingStars` with new `showScore={false}` prop. Added dark-mode empty-star colour and "No reviews" support to `RatingStars`.
- **fix(ui):** Theme-switch layout shifts — replaced all `transition-all` with scoped transitions across 28 files. Added `overflow-y: scroll` on `<html>` and matching light/dark scrollbar CSS to prevent scrollbar-width layout shift.
- **fix(checkout):** "Add new address" button in address selection dialog now opens `AddressFormModal`, saves via API, and auto-selects the new address without closing the selection dialog.
- **feat(ui):** `useScrollLock` hook — stacking-safe scroll lock (module-level ref count) applied to all 14 full-screen overlays app-wide: modals, drawers, and mobile sidebars.

### v1.6.0

- Mailtrap / Gmail SMTP integration for transactional emails (order confirmation, password reset).
- Checkout bug fixes: promo code re-validation on cart change, COD charge display.
- Admin date filter improvements.

### v1.5.0

- Product and category image pipeline — 838 locally generated WebP images via sharp.
- Category pages with image banners and per-category product counts.

### v1.4.0

- Promo code engine — percentage, fixed amount, free delivery; per-user and first-order limits; eligible categories.
- Offers page with countdown timers.

### v1.3.0

- Razorpay payment gateway (create-order → verify signature → webhook).
- Cash on Delivery with configurable charge.
- Order confirmation emails.

### v1.2.0

- Vendor portal — dashboard, product management, order management.
- Admin panel — full CRUD for products, categories, orders, users, vendors, promo codes.
- Role-based access control (customer / vendor / admin).

### v1.1.0

- Wishlist — guest localStorage + authenticated MongoDB with cross-device sync.
- Saved addresses and payment methods (full CRUD).
- Order history and order detail pages.

### v1.0.0

- Initial release: storefront, product catalogue, cart, checkout (COD), JWT auth, MongoDB integration.
