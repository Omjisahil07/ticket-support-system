# ticket-support-system

Local-first support desk monorepo. This repository now contains an initial implementation bootstrap for:

- `api` — Node.js + Express API service
- `worker` — background worker process scaffold
- `shared` — shared constants package
- `api/migrations` — SQL schema and PID generation migrations

## Quick start

### 1) Install dependencies

```bash
npm install
```

### 2) Create local env files

```bash
cp api/.env.example api/.env
cp worker/.env.example worker/.env
```

### 3) Run services

```bash
npm run dev:api
npm run dev:worker
```

## Current API endpoints

- `GET /health` — service health
- `GET /tickets` — list in-memory tickets
- `POST /tickets` — create an in-memory ticket

> Note: this is a bootstrap implementation. Database wiring, auth, queue backend, and web app integration are still pending.
