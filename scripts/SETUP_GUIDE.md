# DocuForge CMS — Phase 1 Setup Guide

## Step 1: Create environment files

You must create these files manually (copy from the provided examples):

### Backend — `backend/.env`
```
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://docuforge:docuforge_dev_pass@localhost:5432/docuforge
JWT_ACCESS_SECRET=change_this_access_secret_in_production_at_least_64_chars
JWT_REFRESH_SECRET=change_this_refresh_secret_in_production_at_least_64_chars
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:3000
MAX_FILE_SIZE_MB=50
UPLOAD_DIR=./uploads
```

### Frontend — `frontend/.env.local`
```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Step 2: Start PostgreSQL via Docker

```bash
cd docuforge-cms
docker compose up -d postgres
```

Wait until healthy:
```bash
docker compose ps
```

## Step 3: Backend setup

```bash
cd backend

# Install dependencies (first time only)
npm install

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev --name init

# Seed database with demo data
npx ts-node --project tsconfig.json prisma/seed.ts

# Start development server
npm run start:dev
```

Backend available at: http://localhost:3001
Swagger docs at: http://localhost:3001/api/docs

## Step 4: Frontend setup (new terminal)

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend available at: http://localhost:3000

## Step 5: Verify

1. Open http://localhost:3000 — should redirect to /login
2. Sign in with: admin@docuforge.dev / Admin@123!
3. Should reach the dashboard
4. Check API health: http://localhost:3001/api/v1/health

## Alternative: Full Docker Compose

```bash
cd docuforge-cms
docker compose up --build

# After containers are up, in a new terminal:
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npx ts-node prisma/seed.ts
```

## Run Tests

```bash
# Backend unit tests
cd backend && npm test

# Backend test coverage
cd backend && npm run test:cov
```

## Demo Credentials

| Email | Password | Role |
|-------|----------|------|
| admin@docuforge.dev | Admin@123! | SUPER_ADMIN |
| editor@docuforge.dev | Editor@123! | EDITOR |
