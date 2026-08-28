# Zod Schemas

Type-safe schema definitions for JSON-LD objects.

## Why Zod?

**Zod → JSON Schema** workflow instead of maintaining separate JSON Schemas:

1. **Type-safe** - TypeScript types inferred from schemas
2. **Runtime validation** - Zod provides excellent error messages
3. **Single source of truth** - Define once, use everywhere
4. **Can generate JSON Schema** - For external tools/documentation

## Architecture

```
Zod Schema (TypeScript)
  ↓ (z.infer)
TypeScript Type
  ↓ (runtime)
Validation + Error Messages
  ↓ (optional)
JSON Schema (for external tools)
```

## Schemas

## DataTypes

Schema.org-inspired datatypes are centralized in `datatypes.ts` and reused across
schemas (Boolean, Date, DateTime, Number/Float/Integer, Text, URL, Time, etc.).

### Page

```typescript
import { type Page, PageSchema } from "./page.ts";

const page: Page = {
  "@type": "basis:Page",
  "@id": "https://example.org/pages/test",
  "title": "Test Page",
};

PageSchema.parse(page); // validates at runtime
```

### Reference

```typescript
import { type Reference, ReferenceSchema } from "./reference.ts";

const ref: Reference = {
  "@type": "basis:Reference",
  "@id": "https://example.org/refs/test",
  "title": "Test Reference",
  "url": "https://example.com",
};
```

### Concept

```typescript
import { type Concept, ConceptSchema } from "./concept.ts";

const concept: Concept = {
  "@id": "https://example.org/vocab/basis#Test",
  "@type": "skos:Concept",
  "label": "Test",
};
```

### WebPage

```typescript
import { type WebPage, WebPageSchema } from "./webpage.ts";

const page: WebPage = {
  "@type": "schema:WebPage",
  "@id": "https://example.org/pages/hello",
  "title": "Hello World",
  "description": "A schema.org WebPage profile",
};
```

### WebSite

```typescript
import { type WebSite, WebSiteSchema } from "./website.ts";

const site: WebSite = {
  "@type": "schema:WebSite",
  "@id": "https://example.org",
  "name": "Example Site",
};
```

### WebPageElement

```typescript
import { type WebPageElement, WebPageElementSchema } from "./webpage_element.ts";

const section: WebPageElement = {
  "@type": "schema:WebPageElement",
  "@id": "https://example.org/pages/hello#intro",
  "title": "Introduction",
  "isPartOf": { "@id": "https://example.org/pages/hello" },
};
```

### CreativeWork

```typescript
import { type CreativeWork, CreativeWorkSchema } from "./creative_work.ts";

const work: CreativeWork = {
  "@type": "schema:CreativeWork",
  "@id": "https://example.org/refs/spec",
  "name": "Example Spec",
  "url": "https://example.org/spec",
};
```

### DefinedTerm

```typescript
import { type DefinedTerm, DefinedTermSchema } from "./defined_term.ts";

const term: DefinedTerm = {
  "@type": "schema:DefinedTerm",
  "@id": "https://bounded.tools/ns/basis#Fold",
  "name": "Fold",
};
```

### DefinedTermSet

```typescript
import { type DefinedTermSet, DefinedTermSetSchema } from "./defined_term_set.ts";

const termSet: DefinedTermSet = {
  "@type": "schema:DefinedTermSet",
  "@id": "https://bounded.tools/ns/basis",
  "name": "Basis Vocabulary",
};
```

### Person

```typescript
import { type Person, PersonSchema } from "./person.ts";

const person: Person = {
  "@type": "schema:Person",
  "@id": "https://example.org/people/alex",
  "name": "Alex Example",
};
```

## Schema Registry

Get schema by @type:

```typescript
import { getSchemaForType } from "./mod.ts";

const schema = getSchemaForType("basis:Page");
const result = schema?.parse(node);
```

## Generating JSON Schema

Future: Use `zod-to-json-schema` or similar to generate JSON Schema for:

- External documentation
- API contracts
- Non-TypeScript tools

## Validation

See `validator_zod.ts` for usage with vault nodes.

All 9 validation tests passing.
