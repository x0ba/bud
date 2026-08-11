# Bud — Interface System

## Direction & feel

Quiet ledger. Warm paper surfaces, stone ink, calm density. Numbers lead; chrome stays out of the way. Not a trading terminal, not a brochure.

**Who:** someone glancing at money between other tasks.  
**Job:** make the important figure obvious; make dense lists scannable.  
**Signature:** PaceBar (spent fill + “today” tick) + hairline data rows with bold tabular amounts.

## Depth

Borders-only / hairline separation. No card chrome for lists. Sidebar shares canvas background — no tinted “sidebar world.”

## Spacing

Base unit: **4px**. Common values: 8 / 12 / 16 / 24 / 32.  
Dense rows: `py-2.5` (10px). Section rhythm: `gap-8`. Page padding: `px-8`.

## Hierarchy

Type scale ratio ~1.25 from 13px body.

| Role | Size | Weight | Color |
|------|------|--------|-------|
| Kicker | 11px | 600 · tracked | muted |
| Body / row | 13px | 400–500 | sea-ink / muted |
| Section title | 13px | 600 | sea-ink |
| Page title | 15px | 600 | sea-ink |
| Stat | 22px | 600 · tabular | sea-ink |
| Hero figure | 2.75rem | 700 · tabular · tight tracking | sea-ink |

In dense rows: **merchant/name + amount win**; date, account, category demote to muted.

## Color

Warm paper tokens in `src/styles.css`:

- Surfaces: `--background` `#f5f2ea`, `--card` `#fcfaf6`, `--muted` `#ebe6dc`
- Ink: `--sea-ink` `#1c1917`, `--sea-ink-soft` `#57534e`
- Accent (pace/status): `--lagoon` / `--lagoon-deep`
- Inflows: `--palm`
- Warning: amber-700; overspend: destructive

Fraunces only for brand wordmark / empty-state titles. Manrope for UI.

## Component patterns

### Dense primitives (`src/components/dense.tsx`)

- `Kicker` — uppercase meta label
- `HeroMetric` — kicker + hero figure + meta
- `Stat` — secondary metric
- `SectionHeader` — 13px title + optional description/action
- `DataList` / `DataRow` — hairline list
- `RowTitle` / `RowMeta` — primary/secondary row lines
- `PageFrame` — max-width + `gap-8` column
- `EmptyState` — dashed border, Fraunces title
- `CategoryDot` — 8px color swatch

### CSS helpers (`src/styles.css`)

- `.kicker`, `.hero-figure`, `.data-list`, `.data-row`
- `.ledger-table` — transactions table
- `.toolbar` — filter/action row
- `.amount-cell` — tabular bold amounts
- `.range-pill` — net-worth range chips

### Controls

Inputs/selects: inset `bg-muted/40`, no hard shadow; focus lifts to `bg-background` + ring.

### PaceBar

`h-1.5` track · lagoon fill · amber when ahead of pace · destructive when over · 1px today tick.

### Nav

212px sidebar · collapses to 56px icon rail · active = muted fill (not lagoon tint) · 13px medium labels · Settings kicker group · collapse toggle in brand row (ghost icon-xs) · tooltips on icons when collapsed · preference in `localStorage` (`bud.sidebar-collapsed`).

### Shell

Document scroll · sticky `h-dvh` sidebar · sticky header (`.app-shell-header`, 3rem, opaque `--background`, no border — content clips at its edge, no frost or fade) · page title 15/600 · main `px-8 pt-4 pb-10`.

## Rejected defaults

- Equal metric-card grids → hero figure + quieter secondary
- Heavy bordered cards for every list → hairline rows
- Flat table type → merchant + amount hierarchy
- Cool mint SaaS chrome → warm paper ledger
