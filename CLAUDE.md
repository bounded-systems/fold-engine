# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## Project Overview

Unfold is a compiler that treats Obsidian Markdown notes as typed records,
validates the vault, and emits deterministic static artifacts (HTML, JSON,
manifests, and machine-readable projections). The Obsidian vault is the single
source of truth.

## Development Commands

### Core Workflow

```bash
# Development server (port 3000)
deno task dev

# Run full build pipeline
deno task build

# Validate vault notes
deno task validate

# Run tests
deno task test

# Format and lint
deno task fmt
deno task lint

# CI gate (format, lint, test, validate)
deno task ci

# Clean build artifacts
deno task clean
```

### Internal Commands

```bash
# Cache Lume dependencies
deno task cache

# Build site only (no validation)
deno task build:site

# Generate Unfold docs
deno task docs
```

### Beads (Issue Tracking)

```bash
# View available work
bd ready

# View all issues
bd list

# Show issue details
bd show <issue-id>

# Create new issue
bd create "Issue description"

# Update issue status
bd update <issue-id> --status in_progress
bd update <issue-id> --status done

# Close issue
bd close <issue-id>

# Sync with git
bd sync
```

**Important:** This project uses beads for AI-native issue tracking. Issues are
stored in `.beads/` and synced with git. **Worktrees:** Run `bd` from a worktree
checkout (not the bare repo store). Use `./scripts/bd` to auto-hop out of a bare
repo and pin the local `.beads/beads.db` when present.

### Docker Workflow

```bash
# Build images with Bake (not docker-compose)
docker buildx bake

# Run services
docker compose up unfold

# Run tests in container
docker compose run --rm unfold-test
```

**Important:** Compose consumes pre-built images from Bake. Never add `build:`
directives to `docker-compose.yml`.

## Architecture

Unfold is organized as a multi-pass compiler. Each directory represents a pass
or interface:

### Pipeline Flow

```
vault/ (Obsidian notes)
  ↓ inputs/ (ingestion, markdown, frontmatter validation)
  ↓ pipeline/ (orchestration: validate → render → export)
  ↓ manifests/ (structured artifacts: site/fold manifests)
  ↓ renderers/ (Lume adapter for HTML)
  ↓ exporters/ (JSON, JSON-LD, MCP, graph outputs)
  ↓ dist/ (publish artifacts)
```

### Key Modules

- **`cli/`** — CLI entrypoints and argument parsing
- **`pipeline/`** — Orchestrates validate → render → export passes
  - `validate.ts` validates vault notes
  - `render.ts` generates HTML via Lume
  - `export.ts` produces JSON/JSON-LD artifacts
  - `build.ts` runs all passes sequentially
- **`inputs/`** — Vault ingestion and preprocessing
  - `vault/` handles Obsidian vault access
  - `frontmatter/` validates YAML frontmatter
  - `markdown/` processes Markdown content
- **`manifests/`** — Structured metadata (site manifest, fold manifest)
- **`renderers/`** — HTML output via Lume static site generator
- **`exporters/`** — Machine-readable outputs
  - `jsonld.ts` JSON-LD exports
  - `graph.ts` knowledge graph
  - `mcp.ts` MCP protocol support
  - `llms.ts` LLM-optimized outputs
- **`schemas/`** — Canonical JSON schemas for validation
- **`contracts/`** — Golden expectations and test fixtures
- **`vault_api/`** — HTTP API for vault content (port 7777)
- **`site/`** — Lume site configuration and URL handling
- **`tests/`** — Integration and contract tests

### Docker Services

Three services run in Compose:

1. **`unfold`** — Main dev server (port 3000)
   - Depends on `vault-api`
   - Environment: `VAULT_BASE_URL=http://vault-api:7777`
   - Health check: `GET /healthz`

2. **`vault-api`** — Vault content API (port 7777)
   - Serves read-only vault content
   - Mounts `vault-data` volume from `vault` service

