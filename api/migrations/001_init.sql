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

create or replace function next_ticket_pid()
returns text
language plpgsql
as $$
declare
  current_year_month text := to_char(now(), 'YYYYMM');
  next_counter integer;
begin
  loop
    update ticket_pid_counters
      set counter = counter + 1,
          updated_at = now()
    where year_month = current_year_month
    returning counter into next_counter;

    if found then
      exit;
    end if;

    begin
      insert into ticket_pid_counters (year_month, counter)
      values (current_year_month, 1)
      returning counter into next_counter;
      exit;
    exception when unique_violation then
      -- Retry if another transaction inserted the row first.
    end;
  end loop;

  return current_year_month || '-' || lpad(next_counter::text, 4, '0');
end;
$$;

create table tickets (
  id uuid primary key default gen_random_uuid(),
  pid text not null unique default next_ticket_pid(),
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
  created_at timestamptz not null default now(),
  constraint ticket_messages_author_check
    check (
      (author_type = 'AGENT' and author_user_id is not null)
      or (author_type = 'REQUESTER' and author_user_id is null)
    )
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
