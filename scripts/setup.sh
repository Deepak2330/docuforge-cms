#!/bin/bash
# DocuForge CMS - Local Development Setup Script
set -e

echo "=== DocuForge CMS Setup ==="

# Check required tools
command -v docker >/dev/null 2>&1 || { echo "Docker is required but not installed. Aborting."; exit 1; }
command -v node >/dev/null 2>&1 || { echo "Node.js is required but not installed. Aborting."; exit 1; }

# Copy env files if they don't exist
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [ ! -f "$ROOT_DIR/backend/.env" ]; then
  echo "Creating backend/.env from env.example..."
  cp "$ROOT_DIR/backend/env.example" "$ROOT_DIR/backend/.env"
fi

if [ ! -f "$ROOT_DIR/frontend/.env.local" ]; then
  echo "Creating frontend/.env.local from env.example..."
  cp "$ROOT_DIR/frontend/env.example" "$ROOT_DIR/frontend/.env.local"
fi

# Start PostgreSQL
echo "Starting PostgreSQL..."
docker compose up -d postgres

# Wait for PostgreSQL
echo "Waiting for PostgreSQL to be ready..."
until docker compose exec postgres pg_isready -U docuforge; do
  sleep 1
done
echo "PostgreSQL is ready!"

# Install backend dependencies
echo "Installing backend dependencies..."
cd "$ROOT_DIR/backend" && npm ci

# Generate Prisma client
echo "Generating Prisma client..."
cd "$ROOT_DIR/backend" && npx prisma generate

# Run migrations
echo "Running database migrations..."
cd "$ROOT_DIR/backend" && npx prisma migrate deploy

# Run seed
echo "Seeding database..."
cd "$ROOT_DIR/backend" && npx ts-node --project tsconfig.json prisma/seed.ts

# Install frontend dependencies
echo "Installing frontend dependencies..."
cd "$ROOT_DIR/frontend" && npm ci

echo ""
echo "=== Setup Complete! ==="
echo ""
echo "Start development servers:"
echo "  Backend:  cd backend && npm run start:dev"
echo "  Frontend: cd frontend && npm run dev"
echo ""
echo "Or use Docker Compose:"
echo "  docker compose up --build"
echo ""
echo "Demo credentials:"
echo "  Admin:  admin@docuforge.dev / Admin@123!"
echo "  Editor: editor@docuforge.dev / Editor@123!"
