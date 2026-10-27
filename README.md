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
- Analyzing skill demand across non-expired jobs, including occurrence counts, requirement breakdowns, and demand percentages
- Comparing market demand with personal skill assessments, calculating proficiency gaps against a fixed target of 5, and identifying unassessed skills
- Ranking upskilling opportunities using demand-weighted priority scores, while flagging missing assessments
- Calculating per-job skill match scores with weighted assessment coverage, an individual skill breakdown, and explicit handling of unassessed skills
- Maintaining a reusable skill catalogue, merging equivalent skills, and assessing personal skill proficiency on a 0–5 scale
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

### Skill demand, skill gaps, and skill priorities architecture

**Skill demand:** `GET /api/v1/analysis/skill-demand` uses `MarketAnalysisRepository` to aggregate skill occurrences and must-have/nice-to-have counts in PostgreSQL. `MarketAnalysisService` calculates each skill's demand percentage, rounded to one decimal place.

**Skill gaps:** `GET /api/v1/analysis/skill-gaps` uses `SkillGapAnalysisService` to combine market-demand results with assessments from `UserSkillRepository`, matched by `skillId`. Assessed proficiency ranges from 0 to 5; missing assessments remain `null`, not zero.

**Skill priorities:** `GET /api/v1/analysis/skill-priorities` uses `SkillPriorityService` to consume skill-gap results, calculate a demand weight and a priority score, and rank assessed skills by descending score. Unassessed skills have `priorityScore: null` and sort last. The response includes `missingInformation`, containing `market_demand` when there are no analyzed jobs/skills and `skill_assessments` when any analyzed skills lack a proficiency assessment. No data is persisted by these analysis endpoints.

The frontend validates all three endpoint responses using Zod and presents **Market Demand**, **Skill Gaps**, and **Priorities** tabs in `SkillDemandView.vue`.

### Merging catalogue skills

The Skills page supports merging one or more source skills into a selected target skill. The target keeps its existing name, category, and personal proficiency assessment. On confirmation, the backend updates `job_skills.skill_id` to the target skill ID, leaving each `job_id` and its other job data unchanged. If a job already references the target skill, the redundant source association is deleted and the existing target association (including its requirement) is retained.

The source skills are deleted after their associations have been handled. Their personal proficiency assessments are deleted by the existing foreign-key cascade; proficiency values are **not** transferred. The operation runs within a single PostgreSQL transaction, so a failure rolls back the merge. Job, market-demand, gap, and match analyses subsequently use the consolidated associations.

### Job match analysis

`GET /api/v1/jobs/:id/match` uses `JobMatchAnalysisService` to retrieve a job’s required skills and the candidate’s current assessments. `JobMatchService` calculates a weighted match and assessment coverage without modifying stored data. The Job Detail page shows the calculated match, coverage, and per-skill match factors; Refresh retrieves current assessments. The calculated match is distinct from the stored **Original match** and **Interest** fields.

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

Apply migrations to the development database (`app`):

```bash
docker compose exec backend npm run db:migrate
```

Apply migrations separately to the test database (`app_test`) before running tests:

```bash
docker compose exec backend npm run db:test:migrate
```

The two databases are independent. Migrating `app` does **not** create tables in `app_test`. Run both migration commands on a fresh checkout, and rerun the relevant command whenever database migrations are added.

## Merging skills

1. Open **Skills** and select the source skills to consolidate.
2. Choose the existing skill to retain as the target.
3. Confirm the merge.
4. The source skills disappear from the catalogue, and their job associations now point to the target. If a job already had the target skill, that association remains unchanged.

Source-skill proficiency assessments are discarded, even when the target has no assessment. If needed, assess the retained skill again under **My Skills**. This operation cannot be undone through the UI.

## Analyzing a job advertisement

1. Open the application and navigate to **Jobs → Analyze advertisement**.
2. Enter a public job advertisement URL and select **Analyze URL**. Alternatively, paste the full advertisement into the manual input and select **Analyze advertisement**.
3. If URL retrieval fails, paste the text manually. Keep the URL in the URL field if you want to associate it with the pasted advertisement.
4. Review the extracted job metadata, language requirements, and skills. Correct any inaccurate values or must-have/nice-to-have classifications. Skills already in the catalogue retain their canonical categories.
5. For any **New category**, either select **Accept new category** or use **Replace with existing category**. You can edit the proposed category before accepting it. All new categories must be resolved before approval.
6. Select **Approve review**, then **Save approved job**. Approval alone does not make a network request or persist the job.
7. Check the saved job's details, including its source URL and original advertisement. Newly accepted categories are available when analyzing the next job.

