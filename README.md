# Skill Gap Analyzer

[![CI](https://github.com/johi/skill-gap-analyzer/actions/workflows/ci.yml/badge.svg)](https://github.com/johi/skill-gap-analyzer/actions/workflows/ci.yml)

Skill Gap Analyzer is a full-stack application for managing job opportunities, extracting their requirements with AI, and comparing those requirements with a candidate's existing skills.

The application combines structured job and skill management with an AI-assisted workflow for analyzing advertisements. AI-generated results are proposals: the user can correct the extracted metadata and skills before explicitly approving and saving a job. Skill categories are maintained through a two-stage AI workflow, deterministic catalogue matching, and human review.

The project also serves as a technical demonstration of a modern TypeScript-based full-stack architecture, with explicit API contracts, runtime validation, automated testing, and containerized development.

## Tech stack

### Backend

- Node.js and TypeScript
- Fastify
- PostgreSQL
- Drizzle ORM / Drizzle Kit
- Zod
- Vitest
- OpenAI API (initial AI provider)

### Frontend

- Vue 3 and TypeScript
- Vite and Vue Router
- Tailwind CSS
- Zod
- Vitest and Vue Test Utils

### Infrastructure and tooling

- Docker / Docker Compose
- GitHub Actions
- Separate PostgreSQL development and test databases
- Automated backend and frontend builds and tests

## Features

The application currently supports:

- Creating, viewing, updating, and deleting job opportunities
- Associating must-have and nice-to-have skills with jobs
- Maintaining a reusable skill catalogue and assessing personal skill proficiency on a 0–5 scale
- Recording structured job attributes such as seniority, work model, application status, experience, education, and language requirements
- Supporting multiple preferred or required languages per job using ISO 639-1 language codes
- Searching, filtering, sorting, and paginating jobs with URL-backed filters
- Importing jobs from a versioned JSON dataset with validation, skill normalization, preview, and review before commit
- Optionally replacing the existing job dataset during import, with explicit confirmation
- Analyzing a pasted job advertisement with AI to extract metadata and skill requirements
- Analyzing a job advertisement directly from a public HTTP(S) URL
- Extracting advertisement content from structured `JobPosting` data or readable page content, with manual paste as a fallback when retrieval is blocked or unsuccessful
- Extracting skills first, then matching them deterministically against the existing skill catalogue before AI proposes categories for unmatched skills
- Reusing canonical categories for existing skills and suggesting existing categories for new skills when appropriate
- Supporting free-form, industry-agnostic, human-readable skill categories rather than a fixed taxonomy
- Reviewing and correcting AI-proposed metadata, skills, requirements, and categories, with explicit acceptance or replacement of new categories
- Applying category review to both AI job analysis and JSON import before persistence
- Explicitly approving and saving reviewed jobs, preserving the original advertisement and source URL
- Provider-independent AI analysis contracts and instructions, with OpenAI as the initial implementation
- Runtime validation of API data using Zod
- Automated endpoint, repository, service, schema, and frontend tests

**Current limitations:** New skill categories require explicit human acceptance or replacement; categorization is not fully autonomous. JSON export and automatic skill-gap curriculum generation are not implemented yet.

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
│   │   │   ├── job-import/
│   │   │   ├── jobs/
│   │   │   ├── skills/
│   │   │   ├── ui/
│   │   │   └── user-skills/
│   │   ├── composables/
│   │   ├── schemas/
│   │   ├── services/
│   │   │   ├── job-analysis/
│   │   │   └── job-import/
│   │   ├── types/
│   │   └── views/
│   └── tests/
├── .github/
│   └── workflows/
└── compose.yaml
```

The backend separates HTTP routes, application services, repositories, validation schemas, and persistence. The job-analysis service depends on a provider-independent interface; the OpenAI adapter handles provider-specific API communication. Extraction instructions and the structured output contract are kept separate from that adapter.

The frontend communicates with the backend through a dedicated API layer and validates responses using Zod. Views compose feature-specific components, composables manage reactive workflows, and services hold reusable domain logic. Shared UI primitives are separate from feature components. Frontend source imports use the `@/` path alias.

### AI job analysis workflow

```text
Job URL ──> Backend URL retrieval ──┐
                                    ├──> AI extracts job metadata and skills
Pasted advertisement ───────────────┘                    │
                                                         v
                                              Match skills to catalogue
                                                         │
                            ┌────────────────────────────┴───────────────────┐
                            v                                                v
                   Existing skill                                    Unmatched skill
                   Reuse canonical                                   AI proposes category
                   category                                          using existing categories
                            │                                                │
                            └────────────────────────────┬───────────────────┘
                                                         v
                                             Review metadata and skills
                                             Accept/replace new categories
                                                         │
                                                         v
                                                 Explicit approval
                                                         │
                                                         v
                                                   Save job to DB
```

The backend retrieves public job pages with redirect and IP-address validation, bounded response sizes, and request timeouts. It does not guarantee retrieval from sites that require JavaScript execution, authentication, or block automated requests. In those cases, paste the advertisement text manually.

Analysis alone does **not** create a job. Saving happens only after the user reviews and approves the proposed data. The original advertisement is retained for reference.

### Two-stage skill categorization

The categorization workflow is **industry-agnostic**: there is no predefined list of permissible categories. Categories are readable labels such as `Programming Languages`, `Software Architecture`, or `API Design & Development`, rather than machine-style identifiers such as `programming_languages`.

1. **Extract:** AI identifies the skills required by the advertisement, including must-have or nice-to-have requirements, without relying on its initial category guesses.
2. **Match:** The backend checks extracted skill names against the existing catalogue. A matched skill keeps its established category; AI suggestions do not overwrite the canonical category.
3. **Categorize unmatched skills:** AI receives the existing category names as context and proposes a suitable category for each unmatched skill. It should prefer an appropriate existing category but can propose a new one.
4. **Review:** The interface marks proposed new categories as **New**. The user can edit a category, explicitly **Accept new category**, or select **Replace with existing category**. Empty or unresolved categories prevent approval.
5. **Save:** Only after the review is approved and the user explicitly saves the job are its details and skill associations persisted. Accepted categories become part of the shared catalogue and are available to subsequent analyses.

Category names are normalized for consistent human-readable presentation, and matching against existing category names is case-insensitive. The catalogue is the source of truth for previously recorded skills. The same new-category review principle applies to JSON imports.

## Running locally

### Requirements

You need:

- Git
- Docker
- Docker Compose
- An OpenAI API key **only if you want to use AI analysis**

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

The default Docker development database configuration uses:

```env
DATABASE_URL=postgresql://app:secret@db:5432/app
```

To enable AI analysis, also set the following in `backend/.env`:

```env
OPENAI_API_KEY=your_openai_api_key
# Optional; defaults to gpt-4o-mini
OPENAI_MODEL=gpt-4o-mini
```

The OpenAI API is billed separately from a ChatGPT subscription. **Do not commit `backend/.env` or your API key to Git.** Job advertisement content submitted for analysis is sent to the configured AI provider.

### 3. Start the application

```bash
docker compose up --build -d
```

This starts:

- Backend API on port `3000`
- Frontend development server on port `5173`
- PostgreSQL development database on port `5432`
- PostgreSQL test database on port `5433`

Open [http://localhost:5173](http://localhost:5173).

If you add or change environment variables after the backend container is already running, recreate it so it receives the updated configuration:

```bash
docker compose up -d --force-recreate backend
```

### 4. Run database migrations

```bash
docker compose exec backend npm run db:migrate
```

## Analyzing a job advertisement

1. Open the application and navigate to **Jobs → Analyze advertisement**.
2. Enter a public job advertisement URL and select **Analyze URL**. Alternatively, paste the full advertisement into the manual input and select **Analyze advertisement**.
3. If URL retrieval fails, paste the text manually. Keep the URL in the URL field if you want to associate it with the pasted advertisement.
4. Review the extracted job metadata, language requirements, and skills. Correct any inaccurate values or must-have/nice-to-have classifications. Skills already in the catalogue retain their canonical categories.
5. For any **New category**, either select **Accept new category** or use **Replace with existing category**. You can edit the proposed category before accepting it. All new categories must be resolved before approval.
6. Select **Approve review**, then **Save approved job**. Approval alone does not make a network request or persist the job.
7. Check the saved job's details, including its source URL and original advertisement. Newly accepted categories are available when analyzing the next job.

The analysis and review stages do not persist a job. Saving is a separate, explicit action. Editing the reviewed data after approval requires reapproval.

## Importing the sample job dataset

The import screen accepts a version 1 JSON dataset:

1. Open [http://localhost:5173](http://localhost:5173) and navigate to **Import Jobs**.
2. Under **Select dataset**, choose `backend/test/fixtures/sample.import.json` from your local project checkout.
3. Select **Analyze dataset** and review the jobs, skill matches, proposed categories, and items requiring manual resolution.
4. Accept or replace any new categories, and edit or exclude jobs as needed. Unresolved new categories block committing included jobs.
5. Confirm the import to save the included jobs.

Importing writes to the development database. Repeating an import may create duplicate job records. The **Replace Existing Dataset** option deletes existing jobs and their job-specific requirements before importing the reviewed dataset; it requires explicit confirmation. It preserves the shared skill catalogue and personal skill assessments. Use this option carefully.

JSON export is not implemented yet.

## Development

The containers mount source directories from the host, so changes to application source are available inside the development containers.

Start or stop the environment:

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

Run backend and frontend npm commands **inside their Docker containers**, as shown below, rather than relying on host-installed Node.js packages.

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

The backend suite includes endpoint, repository, service, and schema tests.

**Run frontend tests with a limited worker count:**

```bash
docker compose exec frontend npm test -- --maxWorkers=2
```

The `--` forwards `--maxWorkers=2` to Vitest. This limit is intentional: unrestricted worker startup caused resource exhaustion and test-run failures in the Docker development environment. Use this command instead of the bare `docker compose exec frontend npm test` invocation. A worker-startup timeout does not necessarily indicate a failing application test.

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

The workflow verifies:

- Docker image builds
- Test database migrations
- Backend build and tests
- Frontend build and tests

The current CI status is shown by the badge at the top of this README. If frontend Vitest workers also exhaust resources in CI, apply the same `--maxWorkers=2` limit to the workflow's frontend test command; changing this README does not change the CI configuration.

## Project status

Skill Gap Analyzer is an actively developed demonstration project. It now supports end-to-end AI-assisted job advertisement analysis, including URL retrieval, two-stage skill categorization, deterministic reuse of the skill catalogue, editable human review, explicit approval, and database persistence. Job management, skill assessments, JSON import, automated testing, and CI are also in place.

Planned improvements include additional skill-gap analysis capabilities, JSON export, automatic skill-gap curriculum generation, and a later evaluation of MCP integration.
