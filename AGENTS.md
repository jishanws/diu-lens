# AI Agent Instructions for DIU Lens

This document provides critical operational guidelines, architectural constraints, and workflow rules for any AI agent interacting with the DIU Lens repository.

## 1. Project Context & Architecture

DIU Lens is a robust, full-stack biometric facial recognition system.

*   **Monorepo Structure:** Managed via `pnpm` workspaces (`apps/api` and `apps/web`).
*   **Backend (`apps/api`):** Python-based. Uses **FastAPI** for the REST API, **SQLAlchemy** (async/sync mixed depending on context, default to sync in core logic unless otherwise specified) for ORM, and **Alembic** for migrations. 
*   **Asynchronous Processing:** **Celery** with **Redis** is used for heavy biometric tasks (e.g., face embedding extraction).
*   **Database:** **PostgreSQL** heavily relying on the **`pgvector`** extension for storing and querying 512-dimensional face embeddings.
*   **Frontend (`apps/web`):** **Next.js** (App Router paradigm), **TypeScript**, **Tailwind CSS**, and **shadcn/ui**.
*   **Observability & Diagnostics:** Features unified request tracing, recognition audit logging, and lightweight operational health intelligence built directly into the core app (no external stacks like Prometheus/OpenTelemetry).

## 2. Core Directives & Mandates

1.  **Strict Architectural Compliance:** Do NOT introduce new architectural layers (e.g., Kubernetes, Kafka, microservices) or change the fundamental stack (e.g., swapping FastAPI for Django) unless explicitly instructed by the user. Do NOT introduce OpenTelemetry, Prometheus, or external observability stacks.
2.  **Idempotency & Concurrency:** All operations modifying enrollment states or handling biometric processing MUST be idempotent. You must utilize distributed Redis locks (`redis_client.lock`) to prevent race conditions in background tasks.
3.  **Exhaustive Validation:** Never assume a code change works. You MUST run the backend test suite (`pytest`) after making any modifications to the API or Core logic. If you add a feature or fix a bug, you MUST write or update corresponding tests.
4.  **Context Efficiency:** Keep your file reads targeted. Rely on `grep_search` and `glob` to find usage patterns rather than dumping entire large files into context.

## 3. Backend Development Rules (`apps/api`)

### Database & ORM
*   **Session Management:** Always acquire database sessions using the context manager pattern via `get_session_factory()` to ensure connections are properly closed and returned to the pool.
    ```python
    from app.db.session import get_session_factory
    
    session_factory = get_session_factory()
    with session_factory() as db:
        # database operations
        db.commit()
    ```
*   **Migrations:** Any modification to SQLAlchemy models in `app/db/models/` requires a new Alembic migration. Run `alembic revision --autogenerate -m "description"` to generate it.
*   **Vector Operations:** When dealing with face embeddings, strictly adhere to `pgvector` querying patterns (e.g., cosine distance `<=>`).

### Asynchronous Tasks (Celery)
*   **Task State Machine:** Tasks are tracked in the `biometric_tasks` table. Any new Celery task must update its state (`queued`, `processing`, `success`, `failed`, `retrying`) using functions in `app.core.task_db`.
*   **Zombie Task Prevention:** Tasks must be robust against worker crashes. Ensure recovery mechanisms (like the one in `task_recovery.py`) account for new states if you introduce them.

### Observability & Tracing
*   **Request Tracing:** The system employs unified request tracing via FastAPI middleware (`TracingMiddleware`) and Celery signals. `request_id` and `correlation_id` are propagated using `contextvars` (in `app.core.tracing`). Always inject these context variables when creating new background tasks, audit logs, or biometric tasks.
*   **Logging:** All application logs are standardized using a `TracingFilter`. Use standard `logging` module methods (e.g., `logger.info()`), and the context will automatically append `[req:...|task:...]`.
*   **Failure Snapshotting:** For critical or unhandled exceptions, utilize `snapshot_failure(db, exc)` from `app.core.incident_timeline` to capture stack traces and processing context.
*   **System Health:** A lightweight background monitor (`monitor_system_health_task`) evaluates queue depth, redis connectivity, worker states, and retry spikes.

### Testing
*   **Execution:** Run tests from the `apps/api` directory using: `PYTHONPATH=. .venv/bin/pytest`.
*   **Database Isolation:** Tests utilize a local SQLite database per test session for speed and isolation. When testing functions that instantiate their own database sessions, you MUST use `monkeypatch` to inject the `db_session_factory` fixture to prevent connection errors or cross-test contamination.
    ```python
    def test_example(db_session_factory, monkeypatch):
        monkeypatch.setattr("app.core.target_module.get_session_factory", lambda: db_session_factory)
        # proceed with test
    ```

## 4. Frontend Development Rules (`apps/web`)

