# Validation Mental Model

This document defines the strict validation mental model for Unfold and the
surrounding bounded-systems repos: what the objects are, what each validator
actually enforces, and what "deterministic strict validate" means. It follows
Schemarama CORE's parse → validate model and closes beads issue
`bdelanghe-jo2` ("Define strict validation mental model").

Every claim below is grounded in an artifact that exists today. Paths without
a repo prefix are paths in this repo; `conformance-kit/...` and
`front-desk-scheduler/...` are sibling repos in the org.

## The objects

- **Data graph** — the vault's JSON-LD nodes interpreted as RDF: `WebSite`,
  `WebPage` (pages), `WebPageElement` (sections), `CreativeWork` (refs),
  `DefinedTerm` (basis vocab terms), connected by `schema:hasPart` /
  `schema:isPartOf` / `schema:citation` / `schema:about` / `schema:mentions`.
  The graph edges are the tree made explicit.
- **Shapes graph** — the rules, themselves data: the runtime shapes document
  `src/unfold/shacl/shapes.json` (parsed by Zod in
  `src/unfold/shacl/schema.ts`), its declarative SHACL twin
  `src/unfold/shacl/aboutpage.ttl` (`sh:closed true`), and the ShEx schema
  `src/unfold/shex/aboutpage.shexj.json`.
