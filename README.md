# fold-engine: Basis and Fold OS

**Basis** is the product: a cognitive assistive engine that shows large
structured data a few items at a time. **fold-engine** is the engine behind it,
and this repository. Today it compiles an Obsidian vault into typed records and
JSON-LD (the Unfold compiler: `deno task build`, `deno task validate`); this
README describes where it is going. The launch proposal is in
[docs/basis-proposal.md](docs/basis-proposal.md).

Fold OS is a local-first place where every conversation and every piece of
knowledge is a **fold**: a bounded, schema-checked window onto an append-only
log, shown as a chat-style surface and projected one way to Markdown. Think of a
local LibreChat in which nothing is free text: every message, tag, comment and
file is a typed slot, every change is a logged event, and every view can be
walked back to the whole record.

> **Status (2026-10-26).** The original plan (July 2025) was never built. Since
> then most of its parts exist elsewhere in the stack, so this revision
> assembles them instead of starting from scratch. Each section says what
> already exists and what is still missing.

## Flow

**contract → log → fold → projection → surface.** Writes go one way only: the
surface sends an operation, the proxy validates it and appends an event, and
folds and their Markdown are rebuilt from the log. Markdown is an output,
regenerated on start and after every change. You may edit it directly as a
buffer: an agent turns the edit into proposed slot operations, you review them,
and only the proxy applies them to the log. If any view disagrees with the log,
the log wins.

## Terms

- **Fold:** a bounded view over a graph, after Borel sets: always partly open,
  showing a few slots and leading to the rest. A conversation is a fold, and so
  is a note. Folding and unfolding change the view, never the data.
- **Slot:** an atomic, typed unit inside a fold (message, comment, tag, file
  reference, link, proof), with an id, author, time, order and parent.
- **Log:** the append-only, signed record of slot events. It is the source of
  truth.
- **Projection:** a deterministic, idempotent render from the log: the same
  slots always give the same Markdown and the same page.
- **Surface:** the local UI (thread view, slot inspector, metadata on the side)
  that reads projections and sends operations. It never writes storage.
- **Proxy:** the one writer, and the only route to model inference. It
  validates, redacts, logs and optionally forwards.

## What exists now, and how it maps

