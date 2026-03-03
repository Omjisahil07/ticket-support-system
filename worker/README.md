# Worker

Background worker for outbound email queue jobs.

## Local development

1. Copy `.env.example` to `.env`.
2. Run `npm run dev:worker` from repo root.

## Behavior

- Polls queue file on interval.
- Processes pending jobs.
- Marks jobs `SENT` on success.
- Retries up to `WORKER_MAX_ATTEMPTS`, then marks `FAILED`.
