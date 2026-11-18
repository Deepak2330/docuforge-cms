# DocuForge CMS

A production-ready **Documentation Content Management System** built for technical writers, developer teams, and API documentation workflows. Manage documents, API references, GraphQL schemas, release notes, and team permissions — all in one place.

---

## Screenshots

> _Add screenshots of your dashboard, project pages, and document editor here._

---

## Features

| Feature | Description |
|---|---|
| **Workspaces** | Organize teams into isolated workspaces with their own members and projects |
| **Projects** | Multi-project support with public/private visibility per project |
| **Documents** | Rich structured documentation with categories, tags, status workflow |
| **API Reference** | Manage OpenAPI 3.0/3.1 specs — upload, validate, render |
| **API Groups** | Group and organize API endpoints within projects |
| **GraphQL Schemas** | Parse and document GraphQL SDL schemas |
| **Release Notes** | Versioned release notes tied to projects |
| **Review Workflow** | Draft → Review → Approve → Publish pipeline |
| **Team Management** | Role-based access control at workspace and project level |
| **Audit Logs** | Full audit trail of all changes across the system |
| **Media Library** | File and image management per project |
| **Categories** | Organize documents into nested categories |
| **Public Portal** | Publish documentation portals for external consumers |
| **JWT Auth** | Secure access + refresh token authentication with bcrypt |
| **Rate Limiting** | Built-in throttling (short / medium / long window) |

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui |
| **Backend** | NestJS 10, TypeScript, Prisma ORM |
| **Database** | PostgreSQL 15 |
| **Auth** | JWT (access + refresh tokens), bcrypt |
| **Storage** | Local filesystem / MinIO / AWS S3 (configurable) |
| **Infrastructure** | Docker, Docker Compose |

---

## Project Structure

```
docuforge-cms/
├── backend/                    # NestJS REST API
│   ├── src/
│   │   ├── auth/               # JWT auth, guards, strategies
│   │   ├── users/              # User management
│   │   ├── workspaces/         # Workspace CRUD + membership
│   │   ├── projects/           # Project CRUD + membership
│   │   ├── documents/          # Document management
│   │   ├── categories/         # Document categories
│   │   ├── api-specs/          # OpenAPI spec management
│   │   ├── apis/               # API endpoint management
│   │   ├── api-groups/         # API grouping
│   │   ├── graphql-schemas/    # GraphQL schema management
│   │   ├── release-notes/      # Release note management
│   │   ├── audit-logs/         # Audit trail
│   │   ├── media/              # File/media management
│   │   ├── prisma/             # Database service
│   │   └── common/             # Filters, interceptors, decorators
│   ├── prisma/
│   │   ├── schema.prisma       # Full database schema
│   │   └── seed.ts             # Default seed data
│   └── Dockerfile
├── frontend/                   # Next.js application
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/         # Login, Register pages
│   │   │   ├── (dashboard)/    # Protected dashboard pages
│   │   │   │   ├── dashboard/
│   │   │   │   ├── workspaces/
│   │   │   │   ├── projects/
│   │   │   │   ├── documents/
│   │   │   │   ├── api-reference/
│   │   │   │   ├── graphql/
│   │   │   │   ├── release-notes/
│   │   │   │   ├── audit-logs/
│   │   │   │   ├── categories/
│   │   │   │   ├── media/
│   │   │   │   ├── team/
│   │   │   │   ├── review-queue/
│   │   │   │   └── settings/
│   │   │   ├── portal/         # Public documentation portal
│   │   │   └── api/            # Next.js API routes (proxy)
│   │   ├── components/
│   │   │   ├── auth/           # Login/Register forms
│   │   │   ├── layout/         # Sidebar, TopBar
│   │   │   └── ui/             # shadcn/ui base components
│   │   ├── lib/                # API client, auth helpers
│   │   └── types/              # Shared TypeScript types
│   └── Dockerfile
├── docker/
│   └── postgres/init.sql       # PostgreSQL initialization script
├── scripts/
│   └── setup.sh                # Automated setup helper
└── docker-compose.yml
```

---

## Getting Started

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (recommended)
- **OR** Node.js 20+ and PostgreSQL 15 for local dev

---

### Option A — Docker Compose (Recommended)

The fastest way to get everything running.

```bash
# 1. Clone the repository
git clone https://github.com/YOUR_USERNAME/docuforge-cms.git
cd docuforge-cms

# 2. Copy environment files
cp backend/env.example backend/.env
cp frontend/env.example frontend/.env.local

# 3. Start all services (postgres + backend + frontend)
docker compose up --build

# 4. On first run — apply migrations and seed the database
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npx ts-node prisma/seed.ts
```

