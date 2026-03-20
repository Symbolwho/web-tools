# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common commands

- `pnpm install` — install dependencies
- `pnpm dev` — start the Vite dev server
- `pnpm build` — run TypeScript build (`tsc -b`) and create a production Vite build
- `pnpm lint` — run ESLint across the repo
- `pnpm preview` — serve the production build locally

## Test status

- There is currently **no test script or test runner configured** in `package.json`.
- There is therefore **no single-test command** available in the current codebase.
- There is also no standalone typecheck script; use `pnpm build` when you need TypeScript validation.

## High-level architecture

- This is a **client-only React 19 + Vite app**. There is no backend or API layer in the repository; the tool runs entirely in the browser.
- `src/main.tsx` is the app bootstrap. It renders `App` inside three global providers:
  1. `ThemeProvider` from `next-themes` for light/dark/system mode (`storageKey: web-tools:mode`)
  2. `ThemeColorProvider` for the custom accent palette via `data-color-theme`
  3. `I18nProvider` for locale state and translated UI strings
- `src/App.tsx` is the main application shell and owns nearly all stateful behavior. The important model is:
  - `source` is the **single source of truth** for the editable JSON text
  - toolbar actions (`format`, `minify`, `unescape`, `escape`) all transform and write back to `source`
  - the right-hand JSON tree is **derived** from whether `source` parses successfully
  - saved records, transform history, sidebar collapse state, and error display are all managed here
- Persistence is entirely **localStorage-backed**. Important keys include:
  - `web-tools:source`
  - `web-tools:history`
  - `web-tools:records`
  - `web-tools:records-sidebar-collapsed`
  - locale/theme keys managed by the providers
  When changing state initialization, keep the existing SSR-safe `typeof window === "undefined"` guards.
- `src/lib/json-tools.ts` contains the pure JSON transformation/parsing logic. Keep business logic here rather than moving it into UI components. `parseJsonValue` is intentionally reused by both `App` and `JsonOutput` so parsing behavior stays consistent.
- `src/components/json-output.tsx` is a read-only recursive renderer for valid JSON strings. It parses the provided string, renders collapsible tree nodes, and falls back to placeholder content for invalid/empty input. It should not become a second source of truth.
- `src/components/settings-surface.tsx`, `src/lib/i18n.ts`, and `src/lib/theme.tsx` together implement settings:
  - locale switching is dictionary-based with typed `MessageKey`s
  - display mode is handled by `next-themes`
  - color theme is custom and applied by mutating `document.documentElement.dataset.colorTheme`
  If you add UI copy, update both locales and keep the message keys in sync.
- Styling is driven by CSS variables in `src/index.css` and mapped into Tailwind tokens in `tailwind.config.ts`. Theme/color changes happen by mutating root classes/data attributes, not by swapping component-specific palettes.
- `src/components/ui/*` contains shadcn/radix-style primitives. Prefer reusing those components before introducing new custom primitives.
- The repo uses the `@` alias for `src` (`vite.config.ts`, `components.json`), so imports should generally use `@/components`, `@/lib`, etc.

## Project-specific notes

- The current UI is organized around a **left records sidebar** plus a main editor/tree workspace. If you change layout or behavior, preserve the invariant that the editable `source` text remains the only mutable JSON document.
- `pnpm build` currently succeeds but may emit **non-fatal lightningcss warnings** about `@theme`, `@utility`, and `@custom-variant` from imported shadcn/tailwind CSS. Treat those as existing build noise unless you are explicitly changing the CSS toolchain.
- ESLint uses the flat config in `eslint.config.js` and disables `react-refresh/only-export-components` only for `src/components/ui/**/*.tsx`.
