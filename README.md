# Tesco Grocery — Online Supermarket Portal

A production-quality, full-stack grocery e-commerce app built with Next.js 16, MongoDB, and Zustand.

## Tech Stack

| Layer     | Technology                              |
| --------- | --------------------------------------- |
| Framework | Next.js 16.2 (App Router)               |
| Database  | MongoDB Atlas + Mongoose 9              |
| Auth      | JWT (jsonwebtoken) + bcryptjs           |
| State     | Zustand 5 with localStorage persistence |
| Forms     | React Hook Form + Zod v4                |
| Styling   | Tailwind CSS 4                          |
| HTTP      | Axios                                   |
| UI        | Lucide React, react-hot-toast           |

## Features

- Product catalogue with search, category filters, sort, and pagination
- Product detail pages with image gallery and related products
- Shopping cart (persisted to localStorage)
- Wishlist / Favourites (localStorage + MongoDB sync when logged in)
- Register / Login with JWT authentication
- Checkout with delivery form, mock payment, and promo codes
- Order history and order detail pages (per-user, JWT-protected)
- User account page

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
# Fill in MONGODB_URI and JWT_SECRET in .env.local

# 4. (Optional) Seed the database
curl -X POST http://localhost:3000/api/seed

# 5. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable      | Description                                                       | Required |
| ------------- | ----------------------------------------------------------------- | -------- |
| `MONGODB_URI` | MongoDB Atlas connection string                                   | Yes      |
| `JWT_SECRET`  | Random 64-byte secret for JWT signing (`openssl rand -base64 64`) | Yes      |

> **Never commit `.env.local`** — it is gitignored. Use `.env.example` as a template.

## Scripts

```bash
npm run dev         # Development server
npm run build       # Production build
npm run start       # Production server
npm run lint        # ESLint
npm run type-check  # TypeScript check (no emit)
```

## Project Structure

```
src/
├── app/
│   ├── (auth)/         # Login, Register pages
│   ├── (shop)/         # All shop pages (products, cart, checkout, account)
│   └── api/            # Route handlers (REST API)
├── components/         # Reusable UI components
├── hooks/              # Custom React hooks
├── lib/
│   ├── db/             # Mongoose models & connection
│   ├── data/           # Mock data & static content
│   ├── utils/          # Shared utilities
│   └── validations/    # Zod schemas
├── services/           # Business logic layer (DB-agnostic interface)
├── store/              # Zustand stores (cart, auth, wishlist)
└── types/              # Shared TypeScript types
```

## Contributing

See [CONTRIBUTING](#) and our [PR template](.github/pull_request_template.md).

Branch naming: `feat/`, `fix/`, `refactor/`, `chore/`, `docs/`  
Commits: [Conventional Commits](https://www.conventionalcommits.org) enforced via commitlint.
