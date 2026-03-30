# agents.md - Current Technical Architecture (Restaurant Operations SaaS)

## System Overview

This project is a multi-tenant restaurant SaaS with QR guest ordering and role-specific operational surfaces.

Current product surfaces:

- Public QR ordering for guests
- Restaurant admin dashboard
- Waiter workspace
- Kitchen order board
- Super-admin platform console

Core stack:

- Backend API: FastAPI
- Frontend: Next.js App Router
- Database: PostgreSQL
- Async jobs: Celery + Redis
- Local infrastructure: Docker Compose

## Product Model

The system serves multiple restaurants in one shared platform.

Each restaurant is a tenant.

Guest flow:

1. Guest scans a QR code at a table
2. Guest opens the public menu at `/r/{slug}/t/{tableCode}`
3. Guest places an order without logging in
4. Kitchen sees the new order on the kitchen board
5. Waiter serves and closes the order after payment

Protected user flow:

- Users must log in before accessing protected surfaces
- Anonymous access to `/platform`, `/admin`, `/waiter`, and `/kitchen` redirects to `/`
- Login happens at `/login`
- After login, users are redirected by role

## Role-Based Surfaces

### super_admin

Route:
`/platform`

Responsibilities:

- View all restaurants in the platform
- Open restaurant detail pages
- Toggle tenant access
- Review billing state
- Initiate password resets

### admin

Route:
`/admin/{slug}`

Responsibilities:

- Manage menu, sections, and items
- Upload or remove menu item images
- Manage tenant users
- Manage tables and waiter assignments
- Manage devices
- Review reports and billing status

### waiter

Route:
`/waiter/{slug}`

Responsibilities:

- View claimed tables
- Claim or release tables
- View only orders for claimed tables
- Create staff-assisted orders
- Update order notes and quantities
- Move orders from `ready -> served -> closed`

### kitchen

Route:
`/kitchen/{slug}`

Responsibilities:

- View active kitchen tickets only
- Move orders from `placed -> preparing -> ready`

## Multi-Tenancy Rules

- Single PostgreSQL database
- Every tenant-owned record is scoped by `tenant_id`
- Tenant identity is based on `slug`
- Cross-tenant access must be rejected even if IDs are valid

Important:
All protected queries must be tenant-filtered.

## High-Level Architecture

Client layer:

- Public QR app
- Admin dashboard
- Waiter workspace
- Kitchen board
- Platform console

Backend layer:

- FastAPI REST API
- JWT cookie auth
- Role and tenant guards

Data layer:

- PostgreSQL

Async layer:

- Redis
- Celery analytics and report tasks

Infrastructure:

- Docker Compose for local development
- VPS or AWS later

## Core Backend Areas

### Authentication

- Email/password login
- Access token and refresh token in HttpOnly cookies
- `/api/v1/auth/login`
- `/api/v1/auth/refresh`
- `/api/v1/auth/logout`
- `/api/v1/auth/me`

### Public ordering

- Public menu by restaurant slug
- Public table lookup by opaque table code
- Guest order creation without authentication
- Guest order tracking by opaque public status token

### Restaurant admin

- Menu CRUD
- Menu section CRUD
- Menu item CRUD
- Menu item image upload and removal
- Users CRUD
- Tables CRUD
- Devices CRUD
- Reports and billing status

### Waiter operations

- Table claim and release
- Table-scoped order management
- Staff-assisted order creation
- Serve and close order transitions

### Kitchen operations

- Active ticket board
- Kitchen-only status transitions

### Platform operations

- Restaurant list
- Restaurant detail view
- Tenant access control
- Password reset initiation

## Current Domain Model

### tenants

- id
- name
- slug
- address
- timezone
- currency
- subscription_plan
- subscription_status
- grace_ends_at
- is_accessible
- branding fields
- Stripe identifiers

### users

- id
- tenant_id nullable for super admin
- role: `super_admin | admin | waiter | kitchen`
- email
- full_name
- password_hash
- is_active

### menus

- id
- tenant_id
- name
- is_active

### menu_sections

- id
- tenant_id
- menu_id
- name
- display_order

### menu_items

- id
- tenant_id
- menu_id
- section_id
- name
- description
- price
- image_url
- is_available
- is_featured
- tags
- display_order

### tables

- id
- tenant_id
- table_number
- code
- qr_code_url
- current_waiter_user_id
- claimed_at

### orders

