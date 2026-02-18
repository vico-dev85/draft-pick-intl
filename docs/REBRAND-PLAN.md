# PickNKick — Complete Rebrand Plan

> Based on 6 independent research studies. Every change is research-backed.
> Last updated: February 2026

---

## Part 1: Brand Identity

### Name
**PickNKick** (was "Draft Pick")
- Domain: picknkick.com (owned)
- Scores: Memorability 8/10, Uniqueness 8/10, App Store Clarity 9/10, Domain 10/10
- 9 characters — fits mobile home screen without truncation
- "Kick" works beyond soccer: "kick off", "kick-start" — multi-sport safe enough
- Source: Research 01 (Naming)

### Tagline
**"Fair teams. No arguments."**
- Pairing confirmed by naming research — complements the playful name with a clear promise

### Personality
Fair, fast, fun, social, premium.
Tone: 70% casual, 60% playful, 65% enthusiastic. Confident but not arrogant.

---

## Part 2: Design System

### Color Palette

**Why change from emerald**: Emerald green is WhatsApp's color (brand confusion in the #1 distribution channel), associated with specific soccer clubs (Celtic, Mexico, Seattle), and creates visual monotony when used on every screen. Purple is club-neutral, WCAG-compliant, and immediately distinctive in WhatsApp previews.

Source: Research 02 (Color Palette)

#### Core Tokens

| Token | Light Mode HSL | Dark Mode HSL | Hex (Light) | Usage |
|---|---|---|---|---|
| `--primary` | `263 70% 58%` | `263 70% 65%` | `#7C3AED` | CTAs, active states, brand identity |
| `--secondary` | `263 60% 80%` | `263 55% 68%` | `#C4B5FD` | Secondary buttons, hover states |
| `--accent` | `82 85% 55%` | `82 85% 62%` | `#A3E635` | High-energy CTAs, success, lime pop |
| `--background` | `260 20% 98%` | `240 15% 6%` | `#F8F7FF` / `#0F0F11` | Page backgrounds |
| `--card` | `0 0% 100%` | `250 20% 12%` | `#FFFFFF` / `#1E1B2E` | Card surfaces |
| `--muted` | `260 20% 95%` | `250 15% 16%` | `#F3F0FF` / `#2A2640` | Disabled, subtle surfaces |
| `--foreground` | `240 20% 10%` | `0 0% 95%` | `#161524` / `#F2F2F2` | Primary text |
| `--border` | `260 15% 88%` | `250 15% 20%` | `#DDD6F3` / `#2F2B3D` | Borders |
| `--ring` | `263 70% 58%` | `263 70% 65%` | `#7C3AED` | Focus rings |
| `--destructive` | `0 84% 60%` | `0 70% 50%` | — | Red (unchanged) |
| `--captain` | `45 93% 47%` | `45 90% 55%` | `#FBBF24` | Captain gold (unchanged) |
| `--success` | `82 85% 55%` | `82 85% 62%` | `#A3E635` | Now lime (was emerald) |
| `--warning` | `38 92% 50%` | `38 85% 55%` | — | Orange (unchanged) |

**Key design choice**: Surfaces have a subtle purple tint (`#F8F7FF` not `#FFFFFF`, `#1E1B2E` not `#1A1A1A`). This creates subconscious brand cohesion — everything feels "PickNKick" even when purple isn't visible.

#### Gradients

| Token | Value |
|---|---|
| `--gradient-primary` | `linear-gradient(135deg, hsl(263 70% 58%), hsl(263 70% 45%))` |
| `--gradient-secondary` | `linear-gradient(135deg, hsl(263 60% 80%), hsl(263 60% 70%))` |
| `--gradient-accent` | `linear-gradient(135deg, hsl(82 85% 55%), hsl(82 85% 45%))` |
| `--gradient-hero` | Light: `180deg, #F8F7FF → #F0EBFF` / Dark: `180deg, #0F0F11 → #1E1B2E` |

#### Shadows (purple-tinted)

