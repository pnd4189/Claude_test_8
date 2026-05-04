# Code Standards — AI Translation Platform

> Last updated: 2026-05-04

## Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| Files (TS/JS/Python) | kebab-case | `translation-queue.ts`, `api-key-rotator.ts` |
| React components | kebab-case files, PascalCase exports | `file-upload.tsx` → `FileUpload` |
| CSS classes | Tailwind utility-first | `className="flex items-center gap-2"` |
| Environment vars | UPPER_SNAKE_CASE | `OPENROUTER_API_KEY_1` |
| API routes | kebab-case | `/api/providers/openrouter/models` |
| Store files | kebab-case with `_store` suffix | `provider_store.ts` |

## TypeScript

- Strict mode enabled
- Prefer interfaces for object shapes, types for unions/intersections
- Use `unknown` over `any` — narrow with type guards
- Export named, avoid default exports
- Async: prefer `async/await` over `.then()`

## React

- Functional components only (no class components)
- Hooks at top of component, ordered: state → effects → handlers
- Props via destructured interface
- Colocate related styles (Tailwind inline)
- State: Zustand stores for global, `useState` for local

## File Organization

- Keep files under 200 lines — split into focused modules
- One component per file
- Group by feature/concern, not by type
- Shared utilities in `lib/utils/`
- Types in dedicated `types.ts` files

## Error Handling

- Try/catch at API boundaries and async operations
- User-facing errors: toast notifications (Sonner)
- Internal errors: use `logger` utility (not raw `console.error`)
- API errors: sanitize before returning to clients
- Never expose internal details (provider names, stack traces) to clients
- Never swallow errors silently

## Security

- Validate all external input: language codes (ISO 639), text length, provider names (enum)
- Use `unknown` in catch blocks, narrow with type guards
- Content scripts must validate `sender.id` before processing messages
- API keys never in URL query params — use headers or request body
- EXTENSION_SECRET required for proxy server authentication
- CORS restricted to known extension origins only

## Git

- Conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`
- No AI references in commit messages
- Keep commits focused on single concern
