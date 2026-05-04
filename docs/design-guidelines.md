# Design Guidelines — AI Translation Platform

> Last updated: 2026-05-04

## UI Framework

- **Tailwind CSS 4** — utility-first, no custom CSS files except globals
- **No component library** — custom components built with Tailwind
- **Dark/Light theme** — CSS variables + Tailwind dark: prefix

## Color System

- Use Tailwind's built-in color palette
- Primary actions: blue-600 (light) / blue-400 (dark)
- Success: green-600 / green-400
- Error: red-600 / red-400
- Background: white/gray-50 (light) / gray-900/gray-800 (dark)

## Typography

- System font stack via Tailwind defaults
- Headings: font-bold
- Body: font-normal, text-sm or text-base
- Monospace: for code/technical content

## Layout

- Mobile-first responsive design
- Max-width container for content areas
- Consistent spacing using Tailwind scale (gap-2, gap-4, p-4, etc.)

## Components

### Web App
- File upload: drag-and-drop zone with progress indicator
- Translation progress: real-time percentage + chunk status
- Settings: grouped sections with clear labels
- Toast notifications for success/error states

### Extension
- Side panel: resizable, scrollable content area
- Popup: compact, action-oriented
- Translation overlay: inline, non-intrusive
- Video subtitles: dual-line display (original + translated)
- API keys section: security warning banner (amber/yellow styling) — "Keys stored locally in browser"

## i18n

- Supported: English (en), Vietnamese (vi)
- Web: next-intl with message files in `messages/`
- Extension: Chrome `_locales/` with `messages.json`

## Accessibility

- Semantic HTML elements
- ARIA labels where needed
- Keyboard navigable
- Sufficient color contrast

## Security UX

- Warning banners for sensitive data (API keys stored locally in browser storage)
- No raw error details shown to users — sanitized messages only
- Generic error messages with optional "Show details" toggle for debugging
- Input validation feedback: inline error messages for invalid language codes, text length limits, provider names
