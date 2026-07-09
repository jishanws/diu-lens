<div id="top"></div>

<div align="center">

# DIU Lens

<em>Full-stack biometric enrollment, review, and facial recognition for DIU student identity workflows.</em>

<br>

<img src="https://img.shields.io/github/last-commit/jishanws/diu-lens?style=for-the-badge&logo=git&logoColor=white&color=00ADD8" alt="last commit">
<img src="https://img.shields.io/github/languages/top/jishanws/diu-lens?style=for-the-badge&color=00ADD8" alt="top language">
<img src="https://img.shields.io/github/languages/count/jishanws/diu-lens?style=for-the-badge&color=00ADD8" alt="language count">

<br>
<br>

<img src="https://img.shields.io/badge/FastAPI-009688.svg?style=for-the-badge&logo=FastAPI&logoColor=white" alt="FastAPI">
<img src="https://img.shields.io/badge/SQLAlchemy-D71F00.svg?style=for-the-badge&logo=SQLAlchemy&logoColor=white" alt="SQLAlchemy">
<img src="https://img.shields.io/badge/PostgreSQL%20%2B%20pgvector-4169E1.svg?style=for-the-badge&logo=PostgreSQL&logoColor=white" alt="PostgreSQL and pgvector">
<img src="https://img.shields.io/badge/Celery-37814A.svg?style=for-the-badge&logo=Celery&logoColor=white" alt="Celery">
<img src="https://img.shields.io/badge/Redis-FF4438.svg?style=for-the-badge&logo=Redis&logoColor=white" alt="Redis">
<img src="https://img.shields.io/badge/InsightFace-111827.svg?style=for-the-badge&logo=OpenCV&logoColor=white" alt="InsightFace">
<br>
<img src="https://img.shields.io/badge/Next.js%2016-000000.svg?style=for-the-badge&logo=Next.js&logoColor=white" alt="Next.js">
<img src="https://img.shields.io/badge/React%2019-61DAFB.svg?style=for-the-badge&logo=React&logoColor=black" alt="React">
<img src="https://img.shields.io/badge/TypeScript-3178C6.svg?style=for-the-badge&logo=TypeScript&logoColor=white" alt="TypeScript">
<img src="https://img.shields.io/badge/Tailwind%20CSS%204-06B6D4.svg?style=for-the-badge&logo=Tailwind-CSS&logoColor=white" alt="Tailwind CSS">
<img src="https://img.shields.io/badge/shadcn%2Fui-000000.svg?style=for-the-badge&logo=shadcnui&logoColor=white" alt="shadcn/ui">
<img src="https://img.shields.io/badge/MediaPipe-0097A7.svg?style=for-the-badge&logo=Google&logoColor=white" alt="MediaPipe">

