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

1. **Bootstrap**: run `bash .claude/org-repair.sh` — pre-approved where this
   repo's settings carry the org floor; generator-owned repos may still prompt.
   It executes a local or fetched copy ONLY if the bytes hash to a resolved
   digest, and refuses otherwise. The digest comes from the channel manifest
   (written only by the OIDC-pinned `boot-manifest` lane on main), with the
   legacy `$ORG_BOOT_SHA256` honored first while it still exists — that
   variable was retired outright on 2026-08-16 (`.github`#192) and is absent
   from the dialog, so the manifest is the live source.
   `bootstrap in effect` → continue. `REFUSED` or a permission denial → stop
   and report; do not work around it.
2. **Claim before working** — doors, best reachable first (`#529`):
   1. `claim-ticket.yml` in `bounded-systems/.github` (workflow_dispatch:
      `repo`, `issue`, `claimant`) — the real door, lease-backed. Reachable
      only from a session created with `.github` attached; mid-session
      `add_repo` refuses it.
   2. `claim-relay.yml` in `bounded-systems/.github-private`
      (workflow_dispatch: `issue`, `claimant`) — for `.github-private` issues
      when door 1 is unreachable. Bot-authored, run-backed record; it does
      **not** authenticate the claimant (`#530`).
   3. Hand-claim (assign + comment) — **last resort only**, when no door is
      reachable. It provides **no exclusion** (keycard#7, `signerSelfAsserted`)
      — a marker, not a claim; say plainly the window was down.

   Whichever door: confirm the claim comment ON THE ISSUE names your claimant.
   Any assignee or `claimed` label → someone else's; do not start. No issue →
   open one and claim it.
3. **Degraded mode**: no "bounded-systems — Claude context" block in your
   session context means the org context did not load. You may claim and work
   THIS repo only — no org-level `[settings]`/`[org]` changes, no cross-repo
   work.
<!-- bounded-systems-org:end -->

<!-- BEGIN BEADS INTEGRATION v:1 profile:minimal hash:ca08a54f -->
## Beads Issue Tracker

This project uses **bd (beads)** for issue tracking. Run `bd prime` to see full workflow context and commands.

### Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work
bd close <id>         # Complete work
```

### Rules

- Use `bd` for ALL task tracking — do NOT use TodoWrite, TaskCreate, or markdown TODO lists
- Run `bd prime` for detailed command reference and session close protocol
- Use `bd remember` for persistent knowledge — do NOT use MEMORY.md files

## Session Completion

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd dolt push
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds
<!-- END BEADS INTEGRATION -->
