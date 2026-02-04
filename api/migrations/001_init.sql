CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('ADMIN', 'SUB_ADMIN', 'AGENT');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_status') THEN
    CREATE TYPE ticket_status AS ENUM ('NEW', 'OPEN', 'PENDING', 'RESOLVED', 'CLOSED');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_priority') THEN
    CREATE TYPE ticket_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_event_type') THEN
    CREATE TYPE ticket_event_type AS ENUM (
      'CREATED',
      'ASSIGNED',
      'STATUS_CHANGED',
      'PRIORITY_CHANGED',
      'MESSAGE_ADDED'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'message_author_type') THEN
    CREATE TYPE message_author_type AS ENUM ('REQUESTER', 'AGENT');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role user_role NOT NULL,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ticket_pid_counters (
  year_month TEXT PRIMARY KEY,
  counter INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pid TEXT NOT NULL UNIQUE,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  status ticket_status NOT NULL DEFAULT 'NEW',
  priority ticket_priority NOT NULL DEFAULT 'MEDIUM',
  requester_name TEXT,
  requester_email TEXT NOT NULL,
  assigned_to UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS tickets_status_idx ON tickets(status);
CREATE INDEX IF NOT EXISTS tickets_priority_idx ON tickets(priority);
CREATE INDEX IF NOT EXISTS tickets_assigned_to_idx ON tickets(assigned_to);

CREATE TABLE IF NOT EXISTS ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  author_type message_author_type NOT NULL,
  author_user_id UUID REFERENCES users(id),
  body TEXT NOT NULL,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ticket_messages_ticket_id_idx ON ticket_messages(ticket_id);

CREATE TABLE IF NOT EXISTS ticket_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  event_type ticket_event_type NOT NULL,
  actor_user_id UUID REFERENCES users(id),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ticket_events_ticket_id_idx ON ticket_events(ticket_id);
