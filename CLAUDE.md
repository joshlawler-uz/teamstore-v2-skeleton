# Teamstore V2

A reusable Shopify theme for football club retail, built for a SaaS company serving 9+ clubs.
One codebase, per-client colours/fonts/crest layered on top via tokens — this is **not** a
single branded storefront. No client branding exists yet; the base is deliberately black and
white while the system is built. Don't "fix" the lack of colour. This approach matches Shopify's
own official theme design guidance directly: "build variations of the same component, rather
than providing two components" that serve identical purposes — one flexible component beats a
club-specific fork, every time.

## Reference material

- **Shopify's Horizon theme**, checked out locally at `../horizon` (same parent folder as this
  repo) — the reference for idiomatic markup, accessibility patterns, and JS behaviour.
  **Do not fork it wholesale.** Reuse its DOM/ARIA structure and interaction patterns, restyle
  entirely with our own Tailwind + tokens. See "JavaScript" below for why we don't lift its
  actual JS files. Worth knowing this isn't just a style preference: Shopify's official Theme
  Store requirements explicitly state "new theme submissions built on or derived from Dawn or
  Horizon are not eligible for the Shopify Theme Store" — a hard platform rule, not a
  convention, if Theme Store listing is ever a goal for this theme.
- **Shopify's official theme documentation** (via the `shopify-dev` MCP server,
  `mcp__shopify-dev__search_docs_chunks`/`validate_theme`) — **authoritative**, unlike the four
  reference themes above. Horizon/Focal/Baseline show what real themes *happen* to do; official
  docs are the actual platform rules (Theme Store requirements, accessibility/performance bars,
  Liquid best practices). Always prefer official docs over theme precedent when they conflict.
  Findings folded throughout this file, particularly "Accessibility patterns", "Validation", and
  the new "Liquid performance conventions" section below.
- **A generic "Shopify theme development" AI-guidelines document** the user found (not part of
  this repo, not official Shopify docs — reads as a community/AI-authored checklist). Treated
  with real skepticism, not adopted wholesale: it contains at least one factual error we caught
  by cross-checking against our own verified research — it claims "avoid jQuery, [it's] not
  included in modern Shopify themes," but Focal (a real, paid Theme Store theme we inspected
  directly) ships a jQuery interop shim, and Baseline (also real, also inspected) uses Alpine.js.
  The genuinely useful, verified parts are folded in below (metafields, custom-element naming,
  cart API endpoints, git workflow); anything not mentioned elsewhere in this file was judged not
  reliable enough or not yet relevant to adopt. Don't treat a document like this as authoritative
  just because it's formatted like one — cross-check specific claims against real themes or
  official docs before trusting them, same as any other secondary source.
- **Focal (Clean Canvas/Symmetry, v13.0.0)** — a popular commercial theme most of our actual
  competitors in football-club retail run. Extracted at `~/Downloads/focal-shopify-theme-v13.0.0`
  when last reviewed (not part of this repo — ask the user if it needs re-fetching). Horizon is
  our structural/accessibility reference; Focal is our **competitive-parity** reference — it
  surfaces section types and conversion patterns real competitors ship that a from-scratch build
  against Horizon alone would miss entirely. See "Patterns worth adopting from Focal" below.
  Same rule applies: reference for ideas, never fork markup or JS wholesale.
- **Two scope docs** (published as Claude Artifacts, but the canonical version is a Confluence
  page the user maintains) define what's in v1: a priority brief (Essential/Nice to
  have/Deferred per page) and a section-by-section breakdown mapped to Horizon references.
  Ask the user for the current Confluence link if planning work that needs full v1 scope.
- **`poc-frontend-2.0`** — a sibling company codebase: a multi-tenant Nuxt 3 platform powering
  each club's *main* (non-Shopify) website — news, fixtures, teams, sponsors, CMS content, via
  a `$gc` SDK. Relevant here in two ways: (1) it's almost certainly the "main site" if a club
  ever wants a shop widget embedded outside Shopify — Shopify's Storefront Web Components
  (`<shopify-store>`, unrelated to the `<shopify-store>` element Shopify auto-injects alongside
  `<shopify-account>` — same tag name, different thing, see "Building for app compatibility")
  would be the mechanism, dropped into a Nuxt page. (2) It fetches per-client colours/fonts from
  a CMS at build time into generated files, same philosophy as our own token pipeline — good
  supporting evidence for the real per-client config shape noted below, likely the same or a
  sibling CMS. Its own CLAUDE.md explicitly bans dynamic Tailwind class interpolation
  (`bg-${color}-${shade}`) in favour of semantic CSS variables — see the same rule adopted below.
- **Baseline (v5.0.0)** — a real, paid theme on the actual Shopify Theme Store, extracted at
  `~/Downloads/baseline-shopify-theme-v5.0.0` when last reviewed (not part of this repo, distributed
  compiled-only — no source/build config shipped). Unlike Horizon/Focal, this is our
  **Tailwind-in-Shopify-at-Theme-Store-quality** reference — it validates (or corrects) our actual
  Tailwind conventions against a real, review-passed precedent, not just a competitor's feature
  list. Confirmed Tailwind v3.4.17 compiled output; no source config shipped, so only its
  Liquid/CSS *output* is inspectable, not its build setup. See findings folded into "Styling
  convention", "Accessibility patterns", and "JavaScript" below.

## Architecture

- **Multi-client build tooling is fully decoupled from theme code.** `clients/<name>/config.json`
  (design tokens), `clients/<name>/custom/` (per-client file overrides), and the
  `compose`/`pull`/`deploy:*` scripts never get referenced by sections/snippets/blocks. Safe to
  change the tooling without touching theme code, and vice versa. Note: Shopify CLI's own
  `shopify.theme.toml` environments (`--environment <name>`, and multi-environment invocations
  across `check`/`push`/`pull`/etc.) solve a *different* problem — which store/theme a command
  targets — not which client's design tokens to compose in. Not a replacement for this tooling,
  but could simplify the store/theme-targeting flags inside `deploy:preview`/`deploy:live` later
  if useful; not urgent.