- id
- tenant_id
- table_id
- created_by_user_id
- served_by_user_id
- closed_by_user_id
- source: `qr_guest | staff_assisted`
- guest_name
- public_status_token
- status: `placed | preparing | ready | served | closed | cancelled`
- total_price
- notes
- placed_at
- ready_at
- served_at
- closed_at

### order_items

- id
- order_id
- menu_item_id
- quantity
- price

### devices

- id
- tenant_id
- label
- platform
- status
- assigned_table_id
- last_seen_at

### subscriptions

- id
- tenant_id
- plan
- status
- start_date
- end_date

### subscription_events

- Stripe event log for webhook processing

### audit_logs

- Action trail for admin, waiter, kitchen, and platform actions

### password_reset_tokens

- Super-admin initiated password reset flow

## API Shape

Base prefix:
`/api/v1`

### Public

- `GET /public/restaurants/{slug}/menu`
- `GET /public/tables/{table_code}`
- `POST /public/tables/{table_code}/orders`
- `GET /public/orders/{public_status_token}`

### Auth

- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`

### Admin

- `GET/POST /admin/{slug}/menus`
- `GET/POST/PUT/DELETE /admin/{slug}/menu-sections`
- `GET/POST/PUT/DELETE /admin/{slug}/menu-items`
- `POST /admin/{slug}/menu-items/{id}/image`
- `DELETE /admin/{slug}/menu-items/{id}/image`
- `GET/POST/PUT/DELETE /admin/{slug}/users`
- `GET/POST/PUT/DELETE /admin/{slug}/tables`
- `GET/POST/PUT/DELETE /admin/{slug}/devices`
- `GET /admin/{slug}/orders`
- `GET /admin/{slug}/reports/summary`
- `GET /admin/{slug}/billing/subscription`

### Waiter

- `GET /waiter/{slug}/tables`
- `POST /waiter/{slug}/tables/{table_id}/claim`
- `POST /waiter/{slug}/tables/{table_id}/release`
- `GET /waiter/{slug}/orders`
- `POST /waiter/{slug}/orders`
- `PUT /waiter/{slug}/orders/{id}`
- `PUT /waiter/{slug}/orders/{id}/status`

### Kitchen

- `GET /kitchen/{slug}/orders`
- `PUT /kitchen/{slug}/orders/{id}/status`

### Platform

- `GET /platform/restaurants`
- `GET /platform/restaurants/{slug}`
- `PUT /platform/restaurants/{slug}/access`
- `POST /platform/users/{user_id}/reset-password`

## Frontend Routing

Public:

- `/`
- `/login`
- `/r/{slug}`
- `/r/{slug}/t/{tableCode}`
- `/r/{slug}/orders/{publicStatusToken}`

Protected:

- `/platform`
- `/platform/restaurants/{slug}`
- `/admin/{slug}`
- `/waiter/{slug}`
- `/kitchen/{slug}`

Legacy redirect:

- `/staff/{slug}` redirects to `/waiter/{slug}`

## Media Handling

- Menu items support image upload
- In local development, images are stored on disk and served from `/media`
- The API exposes `image_url` to web clients
- Future production storage should stay behind the same media abstraction

## Async Tasks

Celery is used for:

- Analytics jobs
- Daily summaries
- Subscription event handling and reconciliation
- Future notifications

Examples:

- `calculate_popular_items`
- `daily_sales_summary`

## Local Development Notes

- Docker Compose boots Postgres, Redis, API, worker, and web
- The API container runs migrations and demo seeding automatically on startup
- Public QR flows do not require login
- Protected role-based surfaces do require login

Demo tenants:

- `harbor-bistro`
- `meadow-grill`
- `slate-room`

## Testing Strategy

- Backend unit tests for auth, tenant isolation, billing rules, and order workflow
- API integration coverage for public ordering and protected role flows
- Frontend build verification for App Router surfaces

Focus:

- Guest order flow
- Kitchen and waiter transitions
- Admin CRUD behavior
- Platform tenant isolation

## Engineering Rules

- Keep APIs simple
- Avoid overengineering
- Prefer tenant-safe service boundaries
- Log meaningful operational actions
- Preserve QR guest ordering as public
- Keep protected operations behind authenticated role checks

## Future Agent Notes

- Do not remove tenant filtering from any protected query
- Do not expose protected dashboard data to anonymous users
- Preserve the role split between platform, admin, waiter, and kitchen
- Keep the menu model simple until real restaurants require modifiers or payments