| Token | Light | Dark |
|---|---|---|
| `--shadow-card` | `0 4px 20px -4px hsl(263 70% 58% / 0.10)` | `0 4px 20px -4px hsl(0 0% 0% / 0.4)` |
| `--shadow-button` | `0 4px 14px -3px hsl(263 70% 58% / 0.30)` | `0 4px 14px -3px hsl(263 70% 65% / 0.4)` |
| `--shadow-glow` | `0 0 30px hsl(263 70% 58% / 0.25)` | `0 0 30px hsl(263 70% 65% / 0.35)` |

#### Animations (recolored)

| Animation | Old Color | New Color |
|---|---|---|
| `pulse-glow` keyframes | `hsl(160 84% 39%)` | `hsl(263 70% 58%)` |
| `glow` keyframes | `rgba(16,185,129,...)` | `rgba(124,58,237,...)` |

#### Team Draft Colors (5 teams max)

| Team | Color | Hex | Why |
|---|---|---|---|
| 1 | Blue | `#3B82F6` | Universally neutral, high contrast on both themes |
| 2 | Red | `#EF4444` | Classic sports opposition color |
| 3 | Amber | `#F59E0B` | Warm, distinct from blue/red |
| 4 | Green | `#22C55E` | Nature, vitality — no longer confused with brand |
| 5 | Pink | `#EC4899` | Vivid, distinct from all others |

These replace the current `bg-primary`/`bg-secondary`/`bg-accent` captain colors which will shift with the rebrand. Update in `src/lib/draftUtils.ts`.

#### Player Avatar Colors (8-color palette)

| # | Current HSL | New HSL | Visual |
|---|---|---|---|
| 1 | `160 84% 39%` (green) | `263 70% 58%` (purple) | Brand-aligned |
| 2 | `210 100% 56%` (blue) | `210 100% 56%` (blue) | Keep |
| 3 | `38 92% 50%` (orange) | `38 92% 50%` (orange) | Keep |
| 4 | `280 70% 55%` (purple) | `82 85% 55%` (lime) | Swap — purple is now brand |
| 5 | `340 80% 55%` (pink) | `340 80% 55%` (pink) | Keep |
| 6 | `180 70% 45%` (cyan) | `180 70% 45%` (cyan) | Keep |
| 7 | `15 85% 55%` (red-orange) | `15 85% 55%` (red-orange) | Keep |
| 8 | `260 60% 50%` (deep purple) | `160 70% 45%` (teal) | Swap — too close to new brand |

---

### Typography

**Why change**: Inter alone is "zero brand distinction" — half the web uses it. A distinctive heading font adds personality at large sizes while Inter stays for proven body readability.

Source: Research 04 (Typography)

| Role | Font | Weight | Usage |
|---|---|---|---|
| Display | Satoshi Black | 900 | Landing hero, draft titles, large headlines |
| Heading | Satoshi Bold | 700 | Page titles, section headings, card headers |
| Body | Inter Regular | 400 | All content text, descriptions |
| Body emphasis | Inter Medium | 500 | Labels, bold inline text |
| Mono | JetBrains Mono | 400 | Room codes, timers, scores |

**Size scale** (maps to Tailwind):

| Token | Size | Tailwind | Used For |
|---|---|---|---|
| Hero | 48px | `text-5xl` | Landing page hero only |
| Title | 32px | `text-3xl` | Page titles |
| Heading | 24px | `text-2xl` | Section headings, room codes |
| Subheading | 18px | `text-lg` | Card titles, prominent labels |
| Body | 14px | `text-sm` | Default body text |
| Caption | 12px | `text-xs` | Timestamps, metadata |
| Timer | 48px+ | `text-5xl font-mono` | Game timer countdown |
| Score | 24px | `text-2xl font-mono` | Game scores |

**Performance**: Satoshi ~50KB (self-hosted via Fontsource), JetBrains Mono ~40KB. Total font budget ~150KB including Inter. Acceptable for PWA.

**Tailwind config additions**:
```
fontFamily: {
  sans: ["Inter", ...fallbacks],
  heading: ["Satoshi", "Inter", ...fallbacks],
  mono: ["JetBrains Mono", "monospace"],
}
```

---

### Spacing & Radius

