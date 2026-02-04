# ticket-support-system

# Localhost Implementation Plan (Build-First)

This plan is strictly for **local development**. No deployment, no hosting, no infra automation. The goal is to get a correct, working enterprise-grade system on localhost.

---

## 1. Scope Lock

Build **v1 only**:

* Single-tenant
* One company
* One admin hierarchy
* Email-first ticketing

Do not add AI, SLA, analytics, or customization yet.

---

## 2. Local Development Stack

* Node.js 20
* Next.js (App Router)
* Backend API (Express or NestJS)
* Supabase (cloud project, used locally)
* Redis (local via Docker or native)
* SMTP (sandbox like Mailtrap)

---

## 3. Monorepo Structure

```
/support-desk
  /web        (Next.js frontend)
  /api        (Backend API)
  /worker     (Background jobs)
  /shared     (Types, constants)
```

---

## 4. Environment Setup

### Root requirements

* Node installed
* Redis running locally

```bash
redis-server
```

### Env files

```
web/.env.local
api/.env
worker/.env
```

Use the same Supabase project for all local services.

---

## 5. Database Implementation (First Priority)

### Tables to create

1. users
2. tickets
3. ticket_messages
4. ticket_events

Constraints:

* No soft deletes
* No shared tables
* Strict enums

Create SQL migrations manually or via Supabase UI.

---

## 6. Authentication Implementation

### Features

* Email + password login
* Single admin seeded manually
* Session via HTTP-only cookies or JWT

### Tasks

1. Create password hashing util (bcrypt)
2. Login endpoint
3. Auth middleware
4. Role guard middleware

---

## 7. Ticket Creation Flow

### Backend

* POST /tickets
* Validate input
* Generate PID
* Insert ticket
* Insert CREATED event

### Frontend

* Public form
* File upload
* Success screen with PID

---

## 8. PID Generation Logic

Rules:

* Deterministic
* Atomic
* No collisions

Implementation:

* YYYYMM counter stored in DB
* Transaction-based increment

---

## 9. Ticket Listing & Filters

### Backend

* GET /tickets
* Filters:

  * status
  * priority
  * assigned_to

### Frontend

* Table view
* Server-side pagination

---

## 10. Ticket Assignment

### Backend

* POST /tickets/:id/assign
* Role check: ADMIN or SUB_ADMIN
* Log ASSIGNED event

### Frontend

* Assignment modal

---

## 11. Ticket Messaging (Core Feature)

### Backend

* POST /tickets/:id/messages
* Save message
* Push email job to Redis

### Frontend

* Chat-style UI
* Attachments support

---

## 12. Email (Local Development)

### Outbound

* Use Mailtrap or console logger
* Ensure email payload correctness

### Inbound (Simulated)

* Create mock webhook endpoint
* Post email payload manually

---

## 13. Redis Worker

### Responsibilities

* Consume email queue
* Retry logic
* Failure logging

Do not optimize. Just make it reliable.

---

## 14. Ticket Timeline

### Backend

* ticket_events table only

### Frontend

* Read-only timeline UI

---

## 15. RBAC Enforcement

Rules:

* Backend only
* Never trust frontend

Test all role combinations.

---

## 16. Media Uploads

### Flow

* Upload to Supabase Storage
* Save URLs in DB
* Validate size + type

---

## 17. Error Handling

* All API errors structured
* No silent failures
* User-safe messages

---

## 18. Local Testing Checklist

* Ticket creation works
* PID unique
* Assignment enforced
* Messages saved
* Redis worker sends email
* Timeline accurate

---

## 19. Strict Build Order (Do Not Change)

1. DB schema
2. Auth + RBAC
3. Ticket creation
4. Ticket list
5. Assignment
6. Messaging
7. Worker
8. Timeline
9. Media uploads
10. Hardening

---

## 20. Definition of Done (Localhost)

* Full ticket lifecycle works locally
* No mocked core logic
* Clean code boundaries
* Ready for deployment later
