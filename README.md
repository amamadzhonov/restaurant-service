# Restaurant Operations SaaS

Multi-tenant restaurant platform with public QR ordering and role-specific operational workspaces.

## What Is Implemented

- Public QR menu and guest ordering
- Guest order tracking by public status token
- Restaurant admin dashboard
- Waiter table-claim and order workflow
- Kitchen order board
- Super-admin platform console
- Menu item image upload
- PostgreSQL + Redis + Celery + Docker Compose local stack

## Product Surfaces

### Public guest

- Browse a restaurant menu without logging in
- Order from a table QR route
- Track order status after submission

### Restaurant admin

- Manage menu, sections, and items
- Upload or remove item images
- Manage users, tables, and devices
- Review orders, reports, and billing status

### Waiter

- Claim and release tables
- See only claimed-table orders
- Create staff-assisted orders
- Mark orders served and closed

### Kitchen

- See active kitchen tickets only
- Move orders from `placed` to `preparing` to `ready`

### Super admin

- View all restaurants
- Open restaurant detail pages
- Review access and billing state
- Initiate password resets

## Repo Structure

- `apps/api` FastAPI app, SQLAlchemy models, Alembic, Celery tasks, seed script
- `apps/web` Next.js app for public, admin, waiter, kitchen, and platform surfaces
- `infra` Docker Compose stack for local development
- `agents.md` current architecture and product contract for future coding agents

## Local Development

### Prerequisites

- Docker and Docker Compose
- Python 3.13 for local backend work
- Node.js for local frontend work

### Environment files

Backend example:
- `apps/api/.env.example`

Frontend example:
- `apps/web/.env.example`

Important:
- Replace `SECRET_KEY=change-me` with a long secret for anything beyond local development

### Start with Docker

```bash
docker compose -f infra/docker-compose.yml up --build
```

The Docker API container will:

1. Run `alembic upgrade head`
2. Run `python3 -m app.seed_demo`
3. Start `uvicorn`

Services:

- Web: `http://localhost:3000`
- API: `http://localhost:8000`
- Postgres: `localhost:5432`
- Redis: `localhost:6379`

### Useful root scripts

```bash
npm run dev:web
npm run dev:api
npm run seed:api
npm run test:api
npm run build:web
```

### Manual backend startup

```bash
cd apps/api
alembic upgrade head
python3 -m app.seed_demo
uvicorn app.main:app --reload --port 8000
```

### Frontend only

```bash
cd apps/web
npm run dev
```

## Production Deployment On One EC2 Instance

This repo now includes a production Compose file:

- [docker-compose.prod.yml](/Users/abdulazizmamadzhonov/Documents/service/infra/docker-compose.prod.yml)

Use it instead of the dev compose file on EC2.

### 1. Prepare the server

Amazon Linux 2023 uses the `ec2-user` account.

Install Docker:

```bash
sudo dnf update -y
sudo dnf install -y docker git
sudo systemctl enable --now docker
sudo usermod -aG docker ec2-user
newgrp docker
docker --version
docker compose version
```

### 2. Copy the repo to the server

If you do not have a Git remote yet, copy the project directly:

```bash
scp -i restaurant-service.pem -r ./service ec2-user@YOUR_EC2_PUBLIC_IP:~/service
```

Then connect:

```bash
ssh -i restaurant-service.pem ec2-user@YOUR_EC2_PUBLIC_IP
cd ~/service
```

### 3. Create production env files

```bash
cp apps/api/.env.production.example apps/api/.env.production
cp apps/web/.env.production.example apps/web/.env.production
```

Then edit both files and replace:

- `YOUR_EC2_PUBLIC_IP`
- `SECRET_KEY`
- Stripe placeholders if needed

Important:

- `SECRET_KEY` should be a long random value
- `FRONTEND_ORIGIN` must match your public web URL
- `MEDIA_BASE_URL` must match your public API media URL

### 4. Start the production stack

```bash
export NEXT_PUBLIC_API_URL=http://YOUR_EC2_PUBLIC_IP:8000/api/v1
export NEXT_PUBLIC_APP_URL=http://YOUR_EC2_PUBLIC_IP:3000
docker compose -f infra/docker-compose.prod.yml up --build -d
```

### 5. Open the app

- Web: `http://YOUR_EC2_PUBLIC_IP:3000`
- API health: `http://YOUR_EC2_PUBLIC_IP:8000/healthz`

### 6. Inspect logs

```bash
docker compose -f infra/docker-compose.prod.yml ps
docker compose -f infra/docker-compose.prod.yml logs -f api
docker compose -f infra/docker-compose.prod.yml logs -f web
docker compose -f infra/docker-compose.prod.yml logs -f worker
```

## Authentication Behavior

- Public QR routes are open
- Protected routes require authentication
- If a user is not logged in and opens `/platform`, `/admin`, `/waiter`, or `/kitchen`, they are redirected to `/`
- Login happens at `/login`
- After login, users are redirected by role

Role routes:

- `super_admin` -> `/platform`
- `admin` -> `/admin/{slug}`
- `waiter` -> `/waiter/{slug}`
- `kitchen` -> `/kitchen/{slug}`

## Demo Data

### Seeded restaurants

- `harbor-bistro`
- `meadow-grill`
- `slate-room`

### Seeded users

All seeded users use:

`ChangeMe123!`

Credentials:

- Super admin: `owner@platform.local`
- Harbor admin: `admin@harbor.local`
- Harbor waiter: `waiter@harbor.local`
- Harbor kitchen: `kitchen@harbor.local`
- Meadow admin: `admin@meadow.local`
- Slate admin: `admin@slate.local`

## Useful Routes

Public:

- Home: `http://localhost:3000/`
- Login: `http://localhost:3000/login`
- Harbor QR demo: `http://localhost:3000/r/harbor-bistro/t/table-a1`

Protected:

- Platform: `http://localhost:3000/platform`
- Harbor admin: `http://localhost:3000/admin/harbor-bistro`
- Harbor waiter: `http://localhost:3000/waiter/harbor-bistro`
- Harbor kitchen: `http://localhost:3000/kitchen/harbor-bistro`

## API Overview

Base path:

`/api/v1`

Main groups:

- `/auth`
- `/public/restaurants`
- `/public/tables`
- `/public/orders`
- `/admin/{slug}`
- `/waiter/{slug}`
- `/kitchen/{slug}`
- `/platform`

## Media

- Menu items support images
- Local development stores uploaded images on disk
- Images are served through the API media path and exposed as `image_url`

## Tests

Backend:

```bash
cd apps/api
pytest
```

Frontend build check:

```bash
cd apps/web
npm run build
```

## Current Scope

In scope:

- QR ordering
- Kitchen workflow
- Waiter workflow
- Admin CRUD
- Super-admin tenant oversight
- Tenant isolation

Out of scope for now:

- Online payments
- Menu modifiers
- Native mobile apps
- Complex analytics
# restaurant-service