- **Design tokens**: `npm run tokens` generates `assets/tokens.css` from
  `clients/<name>/config.json`. Current config shape is a hand-authored flat placeholder
  (4 colours). The real per-client shape (seen from an actual club's CMS) uses 50–950 hex
  scales per colour family and variable font-weight ranges — when rewiring to that shape, only
  `clients/<name>/config.json`'s schema and `scripts/generate-tokens.mjs`'s mapping logic
  change; no theme code is affected, since sections only ever consume the resulting CSS
  variable names. Note: both Horizon and Baseline instead use Shopify's native
  `color_scheme_group` model — a handful of named schemes, each just 5 raw colours
  (background/text/accent/accent_contrast/secondary), then role-mapped to ~10 semantic UI slots
  (primary_button, on_primary_button, icons, links, etc.) rather than full 50–950 ramps. That's
  a legitimate, Theme-Store-proven alternative shape — but our target stays the 50–950-scale
  model above, since that's what the actual upstream club CMS (see `poc-frontend-2.0`) provides,
  not a general "which is better" call.
- **Tracked, not urgent**: Shopify's Theme Store requirements mandate a minimum of 4 colours in
  `settings.color_palette`, and every background colour setting needs a corresponding foreground
  setting. `config/settings_schema.json`'s current palette only has 2 keys
  (`background`/`foreground`), below that bar. Deliberately not fixed now — it's an explicit
  placeholder per this file's intro ("don't fix the lack of colour") — but the real token
  rewiring (above) must satisfy this when it happens, not just match the 50–950-scale shape.
- **Tailwind v4** (`frontend/entrypoints/tailwind.css` → `assets/tailwind.css` via Vite). Tokens
  are mapped into `@theme inline` so `bg-primary`, `text-foreground`, `font-heading`,
  `gap-base`, `rounded` etc. work as utilities backed by the generated CSS variables.
- **Styling convention**: Tailwind utility classes in markup for layout/spacing/colour.
  `{% stylesheet %}` blocks are reserved only for dynamic per-setting values Tailwind can't
  express (e.g. a CSS custom property set from a block setting). Confirmed against Baseline
  (Theme Store precedent): raw utility chains directly in Liquid is the dominant real-world
  pattern (>95% of their markup), not just our own convenience choice — no change needed. Their
  one deliberate exception is worth adopting the same way: a small number of hand-authored
  semantic classes (`.theme-button`, `.icon-button` equivalents) reserved only for the
  highest-repetition, most state-heavy primitives — built from utilities that reference our
  token CSS variables via arbitrary values (`bg-[var(--color-primary)]`-style), not from static
  `@apply`d utility names. When we build real buttons (not yet — only icon-only header controls
  exist today), this is the pattern: one `.btn`/`.btn-primary`-style class pair, not a general
  component-class layer, and not raw utility chains repeated at every call site either.
- **Never build a Tailwind class name dynamically at runtime** — no
  `class="bg-{{ color }}-{{ shade }}"`, no `class="text-{{ setting }}"` string-built from Liquid
  variables. Tailwind's compiler only generates CSS for class names it can find as literal
  strings in source at build time; a dynamically-interpolated class name won't exist in the
  scanned output, so the element silently gets no style applied, with no error anywhere. This is
  also why our token system maps into real, named CSS variables (`--color-primary`, etc.) up
  front rather than trying to construct utility class names from arbitrary client data — always
  reference a fixed, known utility class or CSS variable name, never assemble one from a
  variable. (Same rule independently enforced in `poc-frontend-2.0`, our sibling Nuxt frontend —
  see "Reference material" above.)
- `settings.color_palette` (global palette, matching Horizon's approach — not a per-section
  scheme picker) feeds `--color-primary`/`--color-secondary`.

## Build tooling: source vs. compiled output

Not every asset needs a Vite source/compiled-output split — only things that genuinely require
compilation do:

- **Tailwind CSS is mandatory to compile.** `frontend/entrypoints/tailwind.css` (source, pulls
  in Tailwind + our `@theme inline` token mapping) → `assets/tailwind.css` (compiled output,
  regenerated by `npm run build`/`dev`). There's no way around this — `bg-primary` means nothing
  to a browser until Tailwind scans the Liquid files and generates matching CSS.
- **Plain JS/CSS does not need this split.** `assets/critical.css` and `assets/header.js` are
  both hand-written directly in `assets/`, no source file elsewhere, no build step — because
  they're not using any syntax that needs transforming. Don't add a `frontend/entrypoints/*.js`
  file (and the `{% render 'vite-tag' %}` indirection) unless something actually needs bundling
  — real ES module imports shared across multiple JS files, or a genuine minification win at
  scale. A single self-contained file gains nothing from the indirection.
- `assets/tokens.css` is a third case: "generated" but by a plain Node script
  (`scripts/generate-tokens.mjs`), not Vite — don't confuse this with the Tailwind pipeline.
- Compiled output (`assets/tailwind.css`) is committed to git, not gitignored — Shopify has no
  build step of its own, so the real served files have to exist as physical files in the repo
  until a CI pipeline exists to build immediately before `theme push`. This matches Shopify's own
  officially documented "mix source and compiled code" version-control strategy — a real,
  legitimate option, but explicitly **not** the one Shopify's own docs rank as the top
  recommendation (that's splitting source/compiled across branches via `git subtree`). Known
  risk of our approach, per Shopify's own docs: compiled files can be hard to distinguish from
  source and could get hand-edited by mistake (e.g. in Shopify's admin code editor) with no
  automatic backfill to the real source — not a concern today (no one edits theme code in the
  Shopify admin), but worth knowing if that ever changes.
- **A third, not-yet-used option exists for settings-driven JS/CSS**: any `.liquid`-suffixed
  non-binary asset (`assets/foo.js.liquid`, `assets/foo.css.liquid`) gets full access to the
  `settings` object and Liquid filters, sitting between a plain static file and the
  `{% stylesheet %}`-block/CSS-variable approach already established. Flagging as available, not
  adopting — no current case needs it, and it's a real architectural choice (a third file-type
  convention) worth deciding deliberately rather than reaching for ad hoc.
- **Shopify auto-minifies CSS and JS files in `assets/` at request time — but only JS using ES5
  syntax or lower.** `assets/header.js` uses ES6 classes (required for custom elements), so it
  almost certainly does **not** qualify for this free minification and ships unminified to
  production today. `assets/critical.css` likely does get auto-minified (plain CSS, no ES version
  concern). This is a real, accepted tradeoff of the "hand-write in `assets/`, no build step"
  convention above — worth knowing explicitly rather than assuming everything in `assets/` is
  optimized automatically. Not urgent to fix at current file size; reconsider if `assets/*.js`
  grows significantly.
- **Do not connect this repo's branches to Shopify's official GitHub integration (the "Connect
  from GitHub" theme-library flow) without first solving a real structural conflict.** That
  integration is one-branch-to-one-theme-to-one-store, requires the connected branch to exactly
  match the standard theme folder layout (a `frontend/entrypoints/`-style non-standard folder is
  silently ignored, not merged), and is bidirectional — any edit made in the Shopify theme editor
  auto-commits back to the branch within ~10 seconds, with no real conflict resolution against an
  external `shopify theme push`. This repo's actual model (one shared source, `npm run compose`
  generates a distinct `.dist/<client>/` tree per club, pushed via CLI) doesn't fit that
  one-branch-one-theme shape at all. Transferring the repo to a different GitHub account/org is
  completely unrelated and fine — the conflict is specifically with turning on the Shopify-side
  GitHub App connection against this repo. If a client ever wants theme-editor edits to
  round-trip into git, that needs a dedicated, CI-generated deploy branch per client (standard
  theme layout only), not a connection to this source repo directly.

## JavaScript

Plain custom elements with native `addEventListener`, no framework. Deliberately **not** using
Horizon's actual JS files or its patterns:

- Horizon's JS extends a shared `Component` base class with a declarative `ref="..."` /
  `on:click="target/method"` binding system, which is itself coupled to Horizon's exact markup
  contract. Lifting a component's JS without also lifting that base class and matching markup
  mostly doesn't work — and if you did, you've re-forked Horizon's architecture.
- Focal (our competitive-parity reference, see above) is **also** native-custom-element-based,
  not jQuery — don't assume "modern web components vs. jQuery" is the real gap between
  competitor themes and Horizon. Focal's actual difference is style, not technology: ~65 custom
  elements in one large imperative bundle (`assets/theme.js`), vs. Horizon's smaller, more
  composable, declarative-shadow-DOM style. jQuery only shows up in Focal's `vendor.js` as an
  optional interop shim (fires jQuery-style events *if* jQuery happens to already be loaded by
  a merchant/app) — Focal doesn't ship or depend on it itself. Our own small-file, base-class
  approach (below) sits closer to Horizon's style than Focal's.
- Horizon's predictive search and cart-drawer reactivity use the Section Rendering API plus a
  `morph()` DOM-diffing library. We only use the **Section Rendering API** half (fetching a
  rendered Liquid fragment via `?section_id=x`) — see `sections/predictive-search.liquid`. We
  skip `morph()`: our current use cases (predictive search results) are small, disposable
  containers with no state worth preserving across an update, so a plain `innerHTML` swap is
  equivalent at a fraction of the code. Reach for `idiomorph` (a standalone library, not
  Horizon's coupled version) if we ever build something where a full DOM replace would visibly
  reset user state — e.g. a live-filtering collection grid or a cart drawer with a focused
  input mid-interaction.
- **Section Rendering API, fuller picture (official docs, for the future cart drawer)**: a
  `sections=` (plural) param renders up to 5 named sections in one request — comma-separated or
  array syntax — returning a JSON object keyed by section ID to rendered HTML. **Requesting more
  than 5 is a hard HTTP 400**, not a soft limit. A section missing/failing inside that list comes
  back as `null` for its key with the overall response still `200` — only the single-section
  `?section_id=` path 404s outright, so any section-swap code must explicitly guard against
  `null` entries. **`<script>` tags in the returned HTML do not execute** when inserted via
  `innerHTML`/`DOMParser` — fine for markup-only sections like predictive search, but any future
  section needing its own behavior needs either event delegation from a non-replaced ancestor or
  a custom element that re-initializes in `connectedCallback()`. Section settings can't be
  overridden via the request — whatever's currently configured (or default) applies.
  **The official pattern for a cart drawer specifically**: `cart/add.js`, `cart/change.js`,
  `cart/update.js`, and `cart/clear.js` all accept a `sections` param in the *same POST body* —
  Shopify updates the cart and returns rendered HTML for up to 5 named sections in one round
  trip (under a `sections` key in the cart JSON response), rather than a separate Cart Ajax call
  plus a separate Section Rendering call. Use this when the cart drawer gets built, not two
  requests. A `sections_url` param can also be passed to render those sections in a different
  page's context than the current page.
- Baseline (Theme Store reference, see above) uses Alpine.js for state/reactivity plus a handful
  of native custom elements as lazy-hydration "islands" (a custom element controls *when* Alpine
  hydrates; Alpine controls *what happens*) — a real, review-passed, different-from-both
  architecture. Noted for completeness, not adopted: "Theme Store approved" doesn't mean
  "framework-free," but our plain-custom-elements choice remains deliberate, not something this
  invalidates. Don't re-litigate this by reaching for Alpine later on the strength of this
  precedent alone.

Note: JS is hand-written directly in `assets/` (e.g. `assets/header.js`), not run through Vite —
see "Build tooling: source vs. compiled output" above for why. `frontend/entrypoints/` is
Tailwind-only now.

Established patterns in `assets/header.js`:

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

**Decided: no prefix, keep generic names** (`nav-dropdown`, `header-drawer`, `search-modal`,
`localization-form`, `predictive-search`, and future elements). The risk considered:
`customElements.define()` throws if the same tag name is registered twice — an installed app
shipping its own `<search-modal>` element would collide with ours and silently break whichever
one registers second, with no visible error to a merchant. Confirmed this is a real, not
hypothetical, risk: Horizon and Focal — two major, real Shopify themes — independently register
the exact same bare names for equivalent features (`variant-picker`, `product-recommendations`,
`cart-note` collide between them). Neither theme prefixes either. Decided not to prefix anyway,
because: (a) apps that DOM-sniff for specific tag names to auto-inject do it for Dawn/Horizon
specifically, for their massive install base — nobody targets a proprietary internal theme like
this one, so we're not giving up real compatibility by staying generic; (b) our app-compatibility
strategy already depends on Shopify's standard APIs (Cart AJAX, `@app` blocks), not DOM-sniffing,
in both directions — we don't rely on apps recognizing our markup, so naming doesn't affect that
strategy either way. Don't re-raise this later without new information — it's a settled call,
not an oversight.

## Patterns worth adopting from Focal (competitor-proven, not yet built)

Concrete conversion/UX patterns Focal ships that Horizon doesn't have an equivalent for —
adopt the *idea*, reimplement with our own custom elements/Tailwind, same as everything else:

- **Free-shipping progress bar lives in the cart drawer, not the announcement bar.** Focal
  computes it from a threshold setting (supports per-currency strings like
  `"usd:100,eur:90"`) and renders a progress bar above the line items. When we build the cart
  drawer, this is the right place for it.
- **Cart cross-sell**: `GET /{locale}/recommendations/products.json?product_id={id}&limit={1-10}&intent={related|complementary}`
  using the first cart item's product ID, filter out anything already in the cart client-side,
  cap at ~6 (endpoint's own ceiling is 10), render in a horizontal scroller. `intent` is a real
  choice, not decoration — `related` (default) vs. `complementary` ("goes well with this," e.g.
  socks with boots) are different algorithms; `complementary` is likely the better fit for a cart
  cross-sell specifically. 404 if `product_id` doesn't exist or isn't published to Online Store;
  422 if `product_id` is missing or `intent` is invalid. Note a client running the Search &
  Discovery app can have these results overridden by that app — plausible for some of the 9+
  clubs and not others, worth checking per client rather than assuming.
- **Sticky add-to-cart bar**: don't hand-roll scroll-position math per page. Focal's pattern is
  a wrapper that observes the main buy-box form's visibility (e.g. `IntersectionObserver`) and
  toggles a condensed sticky version (thumbnail, title, price, variant control, add-to-cart)
  once it scrolls out of view. High-value for a mobile-heavy retail audience.
- **Variant picker dropdown**: when a variant option needs dropdown-style UI, prefer an
  accessible custom combo-box/listbox (styled to match swatch/button option UI) over a native
  `<select>` left unstyled. Keep the real hidden `<select name="id">` or a hidden
  `<input name="id">` synced by JS for form submission and third-party app compatibility (see
  "Building for app compatibility") — the visible control and the form-submission value don't
  have to be the same element, just kept in sync.
- **Product page buy-box requirements** (Shopify's official design guidance, not yet built):
  "prominent title, price, and buy button," and accelerated checkout (Shop Pay etc.) enabled by
  default rather than opt-in. Worth designing the buy-box with an accelerated-checkout button
  alongside the standard add-to-cart from the start, not bolted on after.
- **Announcement bar** (if/when we build one): block-based, supports multiple rotating messages,
  each optionally expandable into a small detail overlay (not a full modal). Lives above the
  header, first section in `header-group.json`.
- **Do not build a custom cookie-consent banner.** Focal's own `privacy-banner.liquid` is marked
  deprecated in its own schema, in favour of Shopify's native Customer Privacy API/banner —
  same conclusion Horizon already reaches. If cookie consent ever comes up, use Shopify's native
  mechanism, don't build one.
- **Predictive search language fallback**: Shopify's Predictive Search API doesn't support every
  storefront language yet. If we ever localize into an unsupported language, Focal's
  `predictive-search-compatibility.liquid` (server-rendered fallback using the normal
  `search.results` object instead of the AJAX endpoint) is the right pattern to reference — not
  a concern for English-only stores today.
- **Sections worth adding to v1 scope docs, not yet there**: testimonials, a press/logo-list
  section (sponsor credibility — genuinely club-specific value), a text-with-icons trust-badge
  row, a simple FAQ section, and recently-viewed-products are all cheap, standard, and commonly
  expected in retail — worth raising with the user for the scope docs rather than silently
  adding.

## Accessibility patterns to keep

- Disclosure pattern: trigger button with `aria-expanded` + `aria-controls`, panel starts
  `hidden`. Toggle both together.
- Native `<dialog>` (`showModal()`/`close()`) for anything modal — free focus containment,
  Escape-to-close, and top-layer stacking, no manual focus trap needed. Confirmed not a hard
  Theme Store requirement — Baseline passes review using plain `<div>`s toggled by Alpine plus a
  hand-rolled inert/focus-trap implementation instead. That's real, working evidence the
  constraint is looser than assumed, not a reason to switch: `<dialog>` still does the same job
  for a fraction of the code, so it stays our choice.
- Nested disclosures (2-level nav) must `stopPropagation()` on Escape so one keypress closes
  one level, not the whole stack — this was a real bug caught when nesting went from 1 to 2
  levels.
- `aria-describedby`/`aria-label` combos for icon-only buttons (cart count, close buttons) —
  every icon-only interactive element needs an accessible name.
- **Skip link + `<main id="MainContent" tabindex="-1">`** in `layout/theme.liquid` — a genuine
  Theme Store accessibility requirement, not optional polish. The `tabindex="-1"` matters: some
  browsers only scroll to a skip-link target without moving keyboard focus unless it's
  programmatically focusable, which defeats the point (subsequent Tab presses would continue
  from wherever focus was before, not from the content). Styled with Tailwind's
  `sr-only focus:not-sr-only` pair, not a custom off-screen-positioning stylesheet block.
- **Touch targets: two different numbers for two different bars.** Theme Store review requires a
  24×24 CSS px minimum; Shopify's separate mobile Core Web Vitals guidance recommends 48×48px on
  mobile specifically. Don't conflate them — 24×24 is the hard submission bar, 48×48 is the
  better mobile-UX target to actually design toward.
- **Cart count needs a live region once it updates without a page reload** (not yet, since there's
  no AJAX cart) — the correct pattern (confirmed against Horizon) is a separate, visually-hidden
  `role="status"` element updated by JS alongside the visual badge, not `aria-live` bolted onto
  the badge or the link itself. Add this when cart AJAX gets built, not before — a live region
  with nothing that ever updates it is dead weight.
- **Decorative icon SVGs need `aria-hidden="true" focusable="false"` on the root `<svg>`.** Every
  icon in `assets/icon-*.svg` sits inside a button/link that already has its own accessible name
  (`aria-label` or visually-hidden text) — without this, some screen reader/browser combinations
  can still expose the SVG's content, duplicating or garbling the announcement. Since
  `inline_asset_content` just inlines the raw file, this has to be set in the SVG source itself,
  not passed as a Liquid attribute. Add this to any new icon file from the start.
- **Components must respect DOM order and tab order** (Shopify's official design principles) —
  visual order and keyboard-tab order must match. Not an issue yet since nothing here uses CSS
  to visually reorder content away from source order, but worth checking explicitly the moment
  a grid or flex layout does (e.g. `order-*` utilities, `flex-direction: row-reverse`).

## Customer accounts: don't build templates (default), but verify per client

Verified against Horizon: **zero** `templates/customer/*.liquid` files exist. The account
experience (login, order history, order detail, addresses) is rendered entirely by Shopify's
`<shopify-account>` web component (new customer accounts) — there is no theme-owned page to
design or build. The only theme-controlled surface is a fixed set of CSS custom properties
passed to the component (font, colour, border-radius — see `snippets/header-actions.liquid`
equivalent in Horizon for the full property list). **This is our default assumption for new
work.**

**This is not universal, though — verify it per client before assuming.** Focal (the commercial
theme most of our actual competitors run) is strictly classic-accounts: real
`main-customers-login.liquid`/`register`/`addresses`/`order` sections using
`{% form 'customer_login' %}`, `{% form 'create_customer' %}`, `{% form 'customer_address' %}`
etc., with zero trace of new-accounts markers. Classic themes require "Legacy" customer accounts
enabled in Shopify admin (Settings → Customer accounts) — any club currently running a
Focal-like theme almost certainly has this setting, not new accounts.

**Practical implication**: when onboarding a real club, check their current
Settings → Customer accounts value before assuming `<shopify-account>` will work. If they're on
Legacy, either migrate them to new accounts (recommended — zero template work, matches our
existing convention) or scope building real classic `templates/customer/*.liquid` as a deliberate
side-project for that client. Don't build classic templates speculatively — only if a real client
actually needs them.

## Building for app compatibility

This theme needs to work with commonly-installed Shopify apps (reviews, subscriptions, upsells,
size charts) even though none are integrated yet:

- Any section merchants might want to drop an app's block into (product page, homepage) should
  declare `"blocks": [{ "type": "@app" }, { "type": "@theme" }]` in its schema — without
  `"@app"`, the theme editor won't offer installed app blocks for that section at all.
  Competitor data point (Focal): real-world practice is to add `"@app"` selectively — only
  ~10 of 60 sections have it, all transactional (product, cart, customer-account pages), plus
  one generic catch-all `apps.liquid` section (just `{% for block in section.blocks %}{% render
  block %}{% endfor %}`) that merchants can drop anywhere in a section list purely to host app
  blocks. Marketing/content sections (testimonials, FAQ, announcement bar, etc.) don't get
  `"@app"` in practice — that's a reasonable minimum bar, not "everywhere." This isn't just
  Focal's convention: Shopify's own Theme Store requirements name a "Custom Liquid" section (a
  section with a `liquid`-type setting, available on every section-supporting template) as a
  **formal requirement**, functioning as exactly this kind of generic app/merchant insertion
  point — worth building this section specifically, not just an `"@app"`-only catch-all, since it
  covers both cases at once. Matches Shopify's own
  official framing: support app blocks specifically "in sections with clear conversion or
  purchase decision use cases" — product and cart, not a blanket rule to add `"@app"` broadly.
- **Don't build a theme setting that duplicates platform functionality** (Shopify's official
  design principles: "avoid replacing platform functionality with theme settings"). Our
  localization form already gets this right — it renders Shopify's own `{% form 'localization' %}`
  rather than a custom-built country/currency switcher. Keep that instinct for anything that
  overlaps a real Shopify feature (discounts, shipping rates, tax display) rather than
  reinventing it as a theme setting.
- **Shopify's official block-granularity test** (from its theme architecture best practices): a
  block is too granular if the layout would break easily from an unexpected block type being
  inserted next to it — e.g. don't split "author," "date," and "comments" into three separate
  blocks if they always appear together; group them. This is the actual decision framework for
  when something should be its own block vs. a fixed part of a section, more precise than
  guessing — use it when designing new sections' block structure.
- Keep a real `<select name="id">` in the DOM behind any custom variant-picker UI (swatches,
  buttons) — visually hidden, not removed — so third-party JS that reads/writes it (bundle
  builders, subscription widgets) keeps working.
- Use Shopify's standard Cart AJAX endpoints for any cart interaction, even behind fully custom
  drawer markup — `/cart/add.js` (add line(s): `{ items: [{ id, quantity }] }`, quantity is the
  new total if the variant's already in cart, not additive), `/cart/change.js` (update exactly
  one line's quantity/properties/selling_plan, identified by its `key`, not `id`), `/cart/update.js`
  (full rewrite of quantities/note/attributes/discount at once — **does not validate quantity
  against available inventory** for lines already in cart, unlike `add.js`), `/cart.js` (read
  current state — `items[].key` is the real per-line identifier `change.js` needs, not
  `variant_id`). Build every URL from `window.Shopify.routes.root` (always trailing-slash), not a
  hardcoded `/cart/...` string — matters the moment any client has more than one language/market.
  Error shape: `{ status, message: "Cart Error", description }`. A line-item property key
  prefixed `_` hides it from storefront UI (theme code must still filter it — it's still present
  in the data); a cart *attribute* key prefixed `__` (double underscore) is fully private with
  zero theme code needed — invisible to both Liquid and the Ajax response. Apps that hook the API
  (rather than sniffing Dawn/Horizon-shaped DOM) will keep working regardless of our markup. Once
  built, dispatch a `CustomEvent` after every mutation (e.g. `cart:updated`) so other components
  (header count, drawer) react without tight coupling — don't have each piece of UI independently
  re-fetch `/cart.js`. See "Section Rendering API, fuller picture" above for the officially
  documented pattern of bundling a cart mutation with rendered section HTML in one request.
- Keep content areas driven by real settings (`rich_text`, `liquid`, `text`) rather than
  hardcoded markup, so merchants can wire in app metafields via "Connect dynamic source."
- **Metafields are read-only from the theme** — Liquid (and theme JS) can only read
  `product.metafields.namespace.key` etc., never write or update them. Don't construct a
  metafield key dynamically at runtime (same reasoning as the dynamic-Tailwind-class rule above —
  always reference a known, fixed namespace/key). Always guard with `!= blank` before outputting.
  Values are capped at 16KB — if a real client's metafield value looks truncated, the fix is on
  the data/admin side, not in the theme. Document any metafield namespace/key a section depends
  on in that section's `{% doc %}`-equivalent top comment once we actually consume any.
- `content_for_header` is already correctly placed in `layout/theme.liquid`'s `<head>` — most
  app tracking/script injection depends on this being present.
- **Shopify itself injects invisible custom elements you didn't write** — e.g. `<shopify-account>`
  (new customer accounts) triggers a `<shopify-store>` sibling element inserted by its own script
  at runtime, purely for context/config, with zero visible content. It still becomes a real flex
  item in any `flex ... gap-*` container it lands in (CSS blockifies all direct flex children
  regardless of `display` value), silently adding unwanted gap on either side. Fix by hiding it
  via an arbitrary-variant selector on the container (`[&_shopify-store]:hidden`) rather than
  trying to prevent or remove the injection — you can't stop Shopify from adding it, and hiding
  it via CSS doesn't affect whatever it's doing functionally. Same principle Shopify's own
  design guidance names directly: "critical actions cannot be obscured by floating app
  components" (chat widgets, cookie banners, etc.) — the fix generalizes beyond this one case.
  Watch for this pattern generally:
  any element Shopify or an app injects into a flex/grid container with `gap` can do this.

## Validation — run before considering Liquid work done

- `npm run check` runs `shopify theme check` against `.theme-check.yml`
  (`theme-check:recommended`, ignoring `node_modules/` and `frontend/`). Zero offenses is the
  bar — this project started clean and should stay that way. `AssetSizeCSS`/`AssetSizeJavaScript`
  are also explicitly enabled — Shopify ships these *disabled by default in `recommended`*, not
  because they're unimportant but because they need a project-specific threshold call. They
  matter more than usual here since `assets/header.js`/`assets/critical.css` are hand-written,
  uncompressed, with no bundler to warn about silent size creep (see "Build tooling" above).
  These two checks measure **raw, uncompressed file size** (100,000 bytes CSS / 10,000 bytes JS
  default thresholds) — not minified or gzipped, worth knowing exactly what's being measured.
- Three severities exist (`error`/`warning`/`info`), configurable per check; `--fail-level`
  controls what makes a CI run exit non-zero (defaults to `error` only). `extends` also accepts
  `theme-check:all` (stricter than `recommended`, an escalation path if ever wanted) and
  `theme-check:theme-app-extension`. A `root` config key can point Theme Check at a compiled
  output directory instead of the repo root — not needed today since `assets/tailwind.css` is
  already committed at the root, but relevant if the per-client `.dist/<client>/` composed
  output ever needs its own check pass (it isn't checked today — only the uncomposed source tree
  is). For editors other than VS Code (which bundles Theme Check via the official Shopify Liquid
  extension), `shopify theme language-server` exposes the same linter as an LSP for any
  LSP-compatible editor.
- `shopify theme check --auto-correct` fixes some violations automatically — worth running before
  a commit rather than fixing every offense by hand. For a real, scoped exception (not a bug to
  fix), use inline `{% # theme-check-disable CheckName %}` / `{% # theme-check-enable CheckName %}`
  around just the affected lines, not a blanket `enabled: false` in `.theme-check.yml` — keeps the
  exception visible and scoped to where it's actually needed.
- **Lighthouse performance: 60 is the hard bar, not the target.** Theme Store review requires a
  minimum *average* Lighthouse performance score of 60 across home/product/collection pages —
  that's the actual submission requirement. A secondary (non-official) source suggested aiming
  for ≥80 on mobile; treat that as a healthier target to design toward, not the compliance bar —
  don't confuse the two numbers or treat 80 as mandatory.
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

## Liquid performance conventions (mostly not yet exercised — watch for this)

No section built so far loops over products/variants, so none of this has actually mattered yet
— but it's exactly where it will, the moment collection/product grid sections exist. From
Shopify's official Liquid performance guidance:

- Avoid nested loops (O(n²) cost) — flatten with `where`/`first`/`map` + `contains`/`join`
  instead of an inner `for`.
- Hoist loop-invariant calls (`assign`, `capture`, `asset_url`, `image_url`, `sort`, `where`,
  `money`, `size`) *outside* the loop rather than recomputing them every iteration.
- Assign `block.settings`/similar repeated dotted-access chains to a local variable once per
  scope rather than re-accessing them.
- Avoid metafield access inside nested loops — each access can be a backend query; prefer theme
  settings over metafields for anything that doesn't genuinely vary per product.
- Fetch a collection/list once and filter it with Liquid filters, rather than querying multiple
  times for different subsets of the same data.
- **`{% paginate %}` is required for some arrays, actively wrong for others — know which.**
  `blog.articles`, `search.results`, `product.variants`, `pages`, `customer.orders`,
  `customer.addresses`, and `article.comments` don't shrink their backend fetch just because a
  `for` loop has `limit:` — they need `{% paginate %}` to actually limit the query.
  `collection.products` and `collections`, by contrast, **do** shrink to match a plain `limit:`
  with no `{% paginate %}` needed (up to their own default caps of 50/1,000). Wrapping one of
  those two in `{% paginate %}` for something like a one-off featured-products row is actively
  wrong — it ties that block to the page's `?page=` URL param, so it renders differently (or
  empty) on `?page=2` of an unrelated paginated list on the same page. Get this right the moment
  any product/collection carousel or grid gets built — it's not obvious from testing page 1 alone.

## Liquid & schema reference notes

Reference facts from Shopify's official docs, not yet needed but worth having on hand rather
than rediscovering when the relevant work starts:

- **`{% block %}`/`{% partial %}` tags — checked, deliberately not adopted.** A new Liquid-first
  templating model (page structure lives in the template itself via `{% block %}`, with
  `{% partial %}` marking a region a client can refresh without a full framework) is real but
  still developer preview, opt-in per *development store* only, not available in production.
  Existing JSON-template/section architecture keeps working unchanged either way. Don't
  re-investigate this later without checking whether it's shipped — if it has, it's the mechanism
  that would eventually obsolete the manual Section-Rendering-API + `innerHTML`-swap pattern used
  for predictive search today.
- **Full `{% schema %}` setting types** (only ones actually used so far are in the codebase; full
  list for reference): `checkbox`, `number`, `radio`, `range`, `select`, `text`, `textarea`,
  `color`, `color_background`, `color_scheme`, `color_scheme_group`, `font_picker`, `collection`,
  `collection_list`, `product`, `product_list`, `blog`, `page`, `article`, `link_list` (menu
  picker — a valid *schema setting* type despite `link_list` being an invalid LiquidDoc
  `@param` type, see below), `url`, `video`, `video_url`, `richtext`, `inline_richtext`, `html`,
  `liquid` (limited-Liquid field — this is the mechanism behind a "Custom Liquid" catch-all
  section, see "Building for app compatibility"), `image_picker`, `metaobject`,
  `metaobject_list` (Theme Store submissions may only reference *standard* metaobject
  definitions in these, not custom/app-owned ones), `text_alignment`, plus sidebar-only
  non-value types `header`/`paragraph`.
- **Full `{% form %}` types**: `product`, `contact`, `customer_login`, `create_customer`,
  `customer_address`, `cart`, `localization`, `new_comment`, `recover_customer_password`,
  `reset_customer_password`, `activate_customer_password`, `guest_login`, `currency`,
  `customer`, `storefront_password`.
- **Combining `{% if %}` conditions**: no ternary, no parentheses for grouping — `&&`/`||` are
  hard syntax errors under the strict parser (must be `and`/`or`, and still can't be
  parenthesized for precedence). Express what would need grouping as nested `{% if %}`, or use
  `{% case %}`/`{% when %}` with a nested `if` inside a branch for multi-way dispatch.
- **Metafields**: read-only from the theme (Liquid/theme JS can only read, never write), 16KB
  cap per value, guard with `!= blank` before outputting. If a key is literally `size`, `first`,
  or `last` (also built-in Liquid filter names), dot notation breaks — use bracket notation:
  `product.metafields.namespace["size"]`. `metafield_tag` auto-generates the semantically right
  element per type (`<time datetime>` for dates, `<a>` for references, currency-formatted
  `<span>` for money) — faster than hand-building markup once real per-club metafields exist.
  `metafield_text` is the text-only equivalent; for a `metaobject_reference`/
  `list.metaobject_reference` value it needs a `field:` param naming which metaobject field to
  render. Rendering a metaobject-backed section (e.g. a team roster) is documented via
  `<shopify-context>`/`<shopify-data>` Storefront Web Components (the same component family
  noted for the `poc-frontend-2.0` embed scenario) or plain `metaobjects.<type>.<handle>` object
  access — worth a targeted docs search before building the first metaobject-driven section,
  since this pass only confirmed the component-based pattern clearly.
- **Sold-out/inventory UI has no official prescribed component** — theme authors build their own
  badge/messaging. The raw data surface on `variant` to build from: `available` (boolean),
  `inventory_policy` (`continue`/`deny` — whether overselling is allowed), `inventory_quantity`,
  and `incoming` (boolean — true if a restock is already signaled, useful for a "restocking soon"
  state distinct from plain sold-out).
- **Locale files**: max 3,400 translations per file, 1,000 characters per value, exactly one
  `*.default.json` and one `*.default.schema.json` theme-wide, other locales named by IETF tag
  (`en-GB.json`, or bare `fi.json` for non-regional). Pluralization: pass `count:` to the `t`
  filter, and provide CLDR plural keys (`one`/`other` cover English; other locales may need
  `zero`/`two`/`few`/`many`) in the locale JSON — dynamic-range grammar (e.g. wording that
  changes by exact stock count) isn't supported, plan copy accordingly. A key ending in `_html`
  marks its *static* text as safe-to-output raw HTML — interpolated `{{ variable }}` values
  inside it are still auto-escaped by the `t` filter regardless, so this doesn't reopen an XSS
  risk on the interpolated part.
- **Hard platform limits**: a JSON template renders up to 25 sections; each section up to 50
  blocks. Section presets support `category` (groups them in the Add-section picker),
  pre-populated `settings`, and default child `blocks` (each with its own `type`/`settings`) —
  relevant once header or any future section grows multiple presets. Theme blocks can also nest
  child theme/app blocks recursively via their own `blocks` schema + `presets` — a
  schema-driven, editor-configurable recursion distinct from the fixed-depth Liquid-snippet
  recursion `header-nav-list.liquid` already uses; different tool for a different job (merchant
  reorders/adds blocks vs. developer-authored fixed structure).
- **Deceptive coding practices (Theme Store rule, low relevance to an internal theme but worth
  knowing)**: no obfuscated code (minification is fine — the distinction is "hard to understand"
  vs. "same behavior, publicly documented transform"), no cloaking (serving different content to
  search engines than users), and explicitly no faking performance scores via user-agent
  sniffing for testing tools. Worth remembering if ever auditing a client's pre-existing theme or
  a third-party app's injected script during onboarding.

## Known build-tooling gotchas (already fixed, don't reintroduce)

- **`clients/<name>/config.json`'s `colors.background`/`colors.foreground` must be hex, not CSS
  keyword names** (`"whitesmoke"`/`"black"` broke this; use `#F5F5F5`/`#000000` etc.). These two
  feed Shopify's `color_palette` setting type via `scripts/seed-settings.mjs`, which strictly
  requires hex colors with no alpha channel — unlike plain CSS (or the `color` setting type used
  for `colors.primary`/`colors.secondary`), keyword names are rejected outright with a
  `Setting '<id>' must be a CSS color` error, and this doesn't show up in `npm run check` — only
  when Shopify actually renders/validates the live settings data. After changing any client's
  placeholder colors, run `npm run tokens && node scripts/seed-settings.mjs --force` and confirm
  `config/settings_data.json`'s `color_palette` values are still hex before assuming it's fine.
- `.shopifyignore` must **not** exclude `snippets/vite-tag.liquid` — it's generated (correctly
  gitignored), but the live theme still needs it present to serve any `{% render 'vite-tag' %}`
  call. It was excluded early on with no ill effect only because nothing rendered it yet.
- `vite-plugin-shopify`'s `versionNumbers` must be `true` in `vite.config.js`. With it `false`,
  generated asset URLs have no cache-busting query string, and Shopify's CDN can serve a
  permanently stale cached JS/CSS file across edits with no visible error — this cost a long
  debugging session before the cause was found.
- `assets/.vite/*` (glob, not the bare directory name) must be in `.shopifyignore`, or Shopify
  CLI fails to push with "Theme files may not be stored in subfolders."
- **Don't pass a filtered expression directly as a `{% render %}` parameter value** — e.g.
  `{% render 'x', level: level | plus: 1 %}` is a `LiquidSyntaxError` under Shopify's strict
  parser, even though it looks like valid Liquid and passed our own per-file
  `mcp__shopify-dev__validate_theme` checks without complaint. Only the full `shopify theme
  check` CLI (`npm run check`) caught it — a real gap between the two validation methods, not
  just a style nit. `{% assign next_level = level | plus: 1 %}` first, then pass the plain
  variable to `render`. Always run the full `npm run check` at least once per change, not just
  per-file MCP validation, since they don't always agree.

## Git workflow

- Feature branches for real chunks of work, e.g. `header-component` (already the pattern used).
  General/tooling fixes going straight to `main` is a case-by-case call the user makes
  explicitly, not a default — ask rather than assume either way.
- Run `npm run check` (zero offenses) before opening a PR or asking to commit, not after —
  reviewers shouldn't hit avoidable Theme Check errors.
- Commit messages: imperative mood, describe the actual change
  ("Build header: navigation, mobile drawer, cart, search, localization"), not a vague summary.
  Omit the `Co-Authored-By` trailer when the user asks — their call each time, not a standing
  default to assume from one past instance.
- Never commit `config/settings_data.json` carelessly — it holds live merchant customizations.
  This project's `npm run seed`/`pull:settings` scripts are the deliberate sync strategy for it
  (see the multi-client tooling section above); don't gitignore it reflexively the way a generic
  guide might suggest — that would break the tooling this project already has for exactly this.
