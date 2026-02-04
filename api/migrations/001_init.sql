create extension if not exists "pgcrypto";

create type user_role as enum ('ADMIN', 'SUB_ADMIN', 'AGENT');
create type ticket_status as enum ('NEW', 'OPEN', 'PENDING', 'RESOLVED', 'CLOSED');
create type ticket_priority as enum ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
create type ticket_event_type as enum (
  'CREATED',
  'ASSIGNED',
  'STATUS_CHANGED',
  'PRIORITY_CHANGED',
  'MESSAGE_ADDED'
);
create type message_author_type as enum ('REQUESTER', 'AGENT');

create table users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  role user_role not null,
  full_name text,
  created_at timestamptz not null default now()
);

create table ticket_pid_counters (
  year_month text primary key,
  counter integer not null default 0,
  updated_at timestamptz not null default now()
);

create table tickets (
  id uuid primary key default gen_random_uuid(),
  pid text not null unique,
  subject text not null,
  description text not null,
  status ticket_status not null default 'NEW',
  priority ticket_priority not null default 'MEDIUM',
  requester_name text,
  requester_email text not null,
  assigned_to uuid references users(id),
  created_at timestamptz not null default now()
);

create index tickets_status_idx on tickets(status);
create index tickets_priority_idx on tickets(priority);
create index tickets_assigned_to_idx on tickets(assigned_to);

create table ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references tickets(id) on delete cascade,
  author_type message_author_type not null,
  author_user_id uuid references users(id),
  body text not null,
  attachments jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create index ticket_messages_ticket_id_idx on ticket_messages(ticket_id);

create table ticket_events (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references tickets(id) on delete cascade,
  event_type ticket_event_type not null,
  actor_user_id uuid references users(id),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index ticket_events_ticket_id_idx on ticket_events(ticket_id);
