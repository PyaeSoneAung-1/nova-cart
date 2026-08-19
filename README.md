# 🛍️ NovaCart

A modern full-stack e-commerce platform: a Next.js storefront, an Express + TypeScript REST API, and PostgreSQL with Prisma.

**Live demo:** https://nova-cart-mauve.vercel.app/

> Payments use a **mock payment flow** — no real card data is collected or stored.

## ✨ Features

- Storefront: product listing with search / filters / sorting / pagination, product pages with variants, ratings & reviews
- Accounts: register, login, refresh-token rotation, forgot/reset password, profile
- Shopping: cart, wishlist, addresses, multi-step checkout with coupons and mock payments, order history + tracking
- Admin dashboard: revenue/order analytics, full CRUD for products, categories, brands, coupons, orders, users, reviews, inventory
- Security: bcrypt, JWT access + rotating refresh tokens, RBAC, helmet, CORS, rate limiting, Zod validation

## 🧰 Tech Stack

**Frontend** — Next.js (App Router) · TypeScript · Tailwind CSS · shadcn/ui · Zustand · SWR · React Hook Form · Zod · Recharts

**Backend** — Node.js · Express · TypeScript · Prisma ORM · PostgreSQL · Vitest + Supertest (80+ tests)

## 🗂️ Project Structure

```
├── frontend/            Next.js storefront (App Router)
├── backend/
│   ├── src/             Express app (routes → controllers → services → Prisma)
│   ├── prisma/          Schema, migrations, seed
│   ├── tests/           80+ integration tests
│   └── postman/         Postman collection + environment
├── docs/API.md          Full REST API reference
└── docker-compose.yml   PostgreSQL (optional: full stack via Docker)
```

## 🚀 Getting Started (local)

Prerequisites: Node.js 20+, and PostgreSQL (easiest: `docker compose up -d db`).

**1. Backend** (port 4000)

```bash
cd backend
cp .env.example .env        # then fill in DATABASE_URL + DIRECT_URL (same value locally)
npm install
npx prisma migrate deploy   # apply migrations
npm run db:seed             # demo data + accounts
npm run dev
```

**2. Frontend** (port 3000)

```bash
cd frontend
cp .env.example .env.local  # NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
npm install
npm run dev
```

Open http://localhost:3000

### Demo accounts

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@novacart.dev` | `Admin@1234` |
| Customer | `customer@novacart.dev` | `Customer@1234` |
| Customer | `aung@example.com` | `Customer@1234` |

## 📦 API

REST API under `/api/v1` — see [docs/API.md](docs/API.md) for the full reference and [Postman collection](backend/postman).

## 🌍 Deployment

Frontend and backend deploy together as **one Vercel Services project** (single domain):

- [`vercel.json`](vercel.json) defines two services: `frontend/` (Next.js at `/`) and `backend/` (Express at `/api/*`, serverless entry `backend/api/index.ts`)
- Database: Neon Postgres — use the **pooled** URL as `DATABASE_URL` (with `?pgbouncer=true`) and the **direct** URL as `DIRECT_URL`

Project-level environment variables:

```
DATABASE_URL=postgresql://<user>:<pass>@<host>-pooler.<region>.aws.neon.tech/neondb?sslmode=require&pgbouncer=true
DIRECT_URL=postgresql://<user>:<pass>@<host>.<region>.aws.neon.tech/neondb?sslmode=require
JWT_ACCESS_SECRET=<long-random-string>
JWT_REFRESH_SECRET=<long-random-string>
CLIENT_URL=https://<your-project>.vercel.app
COOKIE_SECURE=true
MOCK_EMAIL=true
NEXT_PUBLIC_API_URL=https://<your-project>.vercel.app/api/v1
```

Migrations + seed (once, against the Neon DB):

```bash
cd backend
DATABASE_URL="<direct-url>" npx prisma migrate deploy
DATABASE_URL="<direct-url>" npm run db:seed
```

## 🧪 Testing

```bash
cd backend
npm test
```

## 📜 License

MIT
