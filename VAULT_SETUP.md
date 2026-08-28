# Vault Setup

The `vault/` directory contains JSON-LD objects that serve as the source of
truth for the knowledge graph. This directory is **not tracked in git** - it's
external content that varies per deployment.

## Structure

```
vault/
├── @context/
│   ├── default.jsonld    # Shared JSON-LD context
│   └── basis.jsonld      # Basis vocabulary context
├── catalog.jsonld        # DCAT catalog (entrypoint)
├── pages/
│   ├── hello.jsonld
│   └── cognitive-folding.jsonld
├── refs/
│   └── json-ld-spec.jsonld
└── vocab/
    └── basis.jsonld
```

## Setup Methods

### Option 1: Use Example Vault (for testing)

The test files demonstrate the expected structure. To create a minimal vault for
local development:

```bash
mkdir -p vault/{@context,pages,refs,vocab}

# Copy from test examples or create minimal files
# See src/unfold/inputs/jsonld/loader_test.ts for examples
```

### Option 2: Use Git Repository (recommended for production)

Point to an external git repository:

```bash
# Clone your vault repository
git clone https://github.com/yourusername/your-vault vault/

# Or set VAULT_PATH environment variable
export VAULT_PATH=/path/to/your/vault
```

### Option 3: Use Docker Volume (for containerized setups)

The docker-compose.yml already configures a vault service that clones from
`VAULT_REPO`. Set in your `.env`:

```
VAULT_REPO=https://github.com/yourusername/your-vault
VAULT_BRANCH=main
```

## Content Requirements

### Every JSON-LD file must have:

1. **@id** - Unique IRI for the node
2. **@type** - RDF type (e.g., `basis:Page`, `basis:Reference`)
3. **@context** - Either inline or reference to shared context

### Example Page:

```jsonld
{
  "@context": "../@context/default.jsonld",
  "@type": "basis:Page",
  "@id": "https://example.org/pages/example",
  "title": "Example Page",
  "description": "A minimal example",
  "dateCreated": "2026-01-25"
}
```

### Example Reference:

```jsonld
{
  "@context": "../@context/default.jsonld",
  "@type": "basis:Reference",
  "@id": "https://example.org/refs/example",
  "title": "Example Reference",
  "url": "https://example.com/resource",
  "author": "Author Name"
}
```

### Example Vocabulary:

```jsonld
{
  "@context": "../@context/basis.jsonld",
  "@graph": [
    {
      "@id": "https://bounded.tools/ns/basis#Concept",
      "@type": ["rdfs:Class", "skos:Concept"],
      "label": "Concept",
      "definition": "A conceptual entity"
    }
  ]
}
```

## Validation

The loader validates:

- JSON structure
- JSON Schema compliance (using x-jsonld-* annotations)
- @id presence and uniqueness
- @type matching to schemas

Run validation:

```bash
deno task validate
# or
docker compose run --rm unfold deno task validate
```

## Authoritative Reading

### Schema.org vocabulary

- Main site: https://schema.org
- WebSite: https://schema.org/WebSite
- WebPage: https://schema.org/WebPage
- Full property reference: https://schema.org/docs/full.html

### JSON-LD

- Spec hub: https://json-ld.org
- Primer: https://www.w3.org/TR/json-ld11-primer/
- Full spec: https://www.w3.org/TR/json-ld11/
- Context processing: https://www.w3.org/TR/json-ld11/#the-context

### RDF fundamentals

- Concepts: https://www.w3.org/TR/rdf11-concepts/
- Primer: https://www.w3.org/TR/rdf11-primer/

### SHACL

- Recommendation: https://www.w3.org/TR/shacl/
- Examples: https://www.w3.org/TR/shacl/#examples
- SHACL-AF: https://www.w3.org/TR/shacl-af/

### ShEx

- Homepage: https://shex.io
- Primer: https://shex.io/shex-primer/
- Spec: https://shex.io/shex-semantics/

### Structured data for websites

- Google structured data: https://developers.google.com/search/docs/appearance/structured-data
- Site names: https://developers.google.com/search/docs/appearance/site-names

### Accessibility and semantic HTML

- MDN semantic HTML: https://developer.mozilla.org/en-US/docs/Glossary/Semantics#semantics_in_html
- ARIA landmarks: https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/landmark_role
- WCAG 2.2: https://www.w3.org/TR/WCAG22/

## Why vault/ is not in git

The vault contains your actual knowledge graph content, which:

- May be large
- Changes frequently
- Might be private
- Could be shared across multiple projects
- Should be versioned separately from the compiler code

This separation follows the "data vs code" principle - the fold-engine
repository contains the compiler, your vault repository contains the data.
