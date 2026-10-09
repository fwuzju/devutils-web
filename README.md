# DevUtils Web

A fully offline developer toolbox that replicates [DevUtils.app](https://devutils.com/) as a local web app. Pure HTML/CSS/JS — no framework, no build step, no CDN, no network requests. Your data never leaves your machine.

## Quick start

```bash
cd devutils-web
python3 -m http.server 8000
# open http://localhost:8000
```

Or simply double-click `devutils-web/index.html` — it works over `file://` too.

## Features

- **32 tools** across 5 groups (see below)
- **Smart detection** — paste content into the top bar and the app suggests the right tool (e.g. `{"a":1}` → JSON Formatter, `eyJ...` → JWT Debugger, a unix timestamp → Unix Time Converter), then jumps there with the input filled in
- **Grouped sidebar** with fuzzy search (`⌘K` / `Ctrl+K` to focus)
- **Light/dark theme** — follows system preference, manual toggle, remembered in `localStorage`
- **Hash routing** — refreshing keeps the current tool (`#/json-formatter`)

## Tool list

| Group | Tools |
|---|---|
| Formatters | JSON Format/Validate · HTML Beautify/Minify · CSS Beautify/Minify · JS Beautify/Minify · XML Beautify/Minify · SQL Formatter |
| Encoders / Decoders | Base64 Text · Base64 Image · URL Encode/Decode · HTML Entities · Hex ⇄ ASCII · JWT Debugger |
| Converters | Unix Time Converter · Number Base Converter · Color Converter · YAML ⇄ JSON · JSON ⇄ CSV · Query String ⇄ JSON · HTML → JSX · Case Converter |
| Generators | UUID · Nano ID · Hash (MD5/SHA-1/256/384/512) · Lorem Ipsum · Random String (license-key presets) · QR Code Generator |
| Inspect / Debug | RegExp Tester (with cheat sheet) · Text Diff Checker · String Inspector · Line Sort/Dedupe · HTML Preview · QR Code Reader |

## Project layout

```
devutils-web/
  index.html          # single-page shell (sidebar + main panel)
  css/app.css         # all styles, light/dark via CSS variables
  js/registry.js      # DevUtils.registerTool() + shared UI helpers (DevUtils.ui)
  js/app.js           # routing, sidebar, search, theme, smart detection
  js/vendor/          # js-yaml 4.1 · qrcode-generator 1.4.4 · jsQR 1.4 · md5 (local, MIT)
  js/tools/*.js       # one file per tool, self-registers via DevUtils.registerTool
```

## Design notes

- Plain `<script>` tags (no ES modules) so `file://` works without a server
- Hashes: MD5 via vendored implementation; SHA family via native `crypto.subtle`
- QR generation via `qrcode-generator` (UTF-8 enabled); QR decoding via `jsQR`
- YAML via vendored `js-yaml`; everything else is hand-rolled vanilla JS
- JS/SQL formatters are heuristic (no full parser) — edge-case formatting may differ from native DevUtils

## Verification

Core logic is covered by Node-based smoke tests (run ad hoc, no test framework):

```bash
# syntax-check everything
for f in devutils-web/js/*.js devutils-web/js/tools/*.js devutils-web/js/vendor/md5.js; do node --check "$f"; done
```

QR round-trips have been verified with a real decoder (OpenCV): generation → decode returns the original text, including UTF-8 content.
