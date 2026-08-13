# Bud — Interface System

## Direction & feel

Quiet ledger. Warm paper surfaces, stone ink, calm density. Numbers lead; chrome stays out of the way. Not a trading terminal, not a brochure.

**Who:** someone glancing at money between other tasks.  
**Job:** make the important figure obvious; make dense lists scannable.  
**Signature:** PaceBar (spent fill + “today” tick) + hairline data rows with bold tabular amounts.

## Depth

Borders-only. Two surfaces, one step apart: the page canvas (`--background`) and
panels (`--card`, ~3% lighter). No shadows anywhere. Rows inside a panel stay
hairline — card chrome belongs to the _area_, never the row. Sidebar shares the
canvas background — no tinted “sidebar world.”

## Layout

Every route runs **full width** — no `mx-auto`, no page max-width. Panels compose
on a **12-column grid** at `xl` and stack to one column below it.

Page shape: `Page` → `PageSummary` (hero + counterweights, closed with a
hairline) → optional toolbar → `PageBody` (the panel grid).

Panels hug their content (`items-start`) rather than stretching to a shared row
height — a three-row card next to a twenty-row card should not be twenty rows of
empty space.

## Spacing

Base unit: **4px**. Common values: 8 / 12 / 16 / 24 / 32.  
Dense rows: `py-2.5` (10px). Panel padding: **12px**. Gap between panels: **16px**
— the walls separate now, so the 32–40px section gap is gone. Page padding: `px-8`.

## Hierarchy

Type scale ratio ~1.25 from 13px body.

| Role        | Size    | Weight                         | Color           |
| ----------- | ------- | ------------------------------ | --------------- |
| Kicker      | 11px    | 600 · tracked                  | muted           |
| Body / row  | 13px    | 400–500                        | sea-ink / muted |
| Panel title | 13px    | 600                            | sea-ink         |
| Page title  | 15px    | 600                            | sea-ink         |
| Stat        | 22px    | 600 · tabular                  | sea-ink         |
| Hero figure | 2.75rem | 700 · tabular · tight tracking | sea-ink         |

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

### Page & panel primitives (`src/components/panel.tsx`)

- `Page` — full-width column, `gap-4`
- `PageSummary` — hero left, counterweights right, hairline underneath. The hero
  never goes inside a panel: as a peer of the data cards it stops leading.
- `PageBody` — the 12-column panel grid
- `Panel` — a data area with its own walls

`Panel` props: `id` (persistence key), `title`, `description`, `value`, `hint`,
`tone`, `action`, `span` (3–8 or 12), `collapsible`, `defaultCollapsed`, `flush`.

- **Collapsible by default.** Folded, a panel is a 40px row of title + figure, so
  a page squeezes down to an index of answers. The choice persists per panel in
  `localStorage` (`bud.panel.<id>`).
- **Chevron left, inside the trigger button**; `value` / `hint` / `action` live
  outside it on the right, so the trailing figure lines up with the amount column
  below. Header hit area is the full 40px row.
- **`flush`** for hairline lists and the ledger: content runs to the walls, the
  header's rule becomes the list's top rule, rows take 12px inline padding. A row
  that is itself a link takes the padding instead of its `li`, so the hover fill
  still reaches the walls.
- Folding animates `grid-template-rows: 0fr → 1fr`; `overflow: clip` (never
  `hidden`) so the ledger's sticky header survives.

### Dense primitives (`src/components/dense.tsx`)

- `Kicker` — uppercase meta label
- `HeroMetric` — kicker + hero figure + meta
- `Stat` / `MiniStat` — secondary metrics
- `DataList` — hairline list
- `RowGroupHeader` — quiet subhead inside a long list
- `RowTitle` / `RowMeta` — primary/secondary row lines
- `ShareBar` — hairline magnitude bar
- `EmptyState` — dashed border, Fraunces title (borderless inside a panel)
- `CategoryDot` — 8px color swatch

### Taxonomy list (`settings/categories`)

For taxonomies rather than ledgers — many short names, no money.

- **The repeated field becomes the section.** Budget type was a word on every
  row; it's now 5 section headers (Flex / Fixed / Non-monthly / Income /
  Transfers). Never repeat a value on every row when it can group them.
