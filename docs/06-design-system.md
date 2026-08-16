# Design System — Arogya Relay

Status: draft — 16 August 2026

This design system documents the **actual** colors, fonts, spacing, and
components used in the current Arogya Relay build (extracted from
`app/globals.css`). Use it as the single source of truth for visuals.

## Typography

- **Primary font:** Geist Sans — applied via `--font-geist-sans` (fallback
  `Arial, sans-serif`). Used for body, headings, buttons, inputs.
- **Mono / label font:** Geist Mono — applied via `--font-geist-mono`
  (fallback `monospace`). Used for eyebrows, kickers, chart axis, device-screen
  text, diagnostic labels.
- **Scale (observed):**
  - Page H1: `clamp(28px, 3vw, 39px)`, weight ~720, letter-spacing -1.6px.
  - Section H2: ~16–35px depending on context.
  - Eyebrow / kicker: 8–9px, weight 750, letter-spacing .08–.11em, uppercase,
    muted color.
  - Body small (cards/notes): 8–12px.
- **Accessibility:** `prefers-reduced-motion` removes all transitions/animations.

## Color tokens (CSS custom properties)

| Token | Value | Usage |
| --- | --- | --- |
| `--ink` | `#19342d` | Primary text (dark green) |
| `--muted` | `#6f7f79` | Secondary text, labels |
| `--line` | `#dfe7e2` | Borders, dividers |
| `--paper` | `#f5f7f3` | Page background |
| `--white` | `#ffffff` | Cards, sidebar |
| `--forest` | `#17644f` | Primary brand / buttons / active nav |
| `--forest-dark` | `#123e34` | Dark cards (trend, hardware, queue summary) |
| `--mint` | `#dff1e9` | Active nav bg, mint metric icon, soft surfaces |
| `--coral` | `#ed6a4c` | Urgent / alert accent, badges |
| `--coral-soft` | `#fde8e1` | Urgent reading bg, danger avatar, rose metric icon |
| `--amber` | `#c48723` | Warning / "intermittent" indicator |
| `--amber-soft` | `#fbf1db` | Sand metric icon, protocol note bg |
| `--blue-soft` | `#e2eff3` | Blue metric icon bg (icon text `#397284`) |
| `--shadow` | `0 16px 40px rgba(25,52,45,.08)` | Card elevation |

### Semantic tones (used by metric/case components)

- **mint** → bg `--mint`, text `--forest` (neutral/positive)
- **sand** → bg `--amber-soft`, text `--amber` (caution)
- **blue** → bg `--blue-soft`, text `#397284` (info)
- **rose** → bg `--coral-soft`, text `--coral` (alert/referral)

### Status colors (inline)

- Online/synced dot: `#49a073` (green)
- Pending/amber dot: `--amber` `#c48723`
- Urgent coral: `#b84630` / `#b94c35` text on soft bg

## Spacing & layout

- **Sidebar width:** 248px (collapses to 84px at ≤1150px, becomes bottom bar at
  ≤820px).
- **Content max width:** 1480px, centered, padding `28px 34px 40px`.
- **Border radius scale:** 10–12px (buttons, inputs, chips), 15–22px (cards,
  panels, modals).
- **Gap scale:** 12–15px between cards; 9–14px within forms.
- **Grids:** metrics `repeat(4,1fr)`; lower grid `1.8fr 1fr`; signal layout
  `2.25fr .75fr`; diagnostics `repeat(4,1fr)`.

## Components

- **Sidebar:** brand lockup ("AR" mark + name), primary nav (Overview / Case
  queue / Field device), connection card (2G signal), worker card.
- **Top bar:** location kicker + cluster name, date, notifications, primary
  "New screening" button.
- **Notice strip:** status dot + message + sync action (role="status",
  aria-live="polite").
- **Cards:** metric cards, trend card (dark), urgent card, case panel, device
  panel, diagnostics.
- **Buttons:** `.primary-button` (forest), `.dark-button` (white on dark),
  `.secondary-button` (outline).
- **Modal:** screening dialog (role="dialog", aria-modal, focus-trappable via
  backdrop click + close button).
- **Badges / chips:** priority pills (danger/warning), filter chips.

## Accessibility & interaction

- Visible focus ring: `outline: 3px solid rgba(23,100,79,.22)` on interactive
  elements.
- ARIA: `aria-label` on nav, `role="status"`/`aria-live="polite"` on notices,
  `role="dialog"` + `aria-modal` on modal, `aria-label` on icon buttons.
- Color is never the only signal — priority also uses text ("Urgent"/"Review").
- Contrast: forest `#17644f` on paper `#f5f7f3` and white meets AA for large
  text; verify small-text pairs during QA.

## Do / Don't

- **Do** reuse the tokens above; add new shades only with reason.
- **Do** keep health copy non-diagnostic.
- **Don't** introduce a second brand color family or heavy gradients.
- **Don't** rely on color alone to convey urgency.
