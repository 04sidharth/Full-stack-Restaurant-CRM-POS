# Restaurant CRM

Multi-tenant restaurant management / POS system (Petpooja-style clone).

## Stack

- **Frontend**: React 18 + Vite + TypeScript + TailwindCSS + shadcn/ui + React Query + Zustand
- **Backend**: Node.js + Express + TypeScript + Prisma + PostgreSQL
- **Auth**: JWT with role-based access control (OWNER / MANAGER / CASHIER / WAITER / KITCHEN)
- **Architecture**: Monorepo (npm workspaces), multi-tenant SaaS (tenant = restaurant)

## Modules

- Menu management (categories, items, variants, modifiers)
- Table management (sections, floor plan)
- POS — order taking (dine-in / takeaway / delivery)
- Billing with GST (CGST/SGST), discounts, multi-payment
- Customer CRM (history, loyalty, feedback)
- Inventory (stock, recipes, auto-deduction)
- Reports & analytics (sales, item-wise, GST summary)
- Kitchen Display System (KDS)
- Staff & roles

## Quick start

```bash
# 1. Copy env file
cp .env.example .env

# 2. Start Postgres (Docker)
npm run db:up

# 3. Install everything
npm install

# 4. Run migrations + seed
npm run db:migrate
npm run db:seed

# 5. Start API and Web in parallel
npm run dev
```

- API:  http://localhost:4000
- Web:  http://localhost:5173

## Folder layout

```
.
├── apps/
│   ├── api/           Express + Prisma backend
│   └── web/           Vite + React frontend
├── docker-compose.yml Postgres
├── .env.example       Sample env vars
└── package.json       Root workspace
```
