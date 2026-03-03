# API

Node.js HTTP API service for ticket support flow.

## Local development

1. Copy `.env.example` to `.env`.
2. Run `npm run dev:api` from repo root.

## Endpoints

- `GET /health`
- `POST /auth/login`
- `POST /users` (ADMIN only)
- `POST /tickets`
- `GET /tickets`
- `POST /tickets/:id/assign`
- `POST /tickets/:id/messages`
- `GET /tickets/:id/messages`
- `GET /tickets/:id/events`
- `POST /webhooks/inbound-email`

## Storage

For bootstrap, API persists data in JSON file (`DATA_FILE`) and enqueues outbound email jobs in `EMAIL_QUEUE_FILE`.
