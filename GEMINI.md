# DIU Lens

## Project Overview

DIU Lens is a full-stack application that provides biometric facial recognition capabilities. 
It uses a monorepo structure managed by `pnpm` workspaces.

### Tech Stack
*   **Backend (`apps/api`)**: Python, FastAPI, SQLAlchemy, Alembic, Celery, Redis. Database is PostgreSQL with the `pgvector` extension for storing and querying face embeddings.
*   **Frontend (`apps/web`)**: Next.js (App Router), TypeScript, Tailwind CSS, Framer Motion, shadcn/ui, Lucide icons.
*   **Infrastructure**: Docker (Docker Compose for production), Nginx.

## Building and Running

### Prerequisites
*   Node.js (compatible with Next.js 16) and `pnpm`
*   Python 3.x
*   PostgreSQL server with the `pgvector` extension installed
*   Redis server (for Celery broker/backend and distributed locks)

### Setup & Installation
From the repository root, install Node dependencies:
```bash
pnpm install
```

For the backend, set up a virtual environment and install dependencies:
```bash
cd apps/api
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Configuration
1.  **Backend Environment**: Copy `apps/api/.env.example` to `apps/api/.env` and configure `DATABASE_URL` (e.g., `postgresql+psycopg://<user>:<password>@localhost:5432/diu_lens`), `JWT_SECRET`/`SECRET_KEY`, `ALLOWED_ORIGINS`, and Redis URL if needed.
2.  **Database Extension**: Ensure `pgvector` is enabled on your PostgreSQL database:
    ```sql
    CREATE EXTENSION IF NOT EXISTS vector;
    ```

### Running Locally (One-Command)
For macOS/Linux users, a unified script runs database setup, migrations, backend, and frontend concurrently:
```bash
make dev
# or
./scripts/devctl.sh dev
```

### Running Locally (Separately)
**Backend**:
```bash
cd apps/api
alembic upgrade head
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
*(Background tasks require Celery workers and beat to be running)*

**Frontend**:
```bash
pnpm --filter web dev
# or from root:
pnpm dev
```

### Testing
Run backend tests using `pytest`:
```bash
cd apps/api
pytest
```

## Development Conventions

*   **Monorepo Management**: Use `pnpm --filter <workspace>` to run specific commands for sub-packages.
*   **Backend Architecture**: 
    *   Relies on FastAPI dependency injection and modular routers (`apps/api/app/api/routes`).
    *   Database models and session management are in `apps/api/app/db`.
    *   Heavy biometric operations (extraction, validation) are handled asynchronously by Celery workers in `apps/api/app/tasks` and `apps/api/app/core`.
    *   Operational data mutations should ensure idempotency and utilize distributed Redis locks.
*   **Frontend Architecture**: Uses Next.js App Router paradigm. UI components are primarily sourced from shadcn/ui. Styling relies on Tailwind CSS, enhanced by Framer Motion for premium, state-driven biometric scanning animations and cinematic transitions.
*   **Testing**: Backend testing is robust and must be updated alongside feature changes. Ensure database teardown and mock isolation using fixtures in `conftest.py`.