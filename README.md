# Sale Management Backend (Express + TypeScript + Drizzle + PostgreSQL)

Sample backend project featuring:
- `users` (CRUD)
- `products` (CRUD, includes `price` + `stock`)
- `sales` and `sale_items` (create sales and optionally deduct stock when `completed`)

## Prerequisites
- Node.js 18+
- PostgreSQL running locally (or update `DATABASE_URL`)

## Setup
```bash
cp .env.example .env
npm install
```

## Run (dev)
```bash
npm run dev
```

API examples:
- `GET /health`
- `POST /users` body `{ "name": "...", "email": "..." }`
- `POST /products` body `{ "sku": "...", "name": "...", "price": 12.34, "stock": 10 }`
- `POST /sales` body:
  ```json
  {
    "userId": 1,
    "status": "completed",
    "items": [{ "productId": 1, "quantity": 2 }]
  }
  ```
- `POST /sales/:id/complete` marks a pending sale as completed and deducts stock.

## Drizzle
This project includes Drizzle configuration and schema at:
- `drizzle.config.ts`
- `src/db/schema.ts`

To generate/migrate, run (requires a configured `DATABASE_URL` and a working Postgres instance):
```bash
npm run db:generate
npm run db:migrate
```

