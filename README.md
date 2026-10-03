# Skill Gap Analyzer

[![CI](https://github.com/johi/skill-gap-analyzer/actions/workflows/ci.yml/badge.svg)](https://github.com/johi/skill-gap-analyzer/actions/workflows/ci.yml)

Skill Gap Analyzer is a full-stack application for tracking job opportunities and comparing their requirements with a user's existing skills.

The project provides structured management of job postings, skills and personal skill assessments. It is intended to form the foundation for analyzing skill gaps between a candidate's current profile and the requirements of potential jobs.

The application was also built as a technical demonstration of a modern TypeScript-based full-stack architecture, with explicit API contracts, runtime validation, automated testing and containerized development.

## Tech stack

### Backend

- Node.js
- TypeScript
- Fastify
- PostgreSQL
- Drizzle ORM / Drizzle Kit
- Zod
- Vitest

### Frontend

- Vue 3
- TypeScript
- Vite
- Vue Router
- Tailwind CSS
- Zod
- Vitest
- Vue Test Utils

### Infrastructure and tooling

- Docker / Docker Compose
- GitHub Actions
- PostgreSQL test database
- Automated backend and frontend builds and tests

## Features

The current application supports:

- Creating, viewing, updating and deleting job opportunities
- Associating required and optional skills with jobs
- Maintaining a reusable skill catalogue
- Assessing personal skill proficiency on a 0–5 scale
- Recording structured job attributes such as seniority, work model and application status
- Runtime validation of API data using Zod
- Separate development and test databases
- Automated endpoint, repository, service and frontend tests

## Architecture

The repository contains separate backend and frontend applications:

```text
skill-gap-analyzer/
├── backend/
│   ├── src/
│   │   ├── db/
│   │   ├── errors/
│   │   ├── repositories/
│   │   ├── routes/
│   │   ├── schemas/
│   │   └── services/
│   ├── test/
│   └── drizzle/
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── schemas/
│   │   ├── types/
│   │   └── views/
│   └── tests/
├── .github/
│   └── workflows/
└── compose.yaml
```

The backend follows a layered structure separating HTTP routes, application services, repositories, validation schemas and persistence.

The frontend communicates with the backend through a dedicated API layer and validates API responses at runtime using Zod.

## Running locally

### Requirements

You need:

- Git
- Docker
- Docker Compose

Node.js and PostgreSQL do not need to be installed directly on the host.

### 1. Clone the repository

```bash
git clone git@github.com:johi/skill-gap-analyzer.git
cd skill-gap-analyzer
```

Alternatively, clone the repository using HTTPS.

### 2. Create the backend environment file

Copy the provided example:

```bash
cp backend/.env.example backend/.env
```

The default Docker development configuration uses:

```env
DATABASE_URL=postgresql://app:secret@db:5432/app
```

### 3. Start the application

```bash
docker compose up --build -d
```

This starts:

- Backend API on port `3000`
- Frontend development server on port `5173`
- PostgreSQL development database on port `5432`
- PostgreSQL test database on port `5433`

The frontend is then available at:

```text
http://localhost:5173
```

### 4. Run database migrations

```bash
docker compose exec backend npm run db:migrate
```

## Development

The containers mount the source directories from the host, so changes to the application source are available inside the development containers.

Start or stop the environment with:

```bash
docker compose up -d
docker compose down
```

View container status:

```bash
docker compose ps
```

View logs:

```bash
docker compose logs -f
```

## Testing

The project uses a dedicated PostgreSQL test database.

Apply test migrations:

```bash
docker compose exec backend npm run db:test:migrate
```

Run all backend tests:

```bash
docker compose exec backend npm test
```

The backend test suite contains endpoint, repository and service tests.

Run the frontend tests:

```bash
docker compose exec frontend npm test
```

## Builds

Type-check and build the backend:

```bash
docker compose exec backend npm run build
```

Type-check and build the frontend:

```bash
docker compose exec frontend npm run build
```

## Continuous Integration

GitHub Actions runs the project's CI workflow automatically for pushes and pull requests targeting `main`.

The workflow performs a clean environment setup and verifies:

- Docker image builds
- Test database migrations
- Backend build
- Backend test suite
- Frontend build
- Frontend test suite

The current CI status is shown by the badge at the top of this README.

## Project status

Skill Gap Analyzer is currently a demonstration project and is under active development.

The current increment establishes the core full-stack architecture, job and skill management, runtime API validation, automated testing and continuous integration.