**Spacing** — 8px base (already close to current, standardize):

| Token | Value | Usage |
|---|---|---|
| xs | 4px (`gap-1`, `p-1`) | Tight gaps within chips |
| sm | 8px (`gap-2`, `p-2`) | Default component gaps |
| md | 16px (`gap-4`, `p-4`) | Card padding, section gaps |
| lg | 24px (`gap-6`, `p-6`) | Major section spacing |
| xl | 32px (`gap-8`, `p-8`) | Page-level spacing |

**Border radius** — consistent scale:

| Token | Value | Tailwind | Usage |
|---|---|---|---|
| sm | 4px | `rounded-sm` | Chips, tags, small elements |
| md | 8px | `rounded-md` | Buttons, inputs |
| lg | 12px | `rounded-lg` | Cards (default) |
| xl | 16px | `rounded-xl` | Modals, panels, bottom sheets |
| 2xl | 24px | `rounded-2xl` | Feature cards, hero elements |
| full | 9999px | `rounded-full` | Avatars, pills |

Current `--radius: 0.75rem` (12px) is already correct for lg. No change needed.

---

### Button Hierarchy

| Variant | Appearance | Usage |
|---|---|---|
| **Primary** | Purple filled (`bg-primary`), white text | Main actions: "Create Draft", "Confirm" |
| **Accent** | Lime filled (`bg-accent`), dark text | High-energy: "Start Draft!", "Share on WhatsApp" |
| **Secondary** | Purple ghost/outline | Secondary: "Cancel", "Back" |
| **Destructive** | Red outline/filled | Destructive: "Delete", "Remove" |
| **Ghost** | Transparent, hover purple/10 | Tertiary: icons, less important |

Currently all primary buttons use `bg-emerald-500 hover:bg-emerald-600`. The new system splits these into Primary (purple) for standard actions and Accent (lime) for energy moments.

---

### Card Patterns

| Context | Style | Classes |
|---|---|---|
| Utility (light pages) | Solid white with purple-tinted shadow | `bg-card rounded-lg shadow-card border border-border` |
| Event (dark pages) | Glassmorphic | `bg-white/10 backdrop-blur-sm rounded-xl border border-white/10` |
| Bottom sheet/drawer | Solid dark surface | `bg-card rounded-t-2xl border-t border-border` |

No change to the pattern — just swap the color tokens underneath.

---

## Part 3: Two Visual Modes

The most impactful design improvement. Currently every page is dark emerald — monotonous, hard to distinguish pages, poor outdoor readability on utility screens.

Source: Research 05 (Visual Design Principles), Principle #7 "Adaptive & Contextual"

### Utility Mode (light, clean, functional)

**Pages**: Auth, Dashboard, Players, CreateDraft
**Background**: `bg-background` (light purple tint `#F8F7FF`)
**Cards**: Solid `bg-card` with `shadow-card`
**Text**: `text-foreground` (dark on light)
**Animations**: Minimal — fade-in only
**Why**: These are "admin" screens. Users add players, browse history, configure settings. They need readability and speed, not atmosphere.

### Event Mode (dark, energetic, immersive)

**Pages**: Landing, WaitingRoom, Results, GameNight, NightResults
**Background**: Dark gradient (`from-purple-900 via-purple-800 to-purple-950` or CSS variable equivalent)
**Cards**: Glassmorphic `bg-white/10 backdrop-blur-sm border border-white/10`
**Text**: `text-white` / `text-white/70`
**Animations**: Full energy — glow, pulse, crowd sounds
**Why**: These are "game day" screens. The draft is an event — it should feel like one.

### DraftBoard — Stays Light

The DraftBoard already uses `bg-gray-100` — this was an intentional decision for readability during the critical gameplay moment. Research confirms this is correct. **Do not change it to dark.** Only update the header from `bg-emerald-800` to `bg-purple-800`.

### Transition Experience

The visual mode shift IS the feature:
1. User sets up draft (light, calm) →
2. Enters WaitingRoom (dark, anticipation builds) →
3. Draft happens (light, focused gameplay) →
4. Results revealed (dark, celebration) →
5. Game night (dark, stadium atmosphere)