| Fold OS part                         | Built on (exists today)                                                                                                                                                                                                                                                      | Gap                                                                                                                   |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Log of slots                         | **toolpath**: Step / Path / Graph, append-only `.path.jsonl`, a parent DAG where abandoned branches stay on record, actors (`human:` / `agent:` / `tool:`), JSON Schema                                                                                                      | toolpath's `p validate` doesn't yet check ids, head or DAG rules; a conformance suite is planned. Slots map to steps. |
| Conversations as folds               | toolpath imports sessions from 7 agent harnesses into one format                                                                                                                                                                                                             | the "Claude dead ends" bug: imported heads are chained wrong                                                          |
| Projection contract (tested as JSON) | **this repo**: Unfold extracts a site manifest from the built HTML (`src/unfold/site/manifest.ts`: titles, links, JSON-LD, forbidden markers such as `lume-live-reload` and `<lume-bar>`) and validates it with Ajv against `src/unfold/contracts/site.manifest.schema.json` | add the fold invariants (traversal, no derived values) to the manifest and its schema                                 |
| Markdown projection                  | `toolpath-md` (`path p render md`)                                                                                                                                                                                                                                           | no frontmatter or `[[link]]` profile yet                                                                              |
| Surface                              | **clax**: local pages with comment threads, served on the tailnet, synced to clax.dev                                                                                                                                                                                        | thread sync is incomplete (empathic/clax#19); chat-style thread view                                                  |
| Accessible surface                   | **Allie**: the accessibility tree as the interface; `allie ls/cat/find`, live `tee/do/rotor`                                                                                                                                                                                 | the `cli:` tree is in progress                                                                                        |
| Signed authorship                    | **chitin**: signed messages, passkey approvals, a flow log                                                                                                                                                                                                                   | —                                                                                                                     |
| Knowledge graph                      | **this repo** (vault → JSON-LD, schema.org, Cool URIs; canonicalization and content addressing planned) and **facto** (`pkg` graph)                                                                                                                                          | the vault is the source of truth today (see below)                                                                    |
| Proxy and inference                  | **llm-proxy** (records every call)                                                                                                                                                                                                                                           | contract (zod) layer on the proxy                                                                                     |
| Budgets                              | **lone** `cognitive_budget.ts` (W3C COGA), Allie `load.ts`, conformance-kit `COGA.md`                                                                                                                                                                                        | one cited budget table                                                                                                |
| Microcopy                            | **brand** `content/strings.json`                                                                                                                                                                                                                                             | bounded-systems/brand#66 open                                                                                         |

## Fold and unfold

A Basis fold is **not** a fold in the functional-programming sense. There, a
fold (a catamorphism) consumes a structure into a summary, which is exactly what
a Basis fold must never do. A Basis fold is closer to a **zipper** (Huet 1997):
a focus on a few items, carrying the path back to the rest of the structure, so
nothing is lost and you can move anywhere.

Unfold therefore comes in two kinds, and they must not be confused:

1. **Structural unfold (traversal).** It widens or moves the window over data
   that already exists: the next 4 items, a child, a parent, a linked fold. It
   reveals; it never creates. It's a view operation, so it emits no log event.
   Termination is the budget: each step shows about 4 items, and the trail
   offers the next step (a lazy, coinductive slice), so even very large or
   open-ended data unfolds one bounded step at a time.
2. **Generative unfold (an anamorphism).** It produces elements from a seed and
   a rule, `u: seed → [e0, e1, …]` with a stop predicate `p` (for example, even
   numbers up to N: seed 0, `u(x) = x + 2`, stop when `x > N`). Use it only when
   a set is _defined_ by a rule rather than stored. Its output is **derived**:
   the slots are marked as generated, record the generator, seed and stop
   predicate, and are authored by whoever ran it. They are logged like any other
   write and never replace stored data. Unbounded generators are only shown
   through structural unfold, one budgeted slice at a time.

The test for any operation: does it reveal stored values, or produce new ones?
Revealing is unfold (1). Producing is unfold (2), and must be labelled.

(Naming note: this repo's compiler is called **Unfold**. In these terms it is a
projection: it renders the vault into typed records and pages. It is neither
kind of unfold above.)

## Rendering a fold

```
Set Declaration ──▶ Schema Validation ──▶ Projection Engine ──▶ Fold Identity Hash
  (the query)          (zod / JSON Schema)    (which paths)          (declaration + projection state)
       │                                           │
       ▼                                           ▼
 Trail Resolver ──────────────────────▶ Field Budget Filter ◀── Cognitive Cost Model
 (every path → its place in the log)     (select and order;       (shape → load; cited budgets)
                                          never drop reachability)
                                                   │
                                                   ▼
                                            Fold Renderer
                                 Markdown (Obsidian-compatible) · YAML (state sync) · page (clax / Allie)
```

- **Set Declaration:** the query, from a person, an agent command or a link. It
  names a set of paths, like a GraphQL selection.
- **Schema Validation:** the declaration and the data it selects both validate,
  or the fold doesn't open.
- **Projection Engine:** computes the paths in view. It reads; it never computes
  new values.
- **Trail Resolver:** gives every shown item its route back into the full record
  (links, continuations, `[[fold#slot]]`), which is what keeps traversal
  complete.
- **Cognitive Cost Model:** load from the data's shape: keys, depth, branching.
  Limits come from the cited budget table: chunk limits per Cowan 2001; grouping
  by proximity and similarity per the Gestalt principles (Wertheimer 1923),
  marked as a design heuristic.
- **Field Budget Filter:** selects and orders fields to fit the budget, about 4
  visible at a time. It may group items, but each group stays enterable and
  lists its members by path. It never replaces them with a count or a summary.
- **Fold Identity Hash:** a content address of the declaration plus the
  projection state. The same inputs give the same fold, which is what makes
  caching, sync and diffs possible.
- **Fold Renderer:** deterministic output: Markdown, YAML, or a page. Outputs
  are views. An edited Markdown buffer enters only through the edit translator
  below.

**On the two optional layers proposed for this flow:**

- **Editing the Markdown buffer (supported):** you can edit a projected file
  directly. An **edit translator** (an agent) diffs the buffer against its
  projection and turns the change into structured slot operations: add, change,
  remove, reorder, link. It shows them to you with anything it couldn't map
  (ambiguous text, a broken link, a field the schema doesn't allow). Nothing is
  applied until you approve. The approved operations go through the proxy and
  the log like any other write, with you as the author and the agent recorded as
  the translator. The file is then regenerated from the log. If the regenerated
  file differs from your edit, the diff is shown, so a mistranslation is visible
  rather than silent.
- **Agent hookpoint (enrichment):** an agent may _add_ slots, authored as
  `agent:`, and validated and logged. It may never _substitute_ or fill in data
  in place: missing data stays visibly missing.

## One world, every device

Fold OS is a single world model (the log and its graph) that its person lives in
across devices. Each device is a **projection** of the same world, sized to what
that channel can carry. No device has its own copy of the truth, and moving
between devices continues where you were.

| Surface                      | What a fold is there                                 | Budget (start tight, then iterate with ratings)                                     | Input                               |
| ---------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------- | ----------------------------------- |
| **Apple Watch**              | one item and its next action; a haptic to arrive     | 1–2 items                                                                           | tap, Digital Crown, dictation       |
| **iPhone**                   | a fold of the few things that matter now             | ≤4 items visible (Cowan), ≤5 main choices (COGA 4.6.3)                              | touch, VoiceOver, passkey           |
| **iPad**                     | the working fold, with room for one level of context | ≤5 main choices; each item enterable                                                | touch, keyboard, VoiceOver, passkey |
| **Mac**                      | the full surface (clax, Allie)                       | ≤5 main choices on the first screen; everything reachable                           | keyboard, Allie, VoiceOver          |
| **TRMNL (e-ink)**            | one ambient glance: needs you, what's moving         | ≤5 items, large type, black and white; redrawn on events                            | none (read-only)                    |
| **Audio** (AirPods, speaker) | a spoken fold, heard in order                        | 1–3 items per utterance: speech is serial and fades, so it holds less than a screen | voice, a tap to hear more           |

### Rules across devices

- **One focus, synced.** The fold's focus (where you are in the zipper) is view
  state, kept apart from the log and synced across devices, so picking up the
  iPad continues where the phone left off. Moving focus never writes data.
- **One attention budget.** Every notification, glance and spoken item is a
  request on the person and spends from the same budget as the Human Batch API
  (human units, attention seconds, ~4 open items at once). A device doesn't get
  its own allowance.
- **Escalate gently, by need.** Ambient first (TRMNL, a quiet badge), then a
  passive notification, then active, then time-sensitive. These map to iOS
  notification interruption levels (passive, active, time-sensitive; critical is
  never used). Presence, Focus modes and night mode hold everything except what
  you've marked urgent.
- **Audio has its own grammar.** It leads with what needs you and says one thing
  at a time. It names the item's real value, never a count or a summary. A short
  earcon (a distinct sound per kind of event) says what arrived before any
  words, and you ask for more rather than hearing everything. AirPods can
  announce notifications; the Watch relays the iPhone's with a haptic.
- **Same accessibility everywhere.** VoiceOver on iPhone, iPad, Watch and Mac
  reads the same fold structure as Allie; the AX tree is the interface on every
  screen.
- **Signed where it acts.** Approving and answering need a passkey on the device
  in hand. Glances and audio never act on your behalf.
- **Events through chitin.** Every device's view updates from chitin events and
  publishes what it showed, so the flow log records what reached you, where and
  when.

### Time and the body

The person is the thing being designed for, body included. Load isn't only how
much is on the screen; it also depends on what the person has seen before, how
long they've been at it, and how often things change. Allie already models this
(what was seen, and when); Fold OS takes the same temporal model.

- **Seen before costs less.** Items already seen, or similar to ones seen, are
  cheaper to take in (familiarity, processing fluency, expertise chunking). The
  cost model discounts them, and the fold marks what's new since you last
  looked, so new things stand out and old ones recede. It never hides old items;
  it only lowers their weight.
- **Unfamiliar ground costs more.** A new kind of item, an unfamiliar layout, or
  a context you rarely visit raises effort and stress. Keep layouts stable,
  introduce new kinds one at a time, and spend more of the budget on them.
- **Repetition and duration tire.** The same alert again, or a long unbroken
  session, wears attention down (vigilance decrement, alarm fatigue). Repeated
  notices fold into the first one with a time stamp per occurrence (each still
  enterable, never a bare count). The budget per window shrinks as a session
  gets longer, and long stretches suggest a break.
- **Change has a cost.** Every refresh, redraw or moving item pulls attention,
  and a change that happens out of sight may be missed. Each surface gets a
  change budget: a minimum interval between updates of the same view, changes
  batched into versions, nothing animated, and "what changed" shown by reference
  when you return. The fleet page republishing every few minutes counts against
  this.
- **Calm by default.** Information starts in the periphery (TRMNL, a badge) and
  moves to the centre of attention only when it needs to (calm technology).
- **Measured, then tuned.** The model starts from the literature and is tuned on
  the person: their effort ratings, how long they take, what they skip, and when
  they stop. Those signals are observations, never a judgement of the person.

These sources are to be verified and added to facto with the others before they
ground any number. Candidates: processing fluency (Reber, Schwarz & Winkielman
2004), mere exposure (Zajonc 1968), vigilance decrement (Mackworth 1948), alarm
fatigue (Sendelbach & Funk 2013), change blindness (Simons & Levin 1997),
attention capture by abrupt onsets (Yantis & Jonides 1984), allostatic load
(McEwen 1998), calm technology (Weiser & Brown 1996). The arousal–performance
curve (Yerkes–Dodson) is contested and is used only as a direction, if at all.

### What exists for it

Web Push to installed pages works on iPhone and iPad (iOS/iPadOS 16.4+), the
approve page already installs, the Watch mirrors iPhone notifications, the TRMNL
backend is being built, and chitin's presence and night mode are live. Not yet
built: focus sync, the shared attention budget, the audio grammar and earcons,
and native Watch or iOS apps (to be decided, after the web versions prove the
shape).

## Principles

1. **A fold is a window, never a digest.** It selects; it never summarizes,
   rolls up, paraphrases or rewrites. A shown value is byte-equal to the value
   at its path. No counts stand in for items: every item can be entered.
2. **Full traversal.** Every slot has a stable address (`/<fold>#<slot>`). From
   any fold you can reach every node of the record.
3. **Load is predicted from shape.** The keys, depth, branching and item counts
   of a fold's data predict how heavy it will be to read. A fold shows about 4
   slots at a time (Cowan 2001), with the rest one step away.
4. **Cited, honestly labelled budgets.** Each limit names its source (Cowan
   2001, Sweller 1988, Hick 1952 and Hyman 1953, WCAG 2.2, W3C COGA), or says
   "heuristic, no source". Every check states its evidence type: a static proxy,
   not participant testing.
5. **Contracts on every edge.** Shapes are written in zod and projected to JSON
   Schema, so any language can hold to them. A fold validates when it is opened,
   written and projected.
6. **One writer.** The surface sends operations, and only the proxy appends to
   the log. Inference output becomes a slot only after validation, and is logged
   like any edit.
7. **Inspectable and portable.** The log is local, diffable, exportable and
   content-addressed.
8. **Accessible by construction.** VoiceOver first; pages pass lone and Allie's
   `ax-check`.
9. **Local-first.** No cloud by default. Sync (clax.dev, pathbase) is opt-in per
   fold.

## Invariants (each one a test)

- **Replay:** replaying the log rebuilds every fold and its Markdown byte for
  byte (idempotent projection).
- **Traversal:** from the root, every slot in the log is reachable by following
  rendered links.
- **No derived values:** every rendered value equals the value at its path.
- **Fold/unfold never emits an event;** every slot change emits exactly one.
- **No side doors:** an edited `.md` reaches the log only as reviewed slot
  operations through the proxy. Approved edits round-trip: regenerating the file
  reproduces the edit, or the difference is reported.
- **The proxy rejects** malformed folds, malformed slots and unvalidated
  inference results.

## Page types (schema.org)

The page is the projection; the entity is the thing. A page's type says what
kind of view it is, and `mainEntity` says what it is about.

| Page                                                                  | Type             | `mainEntity`                                                                                           |
| --------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------ |
| One node with identity: a concept, a slot, a tool, a claim, a dataset | `ItemPage`       | the node itself: `DefinedTerm`, `CreativeWork`, `Dataset`, `SoftwareSourceCode`, `ScholarlyArticle`, … |
| A fold: a view over several nodes, an index, a hub, search results    | `CollectionPage` | none; its items are linked by `hasPart` / `ItemList`, each to its own `ItemPage`                       |
| How the system works (this README, design docs)                       | `AboutPage`      | the project                                                                                            |

Schema.org's `ItemPage` example ("a particular product or hotel") is an
illustration, not a limit: it is `Thing → CreativeWork → WebPage → ItemPage`,
defined only by being about one primary entity. Using it tells graph readers
that this URL is one node in a knowledge graph, which is the point of every
atomic page here. (Tracked in fold-engine as "Define WebPage subtypes for vault
roles".)

## Identity: URIs for things, CIDs for versions

- **An entity keeps a stable HTTP URI** (Cool URIs: `https://…/notes/<id>`).
  That is what a concept, a slot or a fold _is_.
- **Each version of its bytes gets a CIDv1** (multibase + multicodec +
  multihash, SHA-256). That is what a particular snapshot _is_. A CID is never
  used as the entity's `@id`, or every edit would mint a new thing.
- **Canonicalize before hashing:** JSON-LD is canonicalized with RDF Dataset
  Canonicalization (RDFC-1.0, W3C 2024, formerly URDNA2015), or encoded as
  DAG-JSON/DAG-CBOR, which fix key order. Otherwise two equal documents hash
  differently.
- **Link versions** with `prov:wasDerivedFrom` (previous version → next) and
  `prov:generatedAtTime`. Record the hash with `schema:sha256` or
  `spdx:checksum`. PROV-O has no `contentHash` property.
- **The fold identity hash is a CID** over the set declaration plus the
  projection state (see "Rendering a fold"). A rendered Markdown or page is a
  derived artifact with its own CID, linked to the CIDs of the slots it shows:
  determinism you can check.
- **A whole publish is one root CID:** a Merkle DAG (or a CAR file) over every
  object, so two publishes differ provably and agents can pin a snapshot.
- **A CID names bytes; it doesn't keep them.** Availability still needs a pin (a
  local node, a CAR in the repo, or a pinning service).

## Source of truth: vault today, log next

Unfold treats the Obsidian vault as the single source of truth. Fold OS makes
the **log** the source and the vault a projection of it. The migration keeps the
vault usable: an edit to a vault note becomes reviewed slot operations (the edit
translator above), and the note is regenerated from the log. Until that lands,
the vault stays authoritative and Unfold's validation is the contract.

## Stack

This repo is TypeScript on Deno (`deno task ci`). Contracts in zod, projected to
JSON Schema. Rust where toolpath's crates are reused (log, projection). No
Python. The existing Docker files are optional local packaging; nothing requires
them.

## Roadmap

1. **Contracts:** `fold`, `slot`, `event`, `view` and `proxy` in zod, mapped
   onto toolpath's Step / Path. Decide what toolpath already covers and what a
   "fold" kind adds (a new toolpath kind URI, like `agent-coding-session`).
2. **Log:** use `.path.jsonl` as the slot log, and land toolpath's planned
   conformance checks (ids, head, DAG, timestamps) so the log is trustworthy.
3. **Projection:** a `toolpath-md` profile with frontmatter, `[[fold]]` /
   `[[fold#slot]]` links and attachment references, plus the replay and
   idempotence tests.
4. **Proxy:** the single writer in front of llm-proxy and the log, validate →
   log → forward.
5. **Surface:** a clax page per fold with a chat-style thread view and a slot
   inspector, browsable through Allie. Fold/unfold within the budget; traversal
   and `ax-check` pass on iPad and phone.
6. **Budgets:** one table with sources, used by lone, `load.ts` and the surface.
7. **First folds:** the fleet page and toolpath sessions.