- **Focus node** — the node currently being validated by a shape.
- **Targeting** — ShEx validates explicit (node, shape) pairs from a start
  shape (`validateNodesWithShex` in `src/unfold/shex/validator.ts` selects
  nodes by the start shape's type constraint); SHACL validates whatever the
  shapes graph targets (`targetClass` in `shapes.json`, `sh:targetClass` in
  `aboutpage.ttl`).
- **baseIRI / stable `@id`** — the base used to resolve relative IRIs is part
  of the contract: change it and node identities change, so validation
  outcomes change. Strict mode therefore requires every node to carry a
  stable, absolute `@id` (`validator_zod.ts` rejects nodes without `@id`; the
  Zod `WebPageSchema` pins `@id` to an absolute `https://.../pages/` IRI).

## The pipeline

Validation is layered, and each layer can only enforce what it can still see.
The order is the order of `runValidate` in `src/unfold/pipeline/validate.ts`.

### 1. JSON well-formedness

`loadVault` (`src/unfold/inputs/jsonld/loader.ts`) parses every `.jsonld`
file. A parse error fails the run before any schema is consulted. Parsing is
phase 0 of validation, not an implementation detail: if parsing produces the
wrong triples, every later validator will "correctly" complain about the
wrong graph.

### 2. Closed-world, per-document, at the boundary

Two checkers run over each document as a tree, before any RDF machinery:

- Ajv against the JSON Schemas in `src/unfold/schemas/*.schema.json`
  (strict mode only) — every node schema sets
  `"additionalProperties": false`.
- Zod against `src/unfold/schemas/zod/*` (always) — closed enumerations of
  types and properties, `.strict()` object schemas, datatype and pattern
  checks.

The closed beads issue `bdelanghe-77` ("Expand SHACL shapes to mirror Zod
schemas") records the org stance: the shape layer mirrors the Zod layer, not
the other way round. The boundary is authoritative for "no unknown keys".

**This is the only layer that sees unknown keys.** Everything downstream of
JSON-LD expansion cannot, which is the next point.

### 3. JSON-LD expansion is a transform with a contract

Expansion is not a neutral step. By the JSON-LD algorithm, a term with no
mapping in the `@context` is silently dropped during expansion — no triple is
produced, no error is raised. Consequences:

- A downstream closed-shape check (`sh:closed true`) over the expanded graph
  is **vacuous for unknown keys**: the key never became a triple, so the
  shape has nothing to reject. Layer 2 is the only check that fails on it.
- Therefore every tree → graph path needs a **written renderer contract**
  stating what the graph is guaranteed to contain, and the shapes are only
  meaningful relative to that contract.

The org already has the canonical statement of this trap: the renderer
requirements header in
`front-desk-scheduler/specs/shacl/front-desk-shapes.ttl`. Its
`sh:disjoint fd:self` check is vacuously true unless the renderer
materializes a reflexive `fd:self` edge, and its GitHub-number shape is a
failing-open conditional on `fd:origin` — omit the property and the check
silently passes everything. Same failure class: a constraint downstream of a
transform that can quietly remove the thing the constraint looks at.

`conformance-kit/gates/shacl-runner.mjs` sits on the same boundary — it
expands emitted JSON-LD to RDF (against a vendored, offline context; the gate
never fetches a context over the network) and validates the result, so what
its shapes can enforce is likewise bounded by what expansion preserved.

### 4. No ontology layer, by policy

The org mints **zero** `owl:Class` / `rdfs:domain` / `rdfs:range` axioms of
its own, and no validator runs a reasoner:

- schema.org subclass knowledge is flattened **into shapes** as data:
  `schemas/schema-org/releases/29.4/schemaorg-subclasses.shacl` is a plain
  list of `rdfs:subClassOf` triples shipped alongside the shapes, not an
  ontology loaded into an inference engine.
- `conformance-kit/gates/shacl-runner.mjs` validates with `shacl-engine`
  directly over the expanded dataset — no entailment regime.
- This repo's validators (`src/unfold/shacl/validator.ts`,
  `src/unfold/shex/validator.ts`) operate on asserted node properties only.

Validation is of **asserted triples, never entailed ones**. For boundary
checks this is the correct, deliberate stance: a boundary check must be
deterministic and must fail on what the producer actually wrote, not pass on
what a reasoner could infer the producer meant.

### 5. Shapes over the graph

The Schemarama pairing — parse into a store, then validate focus nodes
against shapes — appears twice in this repo, on purpose:

- **ShEx** — `src/unfold/shex/validator.ts`, a hand-rolled validator in
  per-node shape-map style: pick the start shape, select the nodes it
  applies to, validate each (node, shape) pair. Exercised in
  `src/unfold/shex/aboutpage_fixture_test.ts`.
- **SHACL** — `src/unfold/shacl/validator.ts` over `shapes.json`
  (targetClass selection, minCount/maxCount, datatype, pattern, in, class,
  closed) — wired into the pipeline in `pipeline/validate.ts`, with
  `aboutpage.ttl` as the declarative `sh:closed true` twin.

Both run over the same targets (`src/unfold/contracts/about.fixture.jsonld`
passes both fixture tests). Elsewhere in the org the graph layer is SHACL
proper: `conformance-kit` runs `shacl-engine` (with opt-in SHACL-SPARQL);
`front-desk-scheduler` validates its mirror with
`specs/shacl/front-desk-shapes.ttl`.

## What only the graph layer can check

Per-document validators cannot see relations **between** documents. Graph
checks exist precisely for constraints where two individually-valid documents
have an invalid union:

- In this repo: link integrity (every internal reference resolves,
  `validator_links.ts`) and reachability (no orphan nodes,
  `validator_reachability.ts`) are cross-document by nature.
- In front-desk-scheduler: S1, "at most one active lease per item"
  (mutual exclusion — proven in `specs/lean/Leases.lean` and
  `specs/tla/scheduler.tla`), is expressible in SHACL only as an
  inverse-path `sh:maxCount` over the union graph: each lease document can
  be valid alone while the union of two of them violates the invariant.

## What stays outside shapes

Shapes validate a snapshot of asserted triples. Three things deliberately
live elsewhere:

- **Time** — lease expiry and cleanup belong to supervisors/reapers
  (front-desk-scheduler's `scripts/reap-leases.ts`), not to a shape: a
  snapshot cannot enforce "eventually".
- **Monotonicity** — ordering/fencing guarantees belong to the storage
  engine's keys (fencing tokens in the lease protocol; content-addressed
  keys in `src/unfold/rdf/` here), because a validator that sees one state
  cannot compare it with the previous one.
- **Authorization** — who may write is the interpreter's job
  (front-desk-scheduler's lease worker auth), never a graph constraint:
  triples do not carry credentials.

## What "deterministic strict validate" means

Determinism is mostly about IDs, and strictness is a fixture discipline:

1. **Stable IRIs.** Every node has a stable absolute `@id`, and the base IRI
   is explicit in CI and local runs, so the same vault input always yields
   the same node identities and the same report. (This is also why the
   build is reproducible at all — see `src/unfold/rdf/README.md`.)
2. **Strict mode is a mode, not a suggestion.** `UNFOLD_VALIDATE_MODE=strict`
   (`pipeline/validate.ts`) additionally runs the closed-world JSON Schema
   layer, makes orphan reachability fatal instead of a warning, and emits
   the validation artifacts to `dist/unfold/validation/`.
3. **Fixture discipline.** A clean fixture must conform and a violations
   fixture must not, and CI asserts both. In this repo:
   `about.fixture.jsonld` must pass ShEx and SHACL
   (`aboutpage_fixture_test.ts`, `website_fixture_test.ts`) while
   `src/unfold/shacl/validator_test.ts` asserts that violating nodes are
   rejected. In conformance-kit: `fixtures/dataset.conforming.ttl` /
   `fixtures/dataset.violating.ttl`. In front-desk-scheduler:
   `specs/shacl/fixtures/clean.ttl` / `violations.ttl`.
4. **A written renderer contract for every tree → graph path** (layer 3
   above): the fixtures are what keep the contract honest, because a
   renderer that violates it makes shape checks vacuous rather than loud.

## Worked example

The executable end-to-end version of this model — mint a term, render to a
graph under a renderer contract, validate shapes over the union, with clean
and violating fixtures asserted — lives in
`front-desk-scheduler/specs/claim-e2e/` (referenced by path; it lands in a
parallel change).