This emotional arc is better than "everything looks the same."

---

## Part 4: Page-by-Page Changes

### Format
For each page: **Current** → **New** → **What stays** → **Why better**

---

### 1. Landing Page (`src/pages/Landing.tsx`)

**Current**: `bg-emerald-900`, gradient `from-emerald-800 to-emerald-950`, background photo + dark overlay. Hero text in Inter. CTA button `bg-emerald-500`.

**New**:
- Background: `bg-purple-900`, gradient `from-purple-800 to-purple-950`
- Hero title: Add `font-heading` (Satoshi Black)
- Tagline accent: `text-emerald-400` → `text-lime-400` (accent color)
- CTA button: `bg-emerald-500 hover:bg-emerald-600` → `bg-accent hover:bg-accent/90` (lime — energy!)
- Focus rings: `focus:border-emerald-400 focus:ring-emerald-400/20` → `focus:border-purple-400 focus:ring-purple-400/20`
- Join code input stays translucent (`bg-white/10`)

**What stays**: Layout, background images, fade-in animation, join-code section, LanguagePicker position.

**Why better**: Purple gradient is distinctive (won't be confused with WhatsApp). Satoshi heading adds brand personality. Lime CTA button pops against dark purple (higher contrast than emerald-on-emerald). Background photos still work over purple gradient.

---

### 2. Auth Page (`src/pages/Auth.tsx`)

**Current**: Dark emerald gradient. Auth form on dark background with `bg-white/10` inputs.

**New**: **Switch to Utility Mode (light)**
- Background: `bg-background` (light purple tint)
- Remove dark gradient and overlay layers
- Form card: `bg-card rounded-xl shadow-card border border-border p-6`
- Inputs: Standard light-mode inputs (remove `bg-white/10` etc.)
- Tab buttons: `bg-emerald-500 text-white` → `bg-primary text-white`
- Submit: `bg-emerald-500` → `bg-primary`
- Links: `text-emerald-400` → `text-primary`

**What stays**: Form structure, validation, Google OAuth button, tab switching logic.

**Why better**: Auth is a utility screen — dark background with tiny white text is hard to read outdoors. Light mode is standard for auth flows (Google, Stripe, most apps). Purple accents maintain brand presence.

---

### 3. Dashboard (`src/pages/Dashboard.tsx`)

**Current**: Dark emerald gradient. Cards with `bg-black/30 backdrop-blur-sm`. White text throughout.

**New**: **Switch to Utility Mode (light)**
- Background: `bg-background`
- Remove gradient layers
- Header: light with border-b, dark text
- Cards: `bg-card rounded-xl shadow-card border border-border p-4`
- Buttons: `bg-emerald-500` → `bg-primary`
- Status badges: `bg-emerald-500/20 text-emerald-300` → `bg-primary/10 text-primary`
- Success icons: `text-emerald-400` → `text-accent` (lime)
- Onboarding modal: `bg-emerald-900` → `bg-card`
- Onboarding step numbers: `bg-emerald-500/20` → `bg-primary/10`, `text-emerald-400` → `text-primary`

**What stays**: Profile card layout, draft history accordion, join code input, create draft CTA, onboarding walkthrough flow.

**Why better**: Dashboard is the most-used utility screen. Light background makes the card grid scannable. Purple highlights draw attention to actions. Outdoor readability dramatically improved.

---

### 4. Players (`src/pages/Players.tsx`)

**Current**: Dark emerald gradient. Player list on dark background. FAB and drawers in emerald.

**New**: **Switch to Utility Mode (light)**
- Background: `bg-background`
- Player rows: Light cards with border, hover state
- FAB: `bg-emerald-500` → `bg-primary`
- Drawers: `bg-emerald-900` → `bg-card`
- Status indicators: `text-emerald-400` → `text-primary` or `text-accent`
- Invite section: `bg-emerald-500/15 border-emerald-400/30` → `bg-primary/10 border-primary/30`
- Category badges/chips keep their meaning via color but shift emerald→purple

**What stays**: Player list layout, search, categories, invite generation, photo upload, permissions toggle, drawer pattern.

**Why better**: Managing a player roster is admin work — light mode makes long lists readable. Purple highlights for linked/invited players are more distinctive than emerald was.

---

### 5. CreateDraft (`src/pages/CreateDraft.tsx`)

**Current**: Dark emerald gradient. Multi-step wizard with emerald progress indicators.

**New**: **Switch to Utility Mode (light)**
- Background: `bg-background`
- Step indicators: `bg-emerald-500 text-white` → `bg-primary text-white` (completed), `bg-emerald-600` → `bg-primary` (active)
- Selection chips: `bg-emerald-500/20 border-emerald-400` → `bg-primary/15 border-primary`
- Captain selection highlights: same pattern
- Confirm button: `bg-emerald-500` → `bg-primary`

**What stays**: Multi-step wizard flow, player selection grid, captain selection UI, team count selector, confirmation screen.

**Why better**: Draft setup is a form — filling out forms on dark backgrounds is harder. Light mode with purple progress indicators is cleaner and more standard.

---

### 6. WaitingRoom (`src/pages/WaitingRoom.tsx`)

**Current**: Dark emerald gradient. Raffle overlay. Captain connection status.

**New**: **Event Mode (dark purple)**
- Background: `bg-emerald-900` → `bg-purple-900`, gradient to match
- Connected indicator: `bg-emerald-500` → `bg-accent` (lime green — energy!)
- Status text: `text-emerald-400` → `text-accent`
- "All connected" box: `bg-emerald-500/20 border-emerald-500/50` → `bg-accent/20 border-accent/50`
- Connection dot border: `border-emerald-900` → `border-purple-900`
- Copy feedback: `text-emerald-400` → `text-accent`

**What stays**: Raffle overlay, animation timing, connection tracking, room code display, captain cards layout.

**Why better**: WaitingRoom is the anticipation screen — dark + purple glow builds excitement. Lime green "connected" indicators pop against purple (higher contrast than emerald-on-emerald).

---

### 7. DraftBoard (`src/pages/DraftBoard.tsx`)

**Current**: `bg-gray-100` (light). Header: `bg-emerald-800 border-emerald-700`. Emerald loader.

**New**: **Stays light** — only update brand colors
- Header: `bg-emerald-800` → `bg-purple-800`, `border-emerald-700` → `border-purple-700`
- Loader: `text-emerald-600` → `text-purple-600`

**What stays**: Light `bg-gray-100` main area, team columns, player chips, turn banners, pick confirmation modal, all animations.

**Why better**: Minimal change — DraftBoard's light theme is already the right call. Purple header ties it to the brand without disrupting gameplay readability.

---

### 8. Results (`src/pages/Results.tsx`)

**Current**: Dark emerald gradient with decorative pitch lines (`border-white/10`). Glassmorphic team cards.

**New**: **Event Mode (dark purple)**
- Background: `from-emerald-900 via-emerald-800 to-emerald-900` → `from-purple-900 via-purple-800 to-purple-900`
- Pitch lines: Stay `border-white/10` (neutral — works with any dark background)
- Share button: `bg-emerald-600 hover:bg-emerald-700` → `bg-accent hover:bg-accent/90` (lime — share is the #1 CTA)
- Claim CTA section: `from-emerald-500/20 to-emerald-600/20 border-emerald-400/30` → `from-primary/20 to-primary/30 border-primary/30`
- Check icons: `text-emerald-300/400` → `text-accent`
- Bottom sheet: `bg-emerald-900` → `bg-purple-900` (or `bg-card` dark mode)

**What stays**: Team card layout, pitch line decoration, emoji reactions, WhatsApp share logic, claim player sheet.

**Why better**: Results are a celebration moment. Dark purple + lime share button = maximum visual impact. Pitch lines (white/10) are color-neutral and still work.

---

### 9. GameNight (`src/pages/GameNight.tsx`)

**Current**: Dark emerald gradient. Timer, scoring, matchup display.

**New**: **Event Mode (dark purple)**
- Background gradient: emerald → purple
- Timer icon: `text-emerald-400` → `text-accent`
- Start/action buttons: `bg-emerald-500` → `bg-accent` (lime — high energy)
- Score highlights: `text-emerald-400` → `text-accent`
- Game complete text: `text-emerald-400` → `text-accent`
- Bottom sheet: `bg-emerald-900` → `bg-purple-900`

**What stays**: Timer logic, scoring interface, matchup display, goal picker, all game state management.

**Why better**: Game night is peak event mode. Purple atmosphere + lime energy accents for goals/actions.

---

### 10. NightResults (`src/pages/NightResults.tsx`)

**Current**: Dark emerald gradient. Standings, top scorers, claim section.

**New**: **Event Mode (dark purple)**
- Background: emerald gradient → purple gradient
- Win indicators: `text-emerald-400` → `text-accent`
- Claim CTA: `from-emerald-500/20 border-emerald-400/30` → `from-primary/20 border-primary/30`
- Check/user icons: `text-emerald-300` → `text-accent`
- Action buttons: `bg-emerald-500` → `bg-primary` or `bg-accent`
- Bottom sheet: `bg-emerald-900` → `bg-purple-900`

**What stays**: Standings table, top scorers, claim sheet, layout.

---

### 11. Other Pages

**JoinDraft** (`src/pages/JoinDraft.tsx`): Event mode (dark purple). Same pattern as WaitingRoom — this is the "joining the game" moment.

**QuickDraft** (`src/pages/QuickDraft.tsx`): Event mode (dark purple). Quick draft is a game flow.

**AcceptInvite** (`src/pages/AcceptInvite.tsx`): Event mode (dark purple). Invitation is a social/exciting moment.

**Privacy / Terms** (`src/pages/Privacy.tsx`, `Terms.tsx`): Light utility mode. Legal pages should be clean and readable.

---

### 12. Components

**ClubSettings** (`src/components/ClubSettings.tsx`):
- Drawer: `bg-emerald-900` → `bg-card` (dark mode)
- Save button: `bg-emerald-500` → `bg-primary`

**InstallPromptBanner** (`src/components/InstallPromptBanner.tsx`):
- All emerald refs → purple equivalents
- Install CTA: `bg-emerald-500` → `bg-accent` (lime — download is high energy)

**SelfieAvatarEditor** (`src/components/SelfieAvatarEditor.tsx`):
- Drawer: `bg-emerald-900` → `bg-card`
- Buttons: `bg-emerald-500` → `bg-primary`

**Draft components**:
- `PlayerChip.tsx`: `bg-emerald-50/100/500` → `bg-purple-50/100/500`, `ring-emerald-300` → `ring-purple-300`
- `PickAnnouncement.tsx`: `bg-emerald-600` → `bg-primary`
- `TeamColumn.tsx`: `ring-emerald-300 animate-glow` → `ring-purple-300 animate-glow`
- `ConfirmPickModal.tsx`: `bg-emerald-500` in avatar colors → `bg-purple-500`

---

## Part 5: Logo & Wordmark

### Current
- `src/components/ui/logo.tsx`: Soccer ball emoji (⚽) + "Draft Pick" text with CSS gradient
- PWA icons: "DP" initials on emerald circle
- Favicon: "DP" on emerald

### New

**Wordmark**: "PickNKick" in Satoshi Bold, with the "N" optionally in accent color (lime) or slightly tilted for personality. No emoji.

**Icon mark**: Abstract geometric form suggesting connection/fairness — NOT a soccer ball, boot, or club crest. For now, use "PNK" monogram in Satoshi Bold on purple circle as a placeholder until professional logo is designed.

**Implementation**:
```tsx
// logo.tsx — new structure
<div className="flex items-center gap-2">
  {showIcon && <PNKMark size={size} />}
  <span className="font-heading font-bold tracking-tight">
    Pick<span className="text-accent">N</span>Kick
  </span>
</div>
```

**Icon generation** (`scripts/generate-icons.mjs`):
- Change "DP" → "PNK"
- Change emerald circle → purple circle (`#7C3AED`)
- Font: Satoshi Bold (or Inter Bold if Satoshi not available in sharp)

Source: Research 03 (Logo)

---

## Part 6: Implementation Order

Each phase is independently testable and revertible. Build + test after each phase.

### Phase A: CSS Variables (cascades ~60% of UI)
**Files**: `src/index.css`
**Changes**: Swap all HSL values in `:root` and `.dark` — primary, secondary, accent, gradients, shadows, glow animations, player avatar color #1 and #4/#8
**Risk**: Low — CSS variable cascade means most `bg-primary`, `text-primary`, etc. update automatically
**Verify**: `npm run build`, visual check of pages that use semantic colors

### Phase B: Font Integration
**Files**: `src/index.css`, `tailwind.config.ts`
**Changes**: Add Satoshi + JetBrains Mono imports, add `font-heading` and `font-mono` families
**Risk**: Low — additive only, no existing styles change
**Verify**: `npm run build`, check that new fonts load

### Phase C: Hardcoded Emerald Cleanup (~190 occurrences)
**Files**: All files listed in Part 4 (20 files)
**Changes**: Mechanical find-replace of emerald-* Tailwind classes
**Mapping**:

| Old | New | Notes |
|---|---|---|
| `bg-emerald-900` | `bg-purple-900` | Dark backgrounds |
| `bg-emerald-800` | `bg-purple-800` | Gradient mid |
| `bg-emerald-950` | `bg-purple-950` | Gradient dark end |
| `bg-emerald-500` | `bg-primary` or `bg-purple-500` | Buttons, active |
| `bg-emerald-600` | `bg-purple-600` | Hover/darker |
| `bg-emerald-500/20` | `bg-primary/20` or `bg-purple-500/20` | Tinted surfaces |
| `bg-emerald-500/30` | `bg-primary/30` or `bg-purple-500/30` | Icon backgrounds |
| `bg-emerald-50` | `bg-purple-50` | Light tints (draft) |
| `bg-emerald-100` | `bg-purple-100` | Selected states |
| `text-emerald-400` | `text-purple-400` or `text-accent` | Accent text |
| `text-emerald-300` | `text-purple-300` or `text-accent` | Icon colors |
| `border-emerald-400` | `border-purple-400` | Focus borders |
| `border-emerald-500` | `border-purple-500` | Selection borders |
| `border-emerald-700` | `border-purple-700` | Header borders |
| `ring-emerald-300` | `ring-purple-300` | Active rings |
| `ring-emerald-400` | `ring-purple-400` | Focus rings |
| `from-emerald-*` | `from-purple-*` | Gradient starts |
| `via-emerald-*` | `via-purple-*` | Gradient mids |
| `to-emerald-*` | `to-purple-*` | Gradient ends |
| `shadow-emerald-500/30` | `shadow-purple-500/30` | Button shadows |

**Decision for each**: `text-emerald-400` on dark pages for success/highlight indicators should become `text-accent` (lime) — this is where the lime accent earns its place. Use `text-primary` (purple) only when it needs to look calm/branded.

**Risk**: Medium — mechanical but touches many files. Must verify each page visually.
**Verify**: `npm run build`, `npm test`, visual check of every page

### Phase D: Typography Application
**Files**: Landing.tsx, key hero/title elements across pages
**Changes**: Add `font-heading` to hero titles, page titles. Add `font-mono` to room codes and timer displays.
**Risk**: Low — additive class additions
**Verify**: Visual check that Satoshi renders at large sizes, Inter at body

### Phase E: Light/Dark Mode Split
**Files**: Auth.tsx, Dashboard.tsx, Players.tsx, CreateDraft.tsx, Privacy.tsx, Terms.tsx
**Changes**: Remove dark gradient wrappers, replace `bg-emerald-900` + overlay with `bg-background`. Update card styles from glassmorphic to solid. Update text from `text-white` to `text-foreground`.
**Risk**: Medium-high — most visual change. Each page needs careful attention.
**Verify**: Visual check of each converted page in both normal and outdoor-brightness scenarios

### Phase F: Logo & Name
**Files**: `src/components/ui/logo.tsx`, `index.html`, `src/i18n/locales/en/*.json`, `scripts/generate-icons.mjs`, PWA manifest
**Changes**: Update logo component, app name references, meta tags, icon generation
**Risk**: Low — text/asset changes only
**Verify**: Check logo renders in header, landing, favicons load, PWA manifest correct

### Phase G: OG Image (needs design)
**Deliverable**: 1200x630 PNG, dark purple background, PickNKick logo, team columns showing draft results
**Not code**: This needs design work — layout mockup based on actual Results page
**Verify**: Test WhatsApp share preview

---

## Part 7: What We Do NOT Change

These are explicitly out of scope. The rebrand is visual identity only — no feature work.

- **Page layouts** — all current layouts stay as-is
- **Component structure** — JSX hierarchy preserved
- **Animation timing** — all framer-motion and CSS animations keep their duration/easing
- **Sound system** — TTS, crowd effects, all audio unchanged
- **Supabase queries/RPCs** — zero backend changes
- **Auth flow** — PKCE, OAuth, invite tokens all unchanged
- **Routing** — HashRouter, all routes same
- **i18n structure** — only update app name references in translation files
- **Test logic** — only update visual assertions if text/class names changed
- **Multi-team architecture** — captainHelpers.ts, all team logic unchanged
- **DraftBoard light theme** — stays light, only header color changes

---

## Part 8: Safety Guarantees

| Guarantee | How |
|---|---|
| No functionality loss | Zero changes to any `.ts` logic file except draftUtils.ts captain colors |
| Independently revertible | Each phase is a separate commit — revert any phase without affecting others |
| Build passes continuously | `npm run build` after every phase |
| Tests pass continuously | `npm test` after every phase (24 tests) |
| No breaking changes | CSS variable cascade means most changes happen in 1 file |
| Rollback plan | `git revert <phase-commit>` for any phase |

---

## Part 9: Verification Checklist

After full implementation, verify each:

- [ ] Landing page: purple gradient, Satoshi hero, lime CTA
- [ ] Auth: light mode, clean form, purple accents
- [ ] Dashboard: light mode, card grid, purple highlights
- [ ] Players: light mode, player list, purple status indicators
- [ ] CreateDraft: light mode, step wizard with purple progress
- [ ] WaitingRoom: dark purple, lime connected indicators, raffle works
- [ ] DraftBoard: light bg, purple header, all team columns render
- [ ] Results: dark purple, pitch lines visible, share button lime
- [ ] GameNight: dark purple, timer works, scoring works
- [ ] NightResults: dark purple, standings table, claim sheet
- [ ] Logo: "PickNKick" wordmark renders in all sizes
- [ ] PWA icons: PNK on purple circle
- [ ] Favicon: visible in browser tab
- [ ] WhatsApp share: OG image renders (when designed)
- [ ] Room codes: JetBrains Mono renders
- [ ] Timer display: mono font, readable
- [ ] All 24 tests pass
- [ ] Production build succeeds
- [ ] Mobile readability: text readable in outdoor brightness
- [ ] No emerald-* classes remain in codebase

---

## Appendix: Research Sources

| # | Research | Key Finding | File |
|---|---|---|---|
| 1 | Naming | PickNKick — 8-10/10 across all criteria, domain owned | `docs/research/results/PickNKick_ Brand Name Evaluation.docx` |
| 2 | Color Palette | Purple `#7C3AED` + lime `#A3E635`, club-neutral, WhatsApp-distinct | `docs/research/results/Optimal Color Palette for Soccer Draft App.docx` |
| 3 | Logo | Abstract mark, stylized N, PNK monogram, responsive system | `docs/research/results/PickNKick Visual Branding Inspiration.docx` |
| 4 | Typography | Satoshi (headings) + Inter (body) + JetBrains Mono (codes) | `docs/research/results/Font Pairing Evaluation.docx` |
| 5 | Visual Design | 7 principles, adaptive light/dark, standardized components | `docs/research/results/Visual Design Principles.docx` |
| 6 | Growth | WhatsApp viral loop first, 90-day playbook, share templates | `docs/research/results/PickNKick 90-Day Growth Playbook.docx` |
