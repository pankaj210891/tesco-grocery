# Prakash Supermarket — Full-Stack Grocery eCommerce

A production-quality, full-stack grocery eCommerce application built with Next.js 16 App Router, MongoDB, and Zustand. Covers the complete online supermarket experience — from product browsing and checkout through to vendor management and admin oversight.

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

### Checkout & Payments

- [x] Multi-step checkout — delivery details, promo code application, payment method selection
- [x] Razorpay payment gateway integration (create order → verify signature)
- [x] Cash on Delivery with configurable COD charge
- [x] Promo code engine — percentage, fixed, and free-delivery discount types; per-user limits, first-order-only, eligible categories, usage tracking
- [x] Order confirmation page with order number and summary

### Authentication & Account

- [x] Register and login with JWT (HTTP-only cookie)
- [x] Forgot password / reset password flow
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

### Data & Infrastructure

- [x] 204 seeded products across 21 categories with realistic pricing (INR)
- [x] 838 locally-generated WebP product/category images (no external image dependencies)
- [x] Master seed endpoint with partial re-seed support (`POST /api/seed/master`)
- [x] MongoDB-only data architecture — no mock data, no localStorage for business data
- [x] Role-based access control — customer / vendor / admin
- [x] Dark mode (Tailwind + localStorage persistence)
- [x] Fully responsive — desktop, tablet, and mobile
- [x] ESLint + Prettier + commitlint + husky pre-commit hooks

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

## Local Setup

### Prerequisites

- Node.js 20+
- MongoDB Atlas account (or local MongoDB)

### Steps

```bash
# 1. Clone
git clone https://github.com/pankaj210891/tesco-grocery.git
cd tesco-grocery

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env.local
# Fill in MONGODB_URI, JWT_SECRET, and optionally RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET

# 4. Generate product & category images
npm run generate-images

# 5. Start the development server
npm run dev

# 6. Seed the database (requires server running)
curl -X POST http://localhost:3000/api/seed/master
```

Open [http://localhost:3000](http://localhost:3000).

To seed only specific collections:

```bash
curl -X POST http://localhost:3000/api/seed/master \
  -H "Content-Type: application/json" \
  -d '{"collections":["categories","products"]}'
```

## Environment Variables

| Variable              | Description                                                       | Required |
| --------------------- | ----------------------------------------------------------------- | -------- |
| `MONGODB_URI`         | MongoDB Atlas connection string                                   | Yes      |
| `JWT_SECRET`          | Random 64-byte secret for JWT signing (`openssl rand -base64 64`) | Yes      |
| `RAZORPAY_KEY_ID`     | Razorpay API key (public)                                         | Optional |
| `RAZORPAY_KEY_SECRET` | Razorpay API secret                                               | Optional |

> **Never commit `.env.local`** — it is gitignored. Use `.env.example` as a template.

## Scripts

```bash
npm run dev              # Development server
npm run build            # Production build
npm run start            # Production server
npm run lint             # ESLint
npm run type-check       # TypeScript check (no emit)
npm run generate-images  # Generate all WebP product/category images via sharp
```

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
├── components/          # Reusable UI components
├── hooks/               # Custom React hooks
├── lib/
│   ├── db/              # Mongoose models & connection
│   ├── data/            # Seed data generators (products, categories, orders, reviews…)
│   ├── utils/           # Shared utilities
│   └── validations/     # Zod schemas
├── services/            # Business logic layer (DB-agnostic interface)
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

## Seed Accounts (after running master seed)

| Role     | Email                    | Password    |
| -------- | ------------------------ | ----------- |
| Admin    | priya.sharma@example.com | Prakash@123 |
| Vendor   | neha.verma@example.com   | Prakash@123 |
| Customer | rahul.mehta@example.com  | Prakash@123 |

## Contributing

Branch naming follows the [GIT-WORKFLOW.md](GIT-WORKFLOW.md):
`feature/`, `bugfix/`, `release/`, `hotfix/`

Commits follow [Conventional Commits](https://www.conventionalcommits.org) — enforced via commitlint + husky.
