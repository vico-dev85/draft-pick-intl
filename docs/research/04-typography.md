# Research Prompt: Typography

## Your Task

Determine the optimal font system for a soccer/football draft app. The app is mobile-first, multi-language, and needs to balance readability (during live drafts) with personality (on marketing pages). End with one recommended font pairing.

---

## App Context

**What it does:** Live snake draft for pickup soccer. Captains pick players from phones, teams shared via WhatsApp, game night tracked with timer/goals.

**Core value prop:** "Fair teams. No arguments."

**Target users:** Casual pickup soccer groups worldwide. Ages ~18-45, primarily male, mobile-first.

**Languages:** English (default), Spanish, French, German, Italian, Dutch. All Latin-script, LTR. No CJK, Arabic, or Cyrillic needed in v1.

**Key readability contexts:**
- **Draft board** — players scan a list of 15+ names, pick one quickly. On a phone screen under sunlight or field lights. Readability is critical.
- **Timer** — large countdown numbers during game night. Must be instantly legible.
- **Room codes** — 4-character alphanumeric codes (e.g., "X7KW") that players type in. Must distinguish similar characters (0/O, 1/I/l).
- **Player names** — displayed on small chips, 12-14px. International names with accents (é, ñ, ü, ø).
- **Marketing copy** — landing page hero text at 48px. Needs personality and impact.
- **WhatsApp shares** — formatted plain text. Font doesn't apply here, but the app's visual tone should feel consistent with the casualconfident messaging style.

---

## Current Setup

- **Font:** Inter (variable, weights 300-800)
- **Import:** Google Fonts in `src/index.css`
- **Fallback:** `system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif`
- **Config:** `tailwind.config.ts` → `fontFamily.sans`
- **Old Hebrew font (Heebo):** Completely removed

**Current scale:**

| Element | Size | Weight |
|---|---|---|
| Hero title | 3rem (48px) | 800 |
| Page title | 1.5rem (24px) | 700 |
| Section heading | 1.125rem (18px) | 600 |
| Body text | 0.875rem (14px) | 400 |
| Small/caption | 0.75rem (12px) | 400 |
| Room code | 1.5rem (24px) | 700 |

---

## Why Inter Works

- Purpose-built for screens by Rasmus Andersson
- Variable font = single file, all weights
- Open source (SIL Open Font License)
- 2100+ glyphs — covers all target languages including accented characters
- Excellent x-height for small-screen readability
- Tabular number support (great for scores and timers)
- Widely used → familiar to users, no cognitive friction

## Why Inter Might Not Be Enough

- **Zero brand distinction** — Inter is the default for half the web. It says "modern app" but not "this specific app."
- **No personality at large sizes** — at 48px hero text, Inter is clean but flat. It doesn't generate excitement.
- **Same font everywhere** — one font for marketing AND UI means neither context is optimized.

---

## What Competitors Use

| App | Heading Font | Body Font | Notes |
|---|---|---|---|
| **FotMob** | System/custom sans | System | Content-first, font is invisible |
| **OneFootball** | Custom sans (bold, tight) | System | Headings have personality, body is functional |
| **FPL** | PremierSuite (custom) | System | Custom font = strong brand identity |
| **Sleeper** | Custom geometric | System | Bold headings distinguish brand |
| **TeamSnap** | System | System | Zero font investment |

**Pattern:** Serious sports apps use a **distinctive heading font** paired with **system/Inter body**. The heading font carries personality; the body font carries readability.

---

## Font Options to Evaluate

### Option A: Keep Inter Only (Current)
- Headings: Inter 700-800
- Body: Inter 400-500
- **Pros:** Zero work, proven readability, one font file
- **Cons:** No brand distinction, flat at large sizes

### Option B: Satoshi + Inter
- Headings: Satoshi Bold/Black (geometric with playful tension)
- Body: Inter Regular/Medium
- Mono: JetBrains Mono for room codes
- **Pros:** Modern, trending in tech/sports, open source, excellent pairing
- **Cons:** Additional font load (~30-50KB)

### Option C: Poppins (Single Family)
- All: Poppins Regular-Bold
- **Pros:** Rounder, friendlier, good personality, geometric, open source
- **Cons:** Less sharp than Inter at small sizes, may feel too casual for scores/stats

### Option D: Manrope + Inter
- Headings: Manrope Bold/ExtraBold
- Body: Inter
- **Pros:** Semi-rounded, modern, open source, variable font
- **Cons:** Similar to Inter, may not add enough distinction

### Option E: Space Grotesk + Inter
- Headings: Space Grotesk Bold
- Body: Inter
- **Pros:** Geometric, technical feel, great at large sizes, open source
- **Cons:** Might feel too "tech" and not enough "sport"

### Option F: Plus Jakarta Sans + Inter
- Headings: Plus Jakarta Sans Bold/ExtraBold
- Body: Inter
- **Pros:** Warm geometric, great personality, variable, open source
- **Cons:** Less proven in sports contexts

---

## Research Questions

1. **Does Inter alone provide enough brand identity?** Compare apps that use Inter (generic) vs apps with custom heading fonts (distinctive). Is the font upgrade worth the effort?

2. **Performance impact:** What's the KB cost of adding a second font? For a PWA on mobile networks, does the ~30-50KB matter?

3. **Multi-language rendering:** Do the candidate fonts support French (é, è, ê, ë), German (ä, ö, ü, ß), Spanish (ñ, á, é), Italian (à, è), Dutch (ë, ï)? Any rendering issues?

4. **Monospace for codes:** Room codes are 4 characters. Should they use a monospace font (JetBrains Mono, Fira Code) or is tabular numbers in the heading font sufficient?

5. **The stadium scoreboard test:** Imagine a large timer showing "12:47" and a score "3-2". Which font pairing makes these feel like a live broadcast, not a spreadsheet?

6. **The WhatsApp preview test:** The OG image shows the app name at ~32px. Which heading font creates the strongest first impression?

---

## Constraints

- Must be open source or free for commercial use
- Variable font preferred (single file for all weights)
- Must support Latin Extended (accented characters for all 6 languages)
- Loading from Google Fonts or self-hosted
- Must work with Tailwind CSS font-family system
- Performance budget: total font payload under 100KB

---

## Deliverable

Provide:
1. **Recommended font pairing** — heading font + body font + optional mono
2. **Exact weights to load** — which specific weights and why
3. **Size scale** — recommended sizes for: hero, title, heading, body, caption, timer, score, room code
4. **Performance analysis** — total KB added vs current setup
5. **Visual personality description** — in 2-3 sentences, what does this font combination "feel like"?
6. **Side-by-side comparison** — the top 2 options with specific text samples rendered at key sizes
