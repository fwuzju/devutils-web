# AGENTS.md — guidance for AI agents working in this repo

## What this is

`devutils-web/` is a fully offline developer toolbox (DevUtils.app replica) built with **vanilla HTML/CSS/JS only**. Hard constraints:

- **No frameworks, no build step, no bundler, no npm.**
- **No network requests at runtime** — no CDN links, no fetch/XHR to external hosts. Any library must be vendored into `js/vendor/` (MIT-compatible license) and referenced with a local `<script src>`.
- **Must work over `file://`** — use plain `<script>` tags, never ES modules; avoid features that require a server (the app must also work behind `python3 -m http.server`).
- Runtime targets modern Chrome/Safari/Firefox. `crypto.subtle` / `crypto.randomUUID` are fine (file:// is a secure context there).

## Architecture

- `index.html` — shell. Every JS file is wired with an explicit `<script src>` tag; **when adding a tool file you must add its script tag here** (vendor scripts before tools, `js/app.js` last).
- `js/registry.js` — global `window.DevUtils`:
  - `DevUtils.registerTool({ id, name, group, icon, desc?, detect?, render, setInput? })` — the only API a tool needs. `id` must equal its filename without `.js`.
  - `DevUtils.ui` — shared UI helpers: `el(tag, attrs, children)` (attrs supports `class`/`text`/`html`/`onclick`...), `textarea()`, `button()`, `copyButton(getTextFn)`, `toolbar()`, `field()`, `status()` (returns `{el, error, ok, clear}`), `sectionTitle()`.
- `js/app.js` — sidebar/search/theme/hash-routing/smart-detect. Calls `tool.render(container)` and `tool.setInput(text)` as **methods** (`this` binding is available inside tool defs).
- `css/app.css` — theme variables (`html[data-theme="dark"]`) plus shared component classes, all prefixed `du-`: `.du-input`, `.du-btn(.-primary)`, `.du-toolbar`, `.du-field`, `.du-status(-error/-ok)`, `.du-section-title`, `.du-grid-2`, `.du-output-box`, `.du-card`, `.du-kv` (with `<dt>/<dd>`), `.du-table`, `.du-diff-add/-del`, `.du-hl`, `.du-swatch`.

Group names are matched exactly by the sidebar ordering in `app.js` (`GROUP_ORDER`): `Formatters`, `Encoders / Decoders`, `Converters`, `Generators`, `Inspect / Debug`. Reuse one of these or add the new group to `GROUP_ORDER`.

## How to add a new tool

1. Create `js/tools/<tool-id>.js` as an IIFE:
   ```js
   (function () {
     const { registerTool, ui } = window.DevUtils;
     registerTool({
       id: '<tool-id>',           // == filename without .js
       name: 'Display Name',
       group: 'Converters',        // exact group name
       icon: '🧪',
       detect(text) { return 0; }, // optional, 0..1 confidence for smart detection
       render(container) { /* build UI with ui.* helpers */ },
       setInput(text) { /* optional: fill main input & process */ }
     });
   })();
   ```
2. Add `<script src="js/tools/<tool-id>.js"></script>` to `index.html`.
3. Use only `DevUtils.ui` helpers and existing `du-*` CSS classes; avoid `<style>` blocks and inline styling beyond trivial tweaks. Errors go through `ui.status`, never `alert()`.
4. If the tool needs a library, vendor it into `js/vendor/` (check license) and add its script tag **before** the tool scripts.

## Conventions

- Match the existing code style: 2-space indent, single quotes, semicolons, `const`/`let`.
- No comments that restate the code; keep header comment to one line describing the tool.
- Inputs should process live (input event, debounce ~200ms for heavy work) or via explicit buttons for one-shot operations. Every tool with textual output should offer `ui.copyButton`.
- Guard against huge inputs (caps/limits) so the UI can't be frozen by a paste bomb.
- If a tool starts timers/observers, clean them up when its container leaves the DOM (see `unix-time.js`).

## Verification (no test framework — ad hoc Node checks)

```bash
# 1. syntax-check all JS
for f in devutils-web/js/*.js devutils-web/js/tools/*.js; do node --check "$f"; done

# 2. registration + render smoke test under a fake DOM:
#    reuse / extend the harness pattern — load registry.js + tool files in Node
#    with stubbed document/window, then call render() on every registered tool.

# 3. serve and curl all resources
cd devutils-web && python3 -m http.server 8000 &
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8000/
```

Browser APIs in files are fine for `node --check`; only logic needs Node-runnable verification. If you change a tool's behavior, re-run at least the syntax check and a targeted Node assertion of the changed logic.

## Housekeeping

- Keep `README.md`'s tool table and this file in sync when adding/removing tools.
- Don't commit `.DS_Store` (already in `.gitignore`).
