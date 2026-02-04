CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role user_role NOT NULL,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
