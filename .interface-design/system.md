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

On a phone one number frames everything: `--page-gutter` is **12px** and the
header padding, the page padding, and the gap between panels all use it, so the
content sits in a single consistent margin instead of three competing ones.

## Phone

The switch is at **48rem (768px)**. Below it the sidebar is gone and the tab bar
is the whole navigation; at and above it nothing changes from the desktop layout.

- **Bottom tab bar** (`.mobile-tabbar`) — Dashboard · Transactions · Budget ·
  Accounts · More. Fixed, on the **canvas** (`--background`) like the sidebar, one
  hairline top rule, `env(safe-area-inset-bottom)` under it. Active is the
  sidebar's **muted fill** — one active language across both navigations. Labels
  10/500 → 10/600 ink when active. Tabs are 44px tall.
- **More** opens a bottom sheet with the remaining routes and a Settings group,
  15px rows at 44px. It closes on navigation and when the viewport grows past
  the breakpoint.
- **Main** clears the bar: `padding-bottom: tabbar + safe-area + 24px`.
- **`viewport-fit=cover`** in the root meta, or `env(safe-area-inset-*)` is 0.

### Receipt-stub ledger

Below **64rem** the transactions table folds into a 2×2 stub per row —
merchant + amount on the top line, category + account demoted to a muted second
line — using the same cells and the same reading order, only different geometry.
The cut is 64rem rather than the tab bar's 48rem because they answer different
questions: the bar asks "is this a phone", the ledger asks "is there room for
four columns beside the sidebar". The table itself is `table-layout: fixed` so
the declared 42/24/20/14 percentages hold and cells truncate instead of pushing
the amount past the panel wall.

### Panel head on a phone

`.panel-trigger` takes `min-width: 60%` and the head wraps. A folded panel still
reads as one row of title + figure when the trailing side is small, and only
breaks onto a second line when a figure, its hint, and a control would otherwise
crush the title into a column of single words.

### Touch

- `.data-row` and `.panel-head` grow to a 44px minimum under `(hover: none)`;
  type and hairlines are untouched, because density is the point.
- Small buttons get a **vertical-only** `::after` hit expansion, so buttons
  sitting side by side in a row can never overlap targets.
- `.row-action` replaces `opacity-0 group-hover:opacity-100`. A touch screen has
  no hover, so those controls would simply never exist; there they rest at 50%.
- The hero figure is `clamp(2rem, 9.2vw, 2.75rem)` — the page's one focal figure
  cannot be the thing that clips.
- Sheets come from the **bottom** on a phone (`side={phone ? 'bottom' : 'right'}`
  via `useMediaQuery(PHONE)`), with a grab handle and real drag-to-dismiss.

## Cascade hazard

`src/styles.css` element and class rules are **unlayered**, and unlayered rules
beat anything in `@layer utilities` whatever the specificity. A Tailwind class on
an element that also matches a rule here silently loses. This is why:

- the base `a { color }` lives in `@layer base` — otherwise every navigation
  label rendered as a link colour despite the class asking for ink;
- `.mobile-tabbar` hides itself with a media query rather than `md:hidden`.

Before adding a plain CSS rule, check whether call sites pass a utility for the
same property.

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

Instrument Sans for brand wordmark and empty-state titles. Inter for UI. Fraunces only on the auth screen.

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
- `EmptyState` — dashed border, Instrument Sans title (borderless inside a panel)
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
| Budget       | Flex pool (6) · Fixed (6) · Non-monthly (6)                                                           |
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
- Hamburger drawer for phone navigation → bottom tab bar in the thumb zone,
  with the six sit-down routes behind More
- Horizontally scrolling the ledger table → the row folds into a stub, because
  the amount is the one column that can't go off-screen
- Shrinking the desktop layout proportionally → the frame changes: one 12px
  gutter, a clamped hero, and panel heads that wrap on their own terms
