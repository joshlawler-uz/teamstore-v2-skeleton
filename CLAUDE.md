# Teamstore V2

A reusable Shopify theme for football club retail, built for a SaaS company serving 9+ clubs.
One codebase, per-client colours/fonts/crest layered on top via tokens — this is **not** a
single branded storefront. No client branding exists yet; the base is deliberately black and
white while the system is built. Don't "fix" the lack of colour.

## Reference material

- **Shopify's Horizon theme**, checked out locally at `../horizon` (same parent folder as this
  repo) — the reference for idiomatic markup, accessibility patterns, and JS behaviour.
  **Do not fork it wholesale.** Reuse its DOM/ARIA structure and interaction patterns, restyle
  entirely with our own Tailwind + tokens. See "JavaScript" below for why we don't lift its
  actual JS files.
- **Two scope docs** (published as Claude Artifacts, but the canonical version is a Confluence
  page the user maintains) define what's in v1: a priority brief (Essential/Nice to
  have/Deferred per page) and a section-by-section breakdown mapped to Horizon references.
  Ask the user for the current Confluence link if planning work that needs full v1 scope.

## Architecture

- **Multi-client build tooling is fully decoupled from theme code.** `clients/<name>/config.json`
  (design tokens), `clients/<name>/custom/` (per-client file overrides), and the
  `compose`/`pull`/`deploy:*` scripts never get referenced by sections/snippets/blocks. Safe to
  change the tooling without touching theme code, and vice versa.
