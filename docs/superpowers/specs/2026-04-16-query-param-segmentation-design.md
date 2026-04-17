# Query Parameter Segmentation

**Date:** 2026-04-16  
**Status:** Approved

## Summary

Add the ability to route visitors to a specific variant based on query parameters (e.g. UTM params). If no rule matches, the existing random assignment by `traffic_weight` applies. Override behavior when a visitor already has a cookie assignment is configurable per experiment.

## Data Model

### `variants` table — new column: `rules`

Type: `jsonb`, default `[]`

Each rule is an object with two fields:

```json
[
  { "param": "utm_source", "value": "facebook" },
  { "param": "utm_medium", "value": "email" }
]
```

**Matching logic:** OR — if any rule matches the incoming request's query params, the visitor is routed to that variant.

If two variants both have matching rules, the first one in the array wins.

Existing variants get `rules = []` — no behavior change.

### `experiments` table — new column: `override_assignment`

Type: `boolean`, default `false`

- `false` — if the visitor already has a cookie, the cookie wins. The rule is ignored.
- `true` — the matching rule wins even if the visitor already has a cookie. The cookie is overwritten with the new assignment.

This field is configurable from the dashboard per experiment.

## Worker Logic

Updated flow in `worker/src/index.ts`:

```
Request arrives with query params
  ↓
Find experiment matching base_url (existing)
  ↓
Check if any variant has a rule matching the query params (OR)
  → Match found:
      Does visitor have a cookie?
        → Yes + override_assignment=false → respect existing cookie
        → Yes + override_assignment=true  → reassign to matched variant
        → No → assign to matched variant
  → No match:
      Random assignment by traffic_weight (existing behavior)
```

New function `findRuleMatch(variants, searchParams)` returns the first variant whose rules include a match, or `null`.

## API

`app/server/api/worker/config.get.ts` — add `rules` to the variants select:

```ts
variants(id, name, traffic_weight, target_url, is_control, rules)
```

`worker/src/index.ts` — updated interfaces:

```ts
interface Rule {
  param: string
  value: string
}

interface Variant {
  id: string
  name: string
  traffic_weight: number
  target_url: string
  rules: Rule[]
}

interface Experiment {
  // ...existing fields...
  override_assignment: boolean
}
```

## UI

### Edit Experiment form

**Per variant** — collapsible "Targeting rules" section below the description field:

```
Targeting rules
+ Add rule
[ utm_source ] [ = ] [ facebook ]   🗑
[ utm_medium ] [ = ] [ email     ]  🗑
```

Two text inputs (param and value) per rule. Add/remove buttons. Empty by default.

**Experiment level** — toggle below Conversion URL:

```
☐ Rules override existing assignment
  When active, query param rules reassign visitors even if they already have a cookie.
```

### Future UI note

The user has a future vision for a visual flow-based interface (pipeline builder style with markers). The current data model is designed to be compatible with that future redesign — no structural changes will be needed.

## Migration

Safe migration — only adds new nullable columns with defaults:

```sql
ALTER TABLE variants ADD COLUMN rules jsonb NOT NULL DEFAULT '[]';
ALTER TABLE experiments ADD COLUMN override_assignment boolean NOT NULL DEFAULT false;
```

Existing data (including boostify experiments) is unaffected.

## Tests

New tests to add (worker):

| Case | Expected |
|------|----------|
| Rule matches query param | Routes to that variant |
| No rule matches | Falls back to random assignment |
| Two variants both match | First variant in array wins |
| Rule matches + cookie exists + `override_assignment=false` | Respects existing cookie |
| Rule matches + cookie exists + `override_assignment=true` | Reassigns to matched variant |
| Variant has empty rules `[]` | Treated as no rules, falls through to random |
| Rule param present but wrong value | No match, falls through |