</div>

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment](#environment)
- [Operations](#operations)
- [Testing](#testing)
- [Documentation](#documentation)
- [License](#license)

---

## Overview

DIU Lens is a monorepo application for collecting student enrollment data, validating live face-capture samples, reviewing submissions, generating biometric embeddings, and running admin-side recognition searches.

The system is intentionally built as a practical full-stack product:

- **Frontend:** Next.js App Router, React, TypeScript, Tailwind CSS, shadcn/ui primitives, Framer Motion, and MediaPipe Tasks Vision.
- **Backend:** FastAPI, SQLAlchemy, Alembic, PostgreSQL, pgvector, Redis, Celery, InsightFace, ONNX Runtime, and OpenCV.
- **Operational core:** request tracing, audit logs, recognition analytics, incident snapshots, task tracking, zombie-task recovery, and system-health snapshots.

## Features

- **Guided student enrollment** with student ID pre-flight validation, basic-info capture, liveness/verification flow, and multi-angle face sample collection.
- **Image quality gates** for detection score, blur, brightness, face area, centering, edge margin, dimensions, pose coverage, and near-duplicate detection.
- **Admin review workflow** for pending, approved, rejected, reset, and processing enrollment states.
- **Background biometric processing** through Celery workers with Redis-backed task locks, retries, task records, and zombie recovery.
- **Face embedding storage and search** with PostgreSQL `pgvector` and cosine-distance matching.
- **Recognition console** for admin-side match probes, threshold-aware results, and recognition audit history.
- **Operational dashboards** for enrollments, audit logs, recognition analytics, system health, task state, and incident context.
- **Production Docker composition** for PostgreSQL + pgvector, Redis, API, Celery worker, and web services.

## Architecture

```text
Browser
  |
  | Next.js 16 / React 19 / MediaPipe capture UI
  v
apps/web
  |
  | NEXT_PUBLIC_API_BASE_URL
  v
apps/api - FastAPI
  |
  | SQLAlchemy / Alembic
  v
PostgreSQL + pgvector
  |
  | enrollment tasks, health checks, recovery jobs
  v
Redis + Celery worker
  |
  | InsightFace / ONNX Runtime / OpenCV
  v
Face embeddings and recognition audit records
```

Core API route groups:

| Area | Routes |
| --- | --- |
| Health | `GET /health`, `GET /` |
| Auth | `POST /auth/admin/login`, `GET /auth/admin/me` |
| Enrollment | `POST /enroll/validate-id`, `POST /enroll`, `POST /enroll/verification`, `POST /enroll/calibration` |
| Admin enrollments | `GET /admin/enrollments`, `GET /admin/enrollments/{student_id}`, approve/reject/reset/process endpoints |
| Recognition | `POST /admin/recognition/match`, `GET /admin/recognition-audit`, `GET /admin/recognition-analytics` |
| Operations | `GET /admin/biometric-tasks`, `GET /admin/system-health`, `GET /admin/audit-logs`, `GET /admin/incidents/{request_id}` |

## Project Structure

```text
diu-lens/
|-- apps/
|   |-- api/                  # FastAPI, SQLAlchemy, Alembic, Celery, biometric processing
|   |   |-- app/api/routes/   # HTTP route modules
|   |   |-- app/core/         # matching, validation, tracing, storage, task and health logic
|   |   |-- app/db/           # sessions, bootstrap, ORM models
|   |   |-- app/tasks/        # Celery tasks
|   |   |-- migrations/       # Alembic migrations
|   |   `-- tests/            # backend test suite
|   `-- web/                  # Next.js app
|       |-- app/              # App Router pages
|       |-- components/       # shared UI components
|       |-- features/         # registration and admin feature modules
|       `-- public/vendor/    # vendored MediaPipe WASM assets
|-- docs/                     # release, audit, quality, and tuning notes
|-- infra/nginx/              # production reverse-proxy snippets
|-- scripts/                  # local dev, diagnostics, backup, and smoke-test helpers
|-- docker-compose.production.yml
|-- Makefile
|-- package.json
`-- pnpm-workspace.yaml
```

## Getting Started

### Prerequisites

- Node.js compatible with Next.js 16
- `pnpm`
- Python 3 with virtual environment support
- PostgreSQL with `psql` available on `PATH`
- `pgvector` installed in the target database
- Redis for Celery task processing

### Install

```bash
pnpm install
```

```bash
cd apps/api
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

### Configure Local API

Edit `apps/api/.env`. At minimum, local development needs values equivalent to:

```bash
APP_NAME=DIU Lens API
APP_VERSION=0.1.0
APP_ENV=development
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
DATABASE_URL=postgresql+psycopg://<user>:<password>@localhost:5432/diu_lens
JWT_SECRET=replace_with_a_long_random_secret
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
FACE_MATCH_DISTANCE_THRESHOLD=0.38
FACE_MATCH_TOP_K=5
FACE_MATCH_CANDIDATE_POOL_LIMIT=200
INSIGHTFACE_MODEL_PACK=antelopev2
INSIGHTFACE_ROOT=/tmp/diu-lens-insightface
STORAGE_PATH=/tmp/diu-lens-storage
REDIS_URL=redis://localhost:6379/0
```

Enable pgvector once per database:

```bash
psql "postgresql://<user>:<password>@localhost:5432/diu_lens" \
  -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

### Run

One-command local workflow for macOS/Linux:

```bash
make dev
```

This runs the repository helper at `scripts/devctl.sh`, detects a local PostgreSQL connection, ensures the `diu_lens` database exists, applies Alembic migrations, then starts:

- API: `http://127.0.0.1:8000`
- Web: `http://127.0.0.1:3000`

Useful overrides:

```bash
API_PORT=8001 WEB_PORT=3001 DB_NAME=diu_lens_dev make dev
```

Manual startup is also supported:

```bash
cd apps/api
.venv/bin/alembic upgrade head
.venv/bin/uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

```bash
pnpm --filter web dev
```

The root `pnpm dev` script starts the web app only.

## Environment

### Backend

`apps/api/.env.example` is the source of truth for backend configuration. Important values include:

| Variable | Purpose |
| --- | --- |
| `APP_ENV` | `development` or `production`; production requires database, JWT, and storage values. |
| `DATABASE_URL` | PostgreSQL DSN. The code also supports `DB_HOST` + `DB_PASSWORD` style configuration in Docker. |
| `JWT_SECRET` | Secret used for admin auth tokens. |
| `ALLOWED_ORIGINS` | Comma-separated frontend origins for CORS. |
| `REDIS_URL` | Redis broker/result backend for Celery. |
| `STORAGE_PATH` | Writable location for enrollment image storage. |
| `INSIGHTFACE_MODEL_PACK` | InsightFace model pack, currently defaulted to `antelopev2`. |
| `FACE_MATCH_*` | Recognition threshold, result count, and candidate-pool tuning. |
| `ENROLLMENT_*` | Capture quality, liveness, and stability thresholds. |
| `BOOTSTRAP_ADMIN_*` | Optional first-admin bootstrap values. |

### Frontend

The web app expects:

```bash
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
NEXT_PUBLIC_APP_ENV=development
```

Most API calls use `NEXT_PUBLIC_API_BASE_URL`. One enrollment sample-preview path currently also checks `NEXT_PUBLIC_API_URL` with a localhost fallback, so set both names in production if that view is used:

```bash
NEXT_PUBLIC_API_URL=https://api.diulens.app
NEXT_PUBLIC_API_BASE_URL=https://api.diulens.app
```

## Operations

### Docker Production Composition

The production compose file defines:

- `db`: `pgvector/pgvector:pg17`
- `redis`: `redis:7-alpine`
- `api`: FastAPI service
- `celery_worker`: background biometric worker
- `web`: Next.js service

Run it with production secrets supplied through the shell or an env file:

```bash
docker compose -f docker-compose.production.yml up --build
```

Required production secrets include `DB_PASSWORD` and `JWT_SECRET`. The API and worker mount persistent storage volumes for biometric artifacts and PostgreSQL data.

### Celery Worker

For local development outside Docker, start a worker after Redis and the API environment are configured:

```bash
cd apps/api
.venv/bin/celery -A app.core.celery_app worker --loglevel=info --concurrency=1
```

Celery Beat schedules are configured for zombie-task recovery and system-health monitoring.

### Admin Bootstrap

Set all three bootstrap variables before API startup:

```bash
BOOTSTRAP_ADMIN_EMAIL=admin@example.com
BOOTSTRAP_ADMIN_PASSWORD=change-me
BOOTSTRAP_ADMIN_FULL_NAME="Initial Admin"
```

Or create one explicitly:

```bash
cd apps/api
.venv/bin/python -m app.scripts.create_super_admin \
  --email admin@example.com \
  --full-name "Initial Super Admin" \
  --password "change-me" \
  --role super_admin
```

## Testing

Backend:

```bash
cd apps/api
PYTHONPATH=. .venv/bin/pytest
```

Frontend lint:

```bash
pnpm --filter web lint
```

Frontend production build:

```bash
pnpm --filter web build
```

Root scripts:

```bash
pnpm dev     # web dev server only
pnpm build   # web production build
pnpm lint    # web lint
```

## Documentation

- `PRODUCTION.md` - production deployment notes.
- `apps/api/README.md` - backend setup, API checks, and pgvector prerequisites.
- `docs/enrollment-threshold-tuning.md` - capture-threshold calibration process.
- `docs/enrollment-quality-checklist.md` - quality review checklist.
- `docs/release-readiness-audit.md` - production-readiness audit notes.
- `docs/frontend-quality-standard.md` - frontend quality expectations.

## License

No repository license file is present in this checkout. Add a `LICENSE` file before publishing this as open source.

<br>

<div align="right">
  <a href="#top">Back to top</a>
</div>