- **Design tokens**: `npm run tokens` generates `assets/tokens.css` from
  `clients/<name>/config.json`. Current config shape is a hand-authored flat placeholder
  (4 colours). The real per-client shape (seen from an actual club's CMS) uses 50–950 hex
  scales per colour family and variable font-weight ranges — when rewiring to that shape, only
  `clients/<name>/config.json`'s schema and `scripts/generate-tokens.mjs`'s mapping logic
  change; no theme code is affected, since sections only ever consume the resulting CSS
  variable names.
- **Tailwind v4** (`frontend/entrypoints/tailwind.css` → `assets/tailwind.css` via Vite). Tokens
  are mapped into `@theme inline` so `bg-primary`, `text-foreground`, `font-heading`,
  `gap-base`, `rounded` etc. work as utilities backed by the generated CSS variables.
- **Styling convention**: Tailwind utility classes in markup for layout/spacing/colour.
  `{% stylesheet %}` blocks are reserved only for dynamic per-setting values Tailwind can't
  express (e.g. a CSS custom property set from a block setting).
- `settings.color_palette` (global palette, matching Horizon's approach — not a per-section
  scheme picker) feeds `--color-primary`/`--color-secondary`.

## JavaScript

Plain custom elements with native `addEventListener`, no framework. Deliberately **not** using
Horizon's actual JS files or its patterns:

- Horizon's JS extends a shared `Component` base class with a declarative `ref="..."` /
  `on:click="target/method"` binding system, which is itself coupled to Horizon's exact markup
  contract. Lifting a component's JS without also lifting that base class and matching markup
  mostly doesn't work — and if you did, you've re-forked Horizon's architecture.
- Horizon's predictive search and cart-drawer reactivity use the Section Rendering API plus a
  `morph()` DOM-diffing library. We only use the **Section Rendering API** half (fetching a
  rendered Liquid fragment via `?section_id=x`) — see `sections/predictive-search.liquid`. We
  skip `morph()`: our current use cases (predictive search results) are small, disposable
  containers with no state worth preserving across an update, so a plain `innerHTML` swap is
  equivalent at a fraction of the code. Reach for `idiomorph` (a standalone library, not
  Horizon's coupled version) if we ever build something where a full DOM replace would visibly
  reset user state — e.g. a live-filtering collection grid or a cart drawer with a focused
  input mid-interaction.

Established patterns in `frontend/entrypoints/header.js`:

- `DialogElement` — base class for anything built on native `<dialog>` (search modal, header
  drawer). Looks for `[data-dialog-open]` / `[data-dialog-close]` inside itself. Extend it
  (`class SearchModal extends DialogElement { onOpen() {...} }`) rather than duplicating
  open/close/backdrop-click/Escape wiring.
- `NavDropdown` — base class for click-toggle disclosure (`[data-dropdown-trigger]` /
  `[data-dropdown-panel]`, `hidden` attribute, Escape-to-close with `stopPropagation()` so
  nested levels close one at a time, click-outside-to-close). `LocalizationForm extends
  NavDropdown` for the country/language selector's select-and-submit behaviour — reuse this
  pattern for any other click-toggle disclosure rather than writing new open/close logic.
- Header nav supports up to two levels of nested flyout via a **recursive Liquid snippet**
  (`snippets/header-nav-list.liquid` renders itself for each nesting level), not a
  hand-unrolled 2-level template.

## Accessibility patterns to keep

- Disclosure pattern: trigger button with `aria-expanded` + `aria-controls`, panel starts
  `hidden`. Toggle both together.
- Native `<dialog>` (`showModal()`/`close()`) for anything modal — free focus containment,
  Escape-to-close, and top-layer stacking, no manual focus trap needed.
- Nested disclosures (2-level nav) must `stopPropagation()` on Escape so one keypress closes
  one level, not the whole stack — this was a real bug caught when nesting went from 1 to 2
  levels.
- `aria-describedby`/`aria-label` combos for icon-only buttons (cart count, close buttons) —
  every icon-only interactive element needs an accessible name.

## Customer accounts: don't build templates

Verified against Horizon: **zero** `templates/customer/*.liquid` files exist. The account
experience (login, order history, order detail, addresses) is rendered entirely by Shopify's
`<shopify-account>` web component (new customer accounts) — there is no theme-owned page to
design or build. The only theme-controlled surface is a fixed set of CSS custom properties
passed to the component (font, colour, border-radius — see `snippets/header-actions.liquid`
equivalent in Horizon for the full property list). This only holds if a client store is on
Shopify's new customer accounts; classic accounts would need real Liquid templates — don't
assume without checking if it ever comes up.

## Building for app compatibility

This theme needs to work with commonly-installed Shopify apps (reviews, subscriptions, upsells,
size charts) even though none are integrated yet:

- Any section merchants might want to drop an app's block into (product page, homepage) should
  declare `"blocks": [{ "type": "@app" }, { "type": "@theme" }]` in its schema — without
  `"@app"`, the theme editor won't offer installed app blocks for that section at all.
- Keep a real `<select name="id">` in the DOM behind any custom variant-picker UI (swatches,
  buttons) — visually hidden, not removed — so third-party JS that reads/writes it (bundle
  builders, subscription widgets) keeps working.
- Use Shopify's standard Cart AJAX endpoints (`/cart/add.js`, `/cart/change.js`, `/cart.js`)
  for any cart interaction, even behind fully custom drawer markup. Apps that hook the API
  (rather than sniffing Dawn/Horizon-shaped DOM) will keep working regardless of our markup.
- Keep content areas driven by real settings (`rich_text`, `liquid`, `text`) rather than
  hardcoded markup, so merchants can wire in app metafields via "Connect dynamic source."
- `content_for_header` is already correctly placed in `layout/theme.liquid`'s `<head>` — most
  app tracking/script injection depends on this being present.

## Validation — run before considering Liquid work done

- `npm run check` runs `shopify theme check` against `.theme-check.yml`
  (`theme-check:recommended`, ignoring `node_modules/` and `frontend/`). Zero offenses is the
  bar — this project started clean and should stay that way.
- In a Claude session with the shopify-dev MCP server available, use
  `mcp__shopify-dev__validate_theme` on changed files as you go — it catches the same class of
  issues (invalid schema, undefined translation keys, hallucinated Liquid) with faster
  per-file feedback than a full theme scan.
- `npm run build` (runs `tokens` then `vite build`) should also complete cleanly — it's the
  only way to confirm Tailwind picked up new utility classes and the Vite/vite-tag pipeline
  regenerated correctly.
- Snippets need a `{% doc %}` header with typed `@param`s. Valid types are `string`, `number`,
  `boolean`, `object`, or a named Liquid object type (`product`, `color`, etc.) — **not**
  `link_list`, which Theme Check rejects. Use `{object}` for menu/link-list params.

## Known build-tooling gotchas (already fixed, don't reintroduce)

- `.shopifyignore` must **not** exclude `snippets/vite-tag.liquid` — it's generated (correctly
  gitignored), but the live theme still needs it present to serve any `{% render 'vite-tag' %}`
  call. It was excluded early on with no ill effect only because nothing rendered it yet.
- `vite-plugin-shopify`'s `versionNumbers` must be `true` in `vite.config.js`. With it `false`,
  generated asset URLs have no cache-busting query string, and Shopify's CDN can serve a
  permanently stale cached JS/CSS file across edits with no visible error — this cost a long
  debugging session before the cause was found.
- `assets/.vite/*` (glob, not the bare directory name) must be in `.shopifyignore`, or Shopify
  CLI fails to push with "Theme files may not be stored in subfolders."
