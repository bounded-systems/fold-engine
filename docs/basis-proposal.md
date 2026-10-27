# Basis: launch proposal

Written as folds: each section is a short view, and its trail leads on.

---

## Fold: Introduction {#intro}

Basis is a cognitive assistive engine. It shows large structured data (a
knowledge vault, journals and routines, an API, an agent's session) through
**folds**: short, schema-checked views of a few items at a time. Every item in a
fold opens onto the rest of the record. A fold selects; it never summarizes away
what is underneath.

Basis is built first for people who read with a screen reader or live with
cognitive and learning disabilities. Interfaces that are calm for them are
calmer for everyone.

**Trail:** [Problem](#problem) · [How it works](#concepts) · [Example](#example)

---

## Fold: Problem {#problem}

Structured information arrives faster and denser than anyone can hold. Most
interfaces answer with more on screen, or with a summary that hides what was
left out. For screen-reader users, a dense page is a long, linear listen. For
people with attention or memory differences, it's a wall.

Basis shows **just enough at a time and never hides the rest**: a small view you
can trust, with every item one step from its source.

**Trail:** [Why small views work](#constraints) · [How it works](#concepts)

---

## Fold: Why small views work {#constraints}

These are design heuristics for the budget, not a measurement of anyone's
cognition. Each check in Basis is labelled as a proxy, not as participant
testing.

- **Working memory holds about 4 chunks** (Cowan 2001; Cowan 2010). Miller's 7 ±
  2 (1956) is the older, looser estimate.
- **Experts chunk:** familiar structure packs into larger units (Simon 1974,
  "How big is a chunk?", _Science_).
- **Grouping:** people group by proximity, similarity and continuity (Wertheimer
  1923, Gestalt principles).
- **Choices cost time:** decision time grows with the number of options (Hick
  1952; Hyman 1953).
- **Avoidable complexity:** W3C's _Making Content Usable for People with
  Cognitive and Learning Disabilities_ (COGA) and WCAG 2.2.

A fold therefore shows about 4 items, grouped by meaning, each one enterable.

**Trail:** [How it works](#concepts) · [Example](#example)

---

## Fold: How it works {#concepts}

- **Fold:** a bounded view over a graph, the way a basis of open sets covers a
  space (the topology is a design metaphor, not a formal measure). Folding and
  unfolding change the view, never the data.
- **Slot:** one typed item: a message, an entry, a tag, a link, a file. It has
  an author and a time, and changes only through a logged event.
- **Slice:** the 3–5 slots a fold shows now.
- **Trail:** the links from a slice to everything around it, so nothing is out
  of reach.
- **Log:** the append-only record of every change. It is the source of truth;
  folds and Markdown are rebuilt from it.

**Promises:** a fold never summarizes or rewrites; every item can be opened; the
log is the truth.

**Trail:** [Interaction](#interaction) · [Foundations](#foundations)

---

## Fold: Interaction {#interaction}

You work by **prompt** or by **editing**.

```
basis> show journal entries tagged #morning_walk
basis> narrow to last week
```

You can also edit a fold's Markdown directly. An agent turns your edit into
proposed slot changes and shows them to you, including anything it couldn't map.
Nothing reaches the log until you approve, and the fold is then regenerated, so
a mistranslation shows up as a visible difference.

Agents can **derive** (a correlation, a weekly review), but a derived result is
a new slot marked as the agent's, linked to the entries it came from. It never
replaces them.

**Trail:** [Foundations](#foundations) · [Example](#example)

---

## Fold: Foundations {#foundations}

Basis assembles parts that already run:

- **Log:** toolpath documents (steps with authors, a history that keeps
  abandoned branches, JSON Schema).
- **Engine:** fold-engine (vault → typed records and JSON-LD, schema.org, stable
  URIs).
- **Surface:** clax pages (local, with comment threads) and Allie (the
  accessibility tree as the interface, VoiceOver first).
- **Signed authorship and approvals:** chitin (passkeys).
- **Budgets:** lone's COGA-derived complexity budget and Allie's load check.
- **Contracts:** zod, projected to JSON Schema; `$ref` links resolved by the
  trail, not inlined.
- **Models:** reached only through a proxy that validates and records every call
  (Model Context Protocol tools).

**Trail:** [Example](#example) · [Risks](#risks)

---

## Fold: Example: journal and routines {#example}

1. Open today's fold: four morning-routine items, each linked to its history.
2. Open yesterday's journal fold: the entries themselves, four at a time, not a
   summary of them.
3. Ask: `basis> how did sleep relate to mood this month?` The agent adds a
   derived slot (its finding, marked as the agent's) linked to every entry it
   used. You can walk from the finding to each entry.

**Trail:** [Risks](#risks) · [Next steps](#next)

---

## Fold: Risks and related work {#risks}

**Risks:**

- **Schema friction:** structured input must stay quick to write.
- **Edit translation:** free-form edits mapped to structure need your review.
- **Usability claims:** the budgets are proxies; they need testing with
  screen-reader users and people with cognitive disabilities.

**Related work:** Microsoft TypeChat (typed model output), the Model Context
Protocol (tool contracts), Obsidian and Logseq (local Markdown knowledge bases).

**Trail:** [Team](#team) · [Next steps](#next)

---

## Fold: Team {#team}

_To be written by Bobby._ (The earlier draft named people who aren't connected
to this project; they were removed.)

**Trail:** [Next steps](#next)

---

## Fold: Next steps {#next}

1. Contracts: fold, slot, event and view, mapped onto toolpath.
2. A trustworthy log: toolpath's planned conformance checks land.
3. Projection: Markdown with frontmatter and `[[fold#slot]]` links; replay
   rebuilds it byte for byte.
4. The first folds: the fleet page and agent sessions, then the vault.
5. Testing with screen-reader users before any usability claim.

**Trail:** [Introduction](#intro)
