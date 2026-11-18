# DocuForge CMS

A documentation management system for technical writers and engineering teams.

DocuForge provides a **central place** to organize technical content, manage projects and collaborate on documentation. The project is built with Next.js, NestJS and PostgreSQL, with a modular backend and a separate frontend application.

## Overview

Technical documentation often spans multiple tools, repositories and workflows. DocuForge aims to bring these activities **into one system**, giving teams a structured way to manage documentation throughout its lifecycle.

The platform is designed to support:

- **Documentation management:** Create, organize and manage documents across projects.
- **API documentation:** Manage OpenAPI specifications, API endpoints and GraphQL schemas.
- **Content lifecycle:** Move documents through review, approval and publishing workflows.
- **Team collaboration:** Manage workspace members, project access and permissions.
- **Release management:** Maintain versioned release notes alongside project documentation.
- **Publishing:** Make approved documentation available through public documentation portals.

## Features

The following table describes the planned platform capabilities. See [Development status](#development-status) for the distinction between completed and planned work.

| Module | Description |
|---|---|
| Workspaces | Create isolated workspaces and manage team membership. |
| Projects | Organize documentation into multiple projects with public or private visibility. |
| Documents | Manage structured documentation using categories, tags and status workflows. |
| API specifications | Upload, validate and render OpenAPI 3.0 and 3.1 specifications. |
| API groups | Organize API endpoints into logical groups. |
| GraphQL schemas | Parse and manage GraphQL SDL schemas. |
| Release notes | Create versioned release notes for individual projects. |
| Review workflow | Manage document reviews through draft, review, approval and publishing stages. |
| Team management | Apply role-based access control at workspace and project levels. |
| Audit logs | Maintain an audit trail of system changes. |
| Media library | Manage files and images within projects. |
| Categories | Organize documentation using nested categories. |
| Public portals | Publish documentation for external users. |
| Authentication | Secure application access using JWT access and refresh tokens, with optional Google sign-in. |
| Rate limiting | Apply request throttling across configured time windows. |

## Technology stack

DocuForge uses a separate frontend and backend, with PostgreSQL as the primary database.

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, App Router, TypeScript |
| UI | Tailwind CSS, shadcn/ui |
| Backend | NestJS 10, TypeScript |
| ORM | Prisma |
| Database | PostgreSQL 15 |
| Authentication | JWT, bcrypt, optional Google Identity Services |
| File storage | Local filesystem, MinIO or AWS S3 |
| Infrastructure | Docker, Docker Compose |

## Getting started

You can run DocuForge using Docker Compose or configure the frontend and backend independently.

### Prerequisites

For Docker-based development:

- Docker Desktop
- Git

For local development:

- Node.js 20 or later
- npm
- PostgreSQL 15
- Git

### Run with Docker Compose

Docker Compose provides the simplest way to start the development environment.

**1. Clone the repository**

```bash
git clone https://github.com/YOUR_USERNAME/docuforge-cms.git
cd docuforge-cms
```

**2. Configure environment variables**

Create the environment files from the supplied examples.

```bash
cp backend/env.example backend/.env
cp frontend/env.example frontend/.env.local
```

Update the values if your local environment requires different settings.

**3. Build and start the services**

```bash
docker compose up --build
```

This starts the PostgreSQL database, backend and frontend services.

**4. Apply database migrations**

After the backend is running, execute:

```bash
docker compose exec backend npx prisma migrate deploy
```

**5. Seed the database**

```bash
docker compose exec backend npx ts-node prisma/seed.ts
```

**6. Open the application**

The services use the following local URLs:

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:3001 |
| Swagger UI | http://localhost:3001/api/docs |

The initial Docker build installs the application dependencies. Allow a few minutes for the services to start.

### Run without Docker

You can also run the frontend and backend directly on your machine while using Docker for PostgreSQL.

**1. Clone the repository**

```bash
git clone https://github.com/YOUR_USERNAME/docuforge-cms.git
cd docuforge-cms
```

**2. Start PostgreSQL**

```bash
docker compose up -d postgres
```

**3. Set up the backend**

```bash
cd backend

cp env.example .env
npm install

npx prisma migrate dev --name init
npx ts-node prisma/seed.ts

npm run start:dev
```

The backend runs at:

`http://localhost:3001`

**4. Set up the frontend**

Open a separate terminal:

```bash
cd frontend

cp env.example .env.local
npm install

npm run dev
```

The frontend runs at:

`http://localhost:3000`

## Development credentials

The database seed creates the following accounts for local development.

| Role | Email | Password |
|---|---|---|
| Super Admin | admin@docuforge.dev | Admin@123! |
| Editor | editor@docuforge.dev | Editor@123! |

These credentials are for development only. Replace the default passwords and review the seeded accounts before deploying the application.

## Configuration

DocuForge uses environment variables to configure database connectivity, authentication and communication between the frontend and backend.

### Backend environment

File: `backend/.env`

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | Not specified |
| `JWT_ACCESS_SECRET` | Secret used to sign access tokens | `change_this` |
| `JWT_REFRESH_SECRET` | Secret used to sign refresh tokens | `change_this` |
| `JWT_ACCESS_EXPIRES_IN` | Access token expiration time | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiration time | `7d` |
| `PORT` | Backend server port | `3001` |
| `FRONTEND_URL` | Allowed frontend origin for CORS | `http://localhost:3000` |
| `GOOGLE_CLIENT_ID` | Google OAuth Web client ID (optional; enables Sign in with Google) | empty |

### Frontend environment

File: `frontend/.env.local`

| Variable | Description | Default |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Backend API URL used by the frontend | `http://localhost:3001` |
| `INTERNAL_API_URL` | Internal backend URL used for server-side requests | `http://backend:3001` |

Do not commit environment files containing credentials or secrets. Use secure, unique JWT secrets in production.

### Sign in with Google (optional)

DocuForge uses **Google Identity Services** (ID token verification), not a full OAuth redirect dance. This fits the existing NestJS JWT + Next.js cookie session flow.

1. In [Google Cloud Console](https://console.cloud.google.com/apis/credentials), create an **OAuth 2.0 Client ID** of type **Web application**.
2. Under **Authorized JavaScript origins**, add your frontend origin (for local: `http://localhost:3000`).
3. Set `GOOGLE_CLIENT_ID` in `backend/.env` to that client ID (and in Docker Compose env if you use Compose).
4. Restart the backend. The login and register pages call `GET /api/v1/auth/google/config` and show the Google button only when configured.
5. On success, the frontend posts the Google ID token to `POST /api/v1/auth/google`, then stores DocuForge JWTs via `/api/auth/session` as with password login.

Security notes:

- The backend verifies the ID token with Google (`aud`, `iss`, signature) via `google-auth-library`.
- Only accounts with `email_verified` are accepted.
- New Google users are created as `VIEWER` (never elevated by OAuth).
- Existing local users with the same verified email are linked by `googleId`.
- If `GOOGLE_CLIENT_ID` is unset, Google sign-in is disabled and the button is hidden.

## API

The backend exposes REST endpoints under `/api/v1`.

The following endpoints provide an overview of the available API surface.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/health` | Check API health |
| `POST` | `/api/v1/auth/register` | Register a user |
| `POST` | `/api/v1/auth/login` | Authenticate a user |
| `GET` | `/api/v1/auth/google/config` | Whether Google sign-in is enabled |
| `POST` | `/api/v1/auth/google` | Authenticate with a Google ID token |
| `POST` | `/api/v1/auth/refresh` | Refresh an access token |
| `POST` | `/api/v1/auth/logout` | Log out a user |
| `GET` | `/api/v1/auth/me` | Retrieve the authenticated user |
| `GET` | `/api/v1/workspaces` | List workspaces |
| `POST` | `/api/v1/workspaces` | Create a workspace |
| `DELETE` | `/api/v1/workspaces/:id` | Delete a workspace |
| `GET` | `/api/v1/projects` | List projects |
| `POST` | `/api/v1/workspaces/:id/projects` | Create a project |
| `DELETE` | `/api/v1/projects/:id` | Delete a project |
| `GET` | `/api/v1/documents` | List documents |
| `GET` | `/api/v1/release-notes` | List release notes |
| `GET` | `/api/v1/audit-logs` | List audit logs |

For the complete API specification, start the backend and open Swagger UI:

`http://localhost:3001/api/docs`

## Repository structure

The repository separates application code, database configuration and infrastructure scripts.

```text
docuforge-cms/
├── backend/
│   ├── src/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── workspaces/
│   │   ├── projects/
│   │   ├── documents/
│   │   ├── categories/
│   │   ├── api-specs/
│   │   ├── apis/
│   │   ├── api-groups/
│   │   ├── graphql-schemas/
│   │   ├── release-notes/
│   │   ├── audit-logs/
│   │   ├── media/
│   │   ├── prisma/
│   │   └── common/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   ├── (dashboard)/
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
│   │   │   ├── portal/
│   │   │   └── api/
│   │   ├── components/
│   │   │   ├── auth/
│   │   │   ├── layout/
│   │   │   └── ui/
│   │   ├── lib/
│   │   └── types/
│   └── Dockerfile
│
├── docker/
│   └── postgres/
│       └── init.sql
├── scripts/
│   └── setup.sh
└── docker-compose.yml
```

### Backend modules

The backend is organized into feature-based NestJS modules.

| Module | Responsibility |
|---|---|
| `auth` | Authentication, JWT strategies and guards |
| `users` | User management |
| `workspaces` | Workspace management and membership |
| `projects` | Project management and membership |
| `documents` | Documentation management |
| `categories` | Document categories |
| `api-specs` | OpenAPI specification management |
| `apis` | API endpoint management |
| `api-groups` | API endpoint grouping |
| `graphql-schemas` | GraphQL schema management |
| `release-notes` | Release note management |
| `audit-logs` | Audit trail |
| `media` | File and media management |
| `common` | Shared filters, interceptors and decorators |

## Database management

DocuForge uses Prisma Migrate to manage database schema changes.

Run these commands from the `backend` directory.

**Create a migration**

```bash
npx prisma migrate dev --name <migration-name>
```

**Apply migrations**

```bash
npx prisma migrate deploy
```

**Reset the development database**

```bash
npx prisma migrate reset
```

This command removes existing database records and recreates the database. Use it only in development.

**Open Prisma Studio**

```bash
npx prisma studio
```

## Testing

Backend tests use the project's configured test scripts.

Run the commands from the `backend` directory.

**Run the test suite**

```bash
npm test
```

**Generate a coverage report**

```bash
npm run test:cov
```

## Development status

The project is being developed in phases. The current roadmap distinguishes completed foundational work from functionality planned for subsequent releases.

| Phase | Status | Scope |
|---|---|---|
| 1 | Complete | Project setup, authentication, database schema and Docker configuration |
| 2 | Complete | Dashboard, workspaces, projects and team management |
| 3 | Next | Rich documentation editor using TipTap |
| 4 | Planned | OpenAPI specification upload, validation and rendering |
| 5 | Planned | GraphQL documentation |
| 6 | Planned | Review workflow and document versioning |
| 7 | Planned | Public documentation publishing |
| 8 | Planned | Full-text search, PDF export and audit log UI |
| 9 | Planned | Security hardening and comprehensive test coverage |
| 10 | Planned | Cloud deployment guides for Railway and AWS |

## Contributing

Contributions, bug reports and feature requests are welcome.

To contribute:

1. Fork the repository.
2. Create a feature branch.

   ```bash
   git checkout -b feature/my-feature
   ```

3. Commit your changes.

   ```bash
   git commit -m "Add my feature"
   ```

4. Push the branch.

   ```bash
   git push origin feature/my-feature
   ```

5. Open a pull request describing your changes.

## License

This project is licensed under the [MIT License](LICENSE).