The analysis and review stages do not persist a job. Saving is a separate, explicit action. Editing the reviewed data after approval requires reapproval.

## Analyzing skill demand, gaps, and priorities

1. Open **Skill Demand** in the application navigation, or visit [http://localhost:5173/skill-demand](http://localhost:5173/skill-demand).
2. Select **Market Demand** to inspect job counts, must-have and nice-to-have counts, and demand percentages.
3. Select **Skill Gaps** to compare market demand with your assessed proficiency and gap against the fixed target of 5.
4. Select **Priorities** to rank upskilling opportunities by their demand-weighted priority score. This tab also shows demand weight, proficiency, gap, and assessment status.
5. Select a column heading to sort; select it again to reverse direction. The Priorities tab defaults to descending priority score. Missing numeric values sort last.

### Calculation formulas

The analysis considers **non-expired jobs with at least one associated skill**. Let:

- **T** = total number of jobs analyzed (same denominator for all skills)
- **J** = number of analyzed jobs mentioning the skill
- **M** = number of analyzed jobs listing the skill as *must-have*
- **N** = number of analyzed jobs listing the skill as *nice-to-have*
- **L** = personally assessed proficiency, an integer from 0 through 5
- **G** = skill gap relative to the fixed target proficiency of 5
- **W** = demand weight, from 0 to 1
- **P** = priority score, from 0 to 100

**Market demand percentage**

```text
Demand percentage = (J / T) × 100
```

The result is rounded to **one decimal place**. When no jobs qualify, the endpoint returns an empty skills array and `totalJobsAnalyzed: 0` rather than dividing by zero.

**Personal skill gap**

```text
G = 5 − L
```

A proficiency of 5 produces gap 0; proficiency 0 produces gap 5. If the skill has not been assessed, `proficiency` and `gap` are `null`, and `status` is `unassessed`. An unassessed skill is **not** treated as proficiency zero.

**Demand weighting and skill priority**

```text
W = (2 × M + N) / (2 × T)
P = 100 × W^0.7 × (G / 5)^0.3
```

Must-have requirements receive **twice** the weight of nice-to-have requirements. The priority model is a **weighted geometric formula**, with demand exponent 0.7 and skill-gap exponent 0.3; these exponents express relative sensitivity, **not** an additive 70/30 split. This is an initial, tunable heuristic, not an empirically validated ranking model.

The priority score is rounded to **one decimal place**. A fully proficient skill (`G = 0`) has priority 0. Unassessed skills have `priorityScore: null` and appear after scored skills. When market demand is missing, the result reports `market_demand`; when skill assessments are missing, it reports `skill_assessments` in `missingInformation`. Analysis does not modify stored data.

All three tabs provide loading, empty, and error/retry states.

## Calculating a job match

Open a job from the **Jobs** list and inspect **Calculated job match** on its detail page. The score reflects your currently assessed proficiency for that job’s skill requirements. The **Refresh** button recalculates it after assessments change.

For each required skill *i*, define:

- **Lᵢ**: assessed proficiency, from 0 to 5; unassessed skills have no Lᵢ value
- **wᵢ**: requirement weight, **2** for must-have and **1** for nice-to-have
- **Fᵢ**: match factor, from 0 to 1
- **A**: the set of assessed skills required by this job
- **R**: all skills required by this job

```text
Fᵢ = min(1, Lᵢ / 4)

Calculated match (%) = 100 × Σ(wᵢ × Fᵢ, i ∈ A) / Σ(wᵢ, i ∈ A)

Assessment coverage (%) = 100 × Σ(wᵢ, i ∈ A) / Σ(wᵢ, i ∈ R)
```

Both percentages are rounded to **one decimal place**. Proficiency **4/5 or 5/5** fully satisfies a requirement; **0/5** is a valid assessment and contributes zero. Must-have skills carry twice the weight of nice-to-have skills.

**Unassessed skills are excluded from both the numerator and denominator of the calculated match**, rather than being treated as proficiency zero. They still count toward total requirement weight when calculating assessment coverage. For example, if PHP and Docker are both must-have, PHP is assessed at 5/5, and Docker is unassessed, the result is **100% calculated match with 50% assessment coverage**. A high match with low coverage is incomplete evidence, not a claim that all requirements are met.

If no required skills have been assessed, `matchPercentage` is `null` and coverage is **0%**. If a job has no skill requirements, `matchPercentage` is `null`, coverage is **0%**, and `missingInformation` contains `job_skills`. Missing assessments are indicated by `skill_assessments`. The API returns the underlying per-skill proficiency, match factor, and assessment status to make the calculation inspectable.

This is a deterministic, skill-based heuristic. It does not assess seniority, languages, education, location, or other non-skill requirements, and it does not overwrite the job’s stored **Original match** value.

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

The project uses a dedicated PostgreSQL test database (`app_test`), separate from the development database (`app`). Before the first test run—and after adding new database migrations—apply the migrations to `app_test`:

```bash
docker compose exec backend npm run db:test:migrate
```

Run all backend tests:

```bash
docker compose exec backend npm test
```

The backend suite includes endpoint, repository, service, and schema tests. The backend test scripts load `.env.test` with `--override` and use the corresponding Vitest configuration; invoke those scripts rather than calling Vitest directly. The database connection guard rejects attempts to run tests against a non-test database.

Run the backend test suites individually if needed:

```bash
docker compose exec backend npm run test:repository
docker compose exec backend npm run test:service
docker compose exec backend npm run test:endpoint
```

To run a single repository test file:

```bash
docker compose exec backend npm run test:repository -- test/repositories/market-analysis-repository.test.ts
```

To run the skill-gap and skill-priority service tests and the analysis endpoint and frontend tests specifically:

```bash
docker compose exec backend npm run test:service -- test/services/skill-gap-analysis-service.test.ts
docker compose exec backend npm run test:service -- test/services/skill-priority-service.test.ts
docker compose exec backend npm run test:endpoint -- test/endpoints/market-analysis.test.ts
docker compose exec frontend npm test -- tests/views/SkillDemandView.test.ts --maxWorkers=2
```

To run job-match backend and frontend tests specifically:

```bash
docker compose exec backend npm run test:service -- test/services/job-match-service.test.ts
docker compose exec backend npm run test:endpoint -- test/endpoints/job-match.test.ts
docker compose exec frontend npm test -- tests/components/JobMatch.test.ts --maxWorkers=2
```

Merge skills coverage includes service input validation, API requests, repository association updates, duplicate job associations, deletion of source assessments, and transaction rollback. To run the merge tests individually:

```bash
docker compose exec backend npm run test:service -- test/services/skill-merge.test.ts
docker compose exec backend npm run test:repository -- test/repositories/skill-merge.test.ts
docker compose exec backend npm run test:endpoint -- test/endpoints/skill-merge.test.ts
```

If a test fails with `relation "job_skills" does not exist`, check that the test migrations above completed successfully.

**Run frontend tests with a limited worker count:**

```bash
docker compose exec frontend npm test -- --maxWorkers=2
```

The `--` forwards `--maxWorkers=2` to Vitest. This limit is intentional: unrestricted worker startup caused resource exhaustion and test-run failures in the Docker development environment. Use this command instead of the bare `docker compose exec frontend npm test` invocation. A worker-startup timeout does not necessarily indicate a failing application test.

Run every backend test suite, all frontend tests, and both builds in one fail-fast command:

```bash
docker compose exec backend npm run test:repository && \
docker compose exec backend npm run test:service && \
docker compose exec backend npm run test:endpoint && \
docker compose exec frontend npm test -- --maxWorkers=2 && \
docker compose exec backend npm run build && \
docker compose exec frontend npm run build
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

The workflow verifies:

- Docker image builds
- Test database migrations
- Backend build and tests
- Frontend build and tests

The current CI status is shown by the badge at the top of this README. If frontend Vitest workers also exhaust resources in CI, apply the same `--maxWorkers=2` limit to the workflow's frontend test command; changing this README does not change the CI configuration.

## Project status

Skill Gap Analyzer is an actively developed demonstration project. It now supports end-to-end AI-assisted job advertisement analysis, including URL retrieval, two-stage skill categorization, deterministic reuse of the skill catalogue, editable human review, explicit approval, and database persistence. Job management, skill catalogue merging, skill assessments, skill demand, gap, priority, and per-job match analysis, JSON import, automated testing, and CI are also in place.

Planned improvements include JSON export, automatic skill-gap curriculum generation, and a later evaluation of MCP integration.