- **One family = one hairline.** Parent + children share a single `li` so the
  eye jumps family → family. Children are a tight stack under the parent
  (`mt-1 space-y-0.5 pl-5`, 12/400 muted) — no second column of dots, no
  connector rails.
- **Three tiers:** section 15/600 · parent 13/500 ink + colour dot ·
  child 12/400 muted.
- **Add in place.** Section header `+ Add` opens a name-only composer at the
  top of that section (type implied). Parent-row `+` (hover/focus) opens a
  composer under that family (parent + colour + type implied). One composer
  open at a time. Escape cancels; Enter submits. No bottom-of-page form.
- Page width `sm`. No section counts — the list is the answer.
- Filter input `w-[220px]` with an inset `size-3.5` search glyph at `left-2.5`.

### Page composition per route

Spans are chosen so a row of panels fills the 12 columns and each area gets the
width its rows actually need.

| Route        | Panels                                                                                                |
| ------------ | ----------------------------------------------------------------------------------------------------- |
| Dashboard    | Needs you (12) · Where it's going (5) · Recent (7)                                                    |
| Transactions | Ledger (12), flush                                                                                    |
| Budget       | Flex pool (4) · Fixed (5) · Non-monthly (3)                                                           |
| Cash flow    | one panel **per budget type** (4 each)                                                                |
| Net worth    | Trend (12) · Assets (6) · Debts (6)                                                                   |
| Investments  | Allocation (4) · Holdings (8)                                                                         |
| Accounts     | Needs attention (12) · one panel per account type (6) · Hidden & closed (6, folded) · Connections (6) |
| Categories   | one panel per budget type (4 each)                                                                    |

Cash flow's grouping used to be a subhead buried inside one list; it's the axis
people compare across, so it became the panel.

### CSS helpers (`src/styles.css`)

- `.panel`, `.panel-head`, `.panel-trigger`, `.panel-content-flush`
- `.kicker`, `.hero-figure`, `.data-list`, `.data-row`
- `.ledger-table` — transactions table
- `.toolbar` — filter/action row
- `.amount-cell` — tabular bold amounts
- `.range-pill` — net-worth range chips

### Controls

Inputs/selects: inset `bg-muted/40`, no hard shadow; focus lifts to `bg-background` + ring.

### PaceBar

`h-1.5` track · lagoon fill · amber when ahead of pace · destructive when over · 1px today tick.

### Ledger table

Four columns: merchant / category / account / amount (42 / 24 / 20 / 14). The
amount is already a comparable tabular figure — a magnitude bar next to it
looked like unlabeled progress and collapsed to a sliver against any large
inflow. ShareBar stays on accounts, cash flow, and net worth, where the
denominator is a real total (limit, category spend, holdings).

### Nav

212px sidebar · collapses to 56px icon rail · active = muted fill (not lagoon tint) · 13px medium labels · Settings kicker group · collapse toggle in brand row (ghost icon-xs) · tooltips on icons when collapsed · preference in `localStorage` (`bud.sidebar-collapsed`).

### Shell

Document scroll · sticky `h-dvh` sidebar · sticky header (`.app-shell-header`, 3rem, opaque `--background`, no border — content clips at its edge, no frost or fade) · page title 15/600 · main `px-8 pt-4 pb-10`.

## Rejected defaults

- Centered max-width columns, four different widths → full width, one grid
- 40px of air as the only thing separating sections → panels with walls
- Cards nested inside cards (attention bands inside a panel) → the band gives up
  its box and keeps only its severity rule
- One flexible column swallowing all the new width → percentage columns
- Magnitude bars in the ledger (looked like unlabeled progress; the amount
  already compares) → bars only where the denominator is a real total
- Equal-height cards in a row → panels hug their content
- `overflow: hidden` to animate a fold → `clip`, which keeps sticky alive
- Counts on section headers → the list is the answer
- Equal metric-card grids → hero figure + quieter secondary
- Card chrome on every list _row_ → hairline rows inside one panel
- Flat table type → merchant + amount hierarchy
- Cool mint SaaS chrome → warm paper ledger
- A field repeated on every row → that field becomes the section
- Connector rails / tree lines for nesting → weight + indent inside one family
- Multi-column masonry for a taxonomy → single scannable list
- Add form parked at the bottom of the page → composer opens where the item lands
- Inventing a hero figure for a page with no money on it → no hero at all