3. **`vault`** — Git-backed vault data
   - Clones vault from `VAULT_REPO` environment variable
   - Supports `VAULT_BRANCH`, `VAULT_SHA`, or `VAULT_TAG`
   - Exposes content via `vault-data` volume

### Testing

- Test files use `*_test.ts` naming convention
- Tests run with `deno task test` (grants all permissions via `-A` flag)
- Docker: `docker compose run --rm unfold-test` (uses `test` profile)
- Integration tests validate entire pipeline outputs

## Development Patterns

### Adding a New Pass

Each pass is independently testable:

1. Create module in appropriate directory (`inputs/`, `exporters/`, etc.)
2. Export a `run*` function (e.g., `runExport()`)
3. Add to `pipeline/build.ts` if part of core build
4. Add tests using `*_test.ts` convention

### Schema Validation

Frontmatter validation uses schemas in `schemas/`:

- Edit `vault.manifest.schema.json` for note frontmatter
- Edit `site.manifest.schema.json` for site metadata
- Validation happens in `pipeline/validate.ts`

### Working with Vault Content

Vault content is accessed via:

- **Local development:** Direct filesystem reads from `vault/` directory
- **Docker:** HTTP API at `http://vault-api:7777`
- Set `VAULT_REQUIRE_BASE_URL=1` to enforce API usage

### Linting Rules

Strict linting enabled (see `deno.json`):

- No `console.log` (use structured logging if needed)
- Explicit return types required
- No non-null assertions (`!`)
- No `eval` or top-level `await`
- Always run `deno task fmt` before committing

## Common Workflows

### Full Build from Scratch

```bash
deno task clean
deno task build
```

### Watch Mode Development

```bash
deno task dev:watch
```

### Validate After Editing Notes

```bash
deno task validate
```

### Check CI Readiness

```bash
deno task ci
```

### Generate Documentation

```bash
deno task docs
# Output: dist/unfold/
```

## Environment Variables

- `VAULT_BASE_URL` — URL to vault API (Docker: `http://vault-api:7777`)
- `VAULT_REQUIRE_BASE_URL` — Enforce API usage (set to `1` in Docker)
- `VAULT_REPO` — Git repository for vault content (Docker only)
- `VAULT_BRANCH` — Git branch to checkout (default: `main`)
- `VAULT_SHA` — Specific commit SHA to checkout
- `VAULT_TAG` — Git tag to checkout
- `PORT` — Server port (vault-api uses 7777, unfold uses 3000)

## Key Conventions

- **Task naming:** Public tasks use simple names (`dev`, `build`, `test`).
  Internal tasks use prefixed names (`unfold:server`, `vault:api`).
- **Bake for builds:** Use `docker buildx bake` to build images, never
  `docker compose build`.
- **Health checks:** All services expose `GET /healthz` returning `"ok"`.
- **No `build:` in Compose:** Compose files reference pre-built images only.
- **Deterministic builds:** All outputs must be reproducible for the same vault
  input.

<!-- bounded-systems-org:begin — managed by adopt-claude-harness; do not hand-edit this block -->
## bounded-systems sessions — before anything else

1. **Bootstrap**: run `bash .claude/org-repair.sh` (pre-approved; verifies every
   byte against `$ORG_BOOT_SHA256`, refuses unverified code). `bootstrap in
   effect` → continue. `REFUSED` or a permission denial → stop and report; do
   not work around it.
2. **Claim before working**: dispatch `claim-ticket.yml` in
   `bounded-systems/.github` (workflow_dispatch: `repo`, `issue`, `claimant`),
   then confirm the claim comment ON THE ISSUE names your claimant. Any
   assignee or `claimed` label → someone else's. Window unreachable → claim by
   hand (assign + comment) and say the window was down. No issue → open one.
3. **Degraded mode**: no "bounded-systems — Claude context" block in your
   session context means the org context did not load. You may claim and work
   THIS repo only — no org-level `[settings]`/`[org]` changes, no cross-repo
   work.
<!-- bounded-systems-org:end -->