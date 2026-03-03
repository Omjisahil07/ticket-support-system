# ticket-support-system

Local-first support desk monorepo.

## Services

- `api` — HTTP API implementing auth, ticket creation/listing, assignment, messaging, and inbound email webhook.
- `worker` — background queue processor for outbound email jobs.
- `shared` — shared constants for roles/statuses/priorities/event types.
- `api/migrations` — PostgreSQL schema and PID function migrations for real DB adoption.

## Quick start

```bash
cp api/.env.example api/.env
cp worker/.env.example worker/.env
npm run dev:api
npm run dev:worker
```

## Implemented v1 flow

### Auth
- `POST /auth/login` (seed admin from env on startup)
- `POST /users` (admin-only user creation)

### Tickets
- `POST /tickets` (public ticket creation with PID generation)
- `GET /tickets` (filters: `status`, `priority`, `assigned_to`, with pagination)
- `POST /tickets/:id/assign` (ADMIN/SUB_ADMIN role gate)

### Messaging
- `POST /tickets/:id/messages` (requester/agent messages)
- `GET /tickets/:id/messages`
- `GET /tickets/:id/events`

### Email integration
- `POST /webhooks/inbound-email` (simulated inbound email to ticket)
- Outbound jobs are queued in JSON queue file and consumed by worker with retry tracking.

## Notes

- Runtime storage is file-backed JSON for local development bootstrap.
- SQL migrations in `api/migrations` remain the target schema for PostgreSQL migration in follow-up work.