*   **UI Components:** Check `apps/web/components/ui/` for existing `shadcn/ui` components before creating new ones or installing new libraries.
*   **Styling:** Use Tailwind CSS utility classes strictly. Custom CSS (`globals.css`) is permitted for complex keyframe animations (e.g., biometric scanning pulses) or global theme overrides.
*   **Animations:** Use **Framer Motion** for complex, state-driven SVG/path animations, liquid transitions, and layout changes. Easing should feel premium and cinematic (e.g., `ease: [0.32, 0.72, 0, 1]`).
*   **Aesthetics:** The UI relies on a premium, dark, futuristic "glassmorphism" aesthetic. Prioritize visual communication (e.g., animated rings, glows, segmented nodes) over textual labels whenever possible, especially in biometric verification flows.
*   **Linting:** Ensure code passes `pnpm --filter web lint` before finalizing tasks.

## 5. Standard Commands for Agents

*   **Install Backend Deps:** `cd apps/api && .venv/bin/pip install -r requirements.txt`
*   **Run Backend Tests:** `cd apps/api && PYTHONPATH=. .venv/bin/pytest`
*   **Format/Lint Backend:** Check if `ruff` or `black` is available in requirements, otherwise rely on manual idiomatic formatting.
*   **Generate Migration:** `cd apps/api && .venv/bin/alembic revision --autogenerate -m "..."`
*   **Run Frontend Linter:** `pnpm --filter web lint`

## 6. Frontend Design Skill

This skill guides creation of distinctive, production-grade frontend interfaces that avoid generic "AI slop" aesthetics. Implement real working code with exceptional attention to aesthetic details and creative choices.

The user provides frontend requirements: a component, page, application, or interface to build. They may include context about the purpose, audience, or technical constraints.

### Design Thinking

Before coding, understand the context and commit to a BOLD aesthetic direction:
- **Purpose**: What problem does this interface solve? Who uses it?
- **Tone**: Pick an extreme: brutally minimal, maximalist chaos, retro-futuristic, organic/natural, luxury/refined, playful/toy-like, editorial/magazine, brutalist/raw, art deco/geometric, soft/pastel, industrial/utilitarian, etc. There are so many flavors to choose from. Use these for inspiration but design one that is true to the aesthetic direction.
- **Constraints**: Technical requirements (framework, performance, accessibility).
- **Differentiation**: What makes this UNFORGETTABLE? What's the one thing someone will remember?

**CRITICAL**: Choose a clear conceptual direction and execute it with precision. Bold maximalism and refined minimalism both work - the key is intentionality, not intensity.

Then implement working code (HTML/CSS/JS, React, Vue, etc.) that is:
- Production-grade and functional
- Visually striking and memorable
- Cohesive with a clear aesthetic point-of-view
- Meticulously refined in every detail

### Frontend Aesthetics Guidelines

Focus on:
- **Typography**: Choose fonts that are beautiful, unique, and interesting. Avoid generic fonts like Arial and Inter; opt instead for distinctive choices that elevate the frontend's aesthetics; unexpected, characterful font choices. Pair a distinctive display font with a refined body font.
- **Color & Theme**: Commit to a cohesive aesthetic. Use CSS variables for consistency. Dominant colors with sharp accents outperform timid, evenly-distributed palettes.
- **Motion**: Use animations for effects and micro-interactions. Prioritize CSS-only solutions for HTML. Use Motion library for React when available. Focus on high-impact moments: one well-orchestrated page load with staggered reveals (animation-delay) creates more delight than scattered micro-interactions. Use scroll-triggering and hover states that surprise.
- **Spatial Composition**: Unexpected layouts. Asymmetry. Overlap. Diagonal flow. Grid-breaking elements. Generous negative space OR controlled density.
- **Backgrounds & Visual Details**: Create atmosphere and depth rather than defaulting to solid colors. Add contextual effects and textures that match the overall aesthetic. Apply creative forms like gradient meshes, noise textures, geometric patterns, layered transparencies, dramatic shadows, decorative borders, custom cursors, and grain overlays.

NEVER use generic AI-generated aesthetics like overused font families (Inter, Roboto, Arial, system fonts), cliched color schemes (particularly purple gradients on white backgrounds), predictable layouts and component patterns, and cookie-cutter design that lacks context-specific character.

Interpret creatively and make unexpected choices that feel genuinely designed for the context. No design should be the same. Vary between light and dark themes, different fonts, different aesthetics. NEVER converge on common choices (Space Grotesk, for example) across generations.

**IMPORTANT**: Match implementation complexity to the aesthetic vision. Maximalist designs need elaborate code with extensive animations and effects. Minimalist or refined designs need restraint, precision, and careful attention to spacing, typography, and subtle details. Elegance comes from executing the vision well.

Remember: Claude is capable of extraordinary creative work. Don't hold back, show what can truly be created when thinking outside the box and committing fully to a distinctive vision.
