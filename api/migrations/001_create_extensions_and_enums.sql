CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('ADMIN', 'SUB_ADMIN', 'AGENT', 'CUSTOMER');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_status') THEN
    CREATE TYPE ticket_status AS ENUM ('NEW', 'OPEN', 'PENDING', 'RESOLVED', 'CLOSED');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_priority') THEN
    CREATE TYPE ticket_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_message_type') THEN
    CREATE TYPE ticket_message_type AS ENUM ('PUBLIC', 'INTERNAL');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_event_type') THEN
    CREATE TYPE ticket_event_type AS ENUM (
      'CREATED',
      'ASSIGNED',
      'STATUS_CHANGED',
      'PRIORITY_CHANGED',
      'MESSAGE_ADDED',
      'CUSTOMER_REPLIED',
      'INTERNAL_NOTE'
    );
  END IF;
END $$;