Services will be available at:

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:3001 |
| Swagger Docs | http://localhost:3001/api/docs |

> **Note:** The first `docker compose up --build` installs npm dependencies inside the containers. The frontend may take 1–2 minutes to become ready on first boot.

---

### Option B — Local Development (Node.js)

```bash
# 1. Clone the repository
git clone https://github.com/YOUR_USERNAME/docuforge-cms.git
cd docuforge-cms

# 2. Start only the database via Docker
docker compose up -d postgres

# 3. Set up the backend
cd backend
cp env.example .env        # Edit DATABASE_URL if needed
npm install
npx prisma migrate dev --name init
npx ts-node prisma/seed.ts
npm run start:dev          # API starts on http://localhost:3001

# 4. Set up the frontend (open a new terminal)
cd frontend
cp env.example .env.local
npm install
npm run dev                # App starts on http://localhost:3000
```

---

## Default Login Credentials

After running the seed, use these accounts to log in:

| Role | Email | Password |
|---|---|---|
| Super Admin | admin@docuforge.dev | Admin@123! |
| Editor | editor@docuforge.dev | Editor@123! |

---

## Environment Variables

### Backend — `backend/.env`

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | — |
| `JWT_ACCESS_SECRET` | Access token signing secret | change_this |
| `JWT_REFRESH_SECRET` | Refresh token signing secret | change_this |
| `JWT_ACCESS_EXPIRES_IN` | Access token TTL | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token TTL | `7d` |
| `PORT` | Backend server port | `3001` |
| `FRONTEND_URL` | CORS allowed origin | `http://localhost:3000` |

### Frontend — `frontend/.env.local`

| Variable | Description | Default |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Backend API base URL | `http://localhost:3001` |
| `INTERNAL_API_URL` | Internal API URL for SSR | `http://backend:3001` |

---

## API Overview

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/api/v1/health` | Health check | Public |
| `POST` | `/api/v1/auth/register` | Register new user | Public |
| `POST` | `/api/v1/auth/login` | Login | Public |
| `POST` | `/api/v1/auth/refresh` | Refresh access token | Public |
| `POST` | `/api/v1/auth/logout` | Logout | Bearer |
| `GET` | `/api/v1/auth/me` | Current user | Bearer |
| `GET` | `/api/v1/workspaces` | List workspaces | Bearer |
| `POST` | `/api/v1/workspaces` | Create workspace | Bearer |
| `DELETE` | `/api/v1/workspaces/:id` | Delete workspace | Bearer |
| `GET` | `/api/v1/projects` | List all projects | Bearer |
| `POST` | `/api/v1/workspaces/:id/projects` | Create project | Bearer |
| `DELETE` | `/api/v1/projects/:id` | Delete project | Bearer |
| `GET` | `/api/v1/documents` | List documents | Bearer |
| `GET` | `/api/v1/release-notes` | List release notes | Bearer |
| `GET` | `/api/v1/audit-logs` | List audit logs | Admin |

> Full interactive API docs available at `http://localhost:3001/api/docs` (Swagger UI) when the backend is running.

---

## Database Migrations

```bash
# Create a new migration
cd backend && npx prisma migrate dev --name <migration-name>

# Apply migrations (production)
cd backend && npx prisma migrate deploy

# Reset database (dev only — wipes all data)
cd backend && npx prisma migrate reset

# Open Prisma Studio (visual DB browser)
cd backend && npx prisma studio
```

---

## Running Tests

```bash
# Backend unit tests
cd backend && npm test

# Backend tests with coverage report
cd backend && npm run test:cov
```

---

## Roadmap

| Phase | Status | Description |
|---|---|---|
| 1 | ✅ Complete | Project setup, auth, database schema, Docker |
| 2 | ✅ Complete | Dashboard UI, workspaces, projects, team management |
| 3 | 🔜 Next | Rich documentation editor (TipTap) |
| 4 | ⏳ Planned | OpenAPI module — upload, validate, render specs |
| 5 | ⏳ Planned | GraphQL documentation module |
| 6 | ⏳ Planned | Review workflow + document versioning |
| 7 | ⏳ Planned | Public publishing engine |
| 8 | ⏳ Planned | Full-text search, PDF export, audit log UI |
| 9 | ⏳ Planned | Security hardening + comprehensive test suite |
| 10 | ⏳ Planned | Cloud deployment guide (Railway / AWS) |

---

## Contributing

Contributions, issues and feature requests are welcome. Feel free to open an issue or submit a pull request.

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m 'Add my feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a Pull Request

---

## License

This project is open source and available under the [MIT License](LICENSE).
