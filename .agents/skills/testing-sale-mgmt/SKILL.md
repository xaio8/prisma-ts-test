---
name: testing-sale-mgmt
description: End-to-end testing guide for the sale-management-backend Express API. Covers local PostgreSQL setup, migrations, server startup, and curl-based API testing patterns.
---

# Testing the Sale Management Backend

This is a backend-only Express + TypeScript + Drizzle + PostgreSQL API. All testing is done via shell commands (curl). No browser/GUI recording needed.

## Local Setup

### 1. Install PostgreSQL
```bash
sudo apt-get update -qq && sudo apt-get install -y -qq postgresql postgresql-client
sudo pg_ctlcluster 14 main start
```

### 2. Create Database
```bash
sudo -u postgres psql -c "CREATE USER testuser WITH PASSWORD 'testpass' CREATEDB;"
sudo -u postgres psql -c "CREATE DATABASE sale_mgmt OWNER testuser;"
```

### 3. Configure Environment
```bash
echo 'DATABASE_URL=postgresql://testuser:testpass@localhost:5432/sale_mgmt' > .env
npm install
```

### 4. Run Migrations
```bash
npm run db:generate
npm run db:migrate
```

### 5. Start Server
```bash
npm run dev
# Server runs on http://localhost:3000
```

## Key API Endpoints

- `GET /health` — Health check
- `POST /users` — `{ "name": "...", "email": "..." }`
- `POST /products` — `{ "sku": "...", "name": "...", "price": 12.34, "stock": 10 }`
- `POST /sales` — `{ "userId": 1, "status": "completed", "items": [{ "productId": 1, "quantity": 2 }] }`
- `POST /sales/:id/complete` — Marks a pending sale as completed (deducts stock)
- `GET /products?limit=50&offset=0` — Paginated product list
- `GET /sales?status=pending` — Filter sales by status

## Testing Patterns

### Seed Data First
Always create a user and products before testing sales:
```bash
curl -s -X POST http://localhost:3000/users -H 'Content-Type: application/json' -d '{"name":"Test User","email":"test@example.com"}'
curl -s -X POST http://localhost:3000/products -H 'Content-Type: application/json' -d '{"sku":"WIDGET-001","name":"Widget","price":25.50,"stock":10}'
```

### Checking HTTP Status Codes
Use `curl -w "\nHTTP_CODE:%{http_code}"` to capture status codes alongside response body.

### Verifying Stock Changes
After creating a completed sale, GET the product and verify `stock` field changed.

### Testing Validation
- Zero/negative prices should return HTTP 400 with structured `{"error":{"message":"Validation failed","details":{...}}}` 
- Empty body on POST endpoints should return 400 with field-level errors

### Testing Error Suppression
Duplicate SKU inserts should return generic `"Internal Server Error"`, not PostgreSQL constraint details.

### Graceful Shutdown
To test, start the server directly (not via `npm run dev` watch mode) and send SIGTERM:
```bash
DATABASE_URL="postgresql://testuser:testpass@localhost:5432/sale_mgmt" node_modules/.bin/tsx src/server.ts &
SERVER_PID=$!
sleep 2
kill -TERM $SERVER_PID
# Should log "shutting down" and "pool closed", exit code 0
```
Note: `npm run dev` uses tsx watch mode which may not cleanly propagate SIGTERM.

## Devin Secrets Needed

No external secrets required — testing uses a local PostgreSQL instance with hardcoded dev credentials.

## Tips

- The `numeric` columns (price, total, unitPrice, lineTotal) are returned as strings from PostgreSQL. Verify arithmetic correctness by checking exact string values (e.g., `"76.50"` not `"76.5"`).
- The `lsof` command might not be available — use `ps aux | grep tsx` to find server processes.
- When running tsx directly (outside `npm run dev`), you must set `DATABASE_URL` explicitly or run from the project root where `.env` is loaded by `dotenv/config`.
