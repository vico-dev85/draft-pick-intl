# Research Prompt: Logo Design

## Your Task

Define the logo direction for a soccer/football draft app. The logo must work as a responsive system (full logo, icon mark, wordmark) across all sizes from 16px favicon to marketing materials. End with 3 concept directions, each described in enough detail for a designer to execute.

---

## App Context

**Name:** Draft Pick (working title — may change, see naming research)

**What it does:** A live snake draft app for pickup soccer. Captains pick players from their phones in snake order, teams are shared via WhatsApp, game night is tracked with timer/goals/standings.

**Core value prop:** "Fair teams. No arguments."

**Target users:** Casual pickup soccer groups — friends who play weekly, 6-20 players, organize via WhatsApp. International audience.

**Brand personality:**
- Fair — transparent process, randomized order
- Fast — 2-minute setup, instant sharing
- Fun — sound effects, crowd cheers, raffle animation
- Social — WhatsApp-native, club membership
- Premium — smooth animations, stadium-like feel

**Tone:** Casual-confident. 70% casual, 60% playful, 65% enthusiastic.

---

## Current State

- **Logo component:** Soccer ball emoji (⚽) + "Draft Pick" text with CSS gradient — a placeholder
- **App icons:** "DP" initials on emerald circle — a placeholder
- **No designed logo exists**

---

## Technical Requirements

The logo must work as 3 variations:

| Variation | Use Case | Size Range |
|---|---|---|
| **Full logo** | Landing page hero, OG images, marketing | 200px+ wide |
| **Icon mark** | App icon, favicon, social avatar | 16px - 512px |
| **Wordmark** | App header, footer, email | 100px+ wide |

**Specific deliverables needed:**

| Asset | Size | Format | Notes |
|---|---|---|---|
| `favicon.ico` | 32x32 | ICO/PNG | Must be recognizable at tiny size |
| `icon.svg` | Scalable | SVG | Vector source |
| `icon-192.png` | 192x192 | PNG | Android home screen |
| `icon-512.png` | 512x512 | PNG | PWA splash, Play Store |
| `icon-maskable-192.png` | 192x192 | PNG | Android adaptive (safe zone: center 80%) |
| `icon-maskable-512.png` | 512x512 | PNG | Android adaptive |
| `apple-touch-icon.png` | 180x180 | PNG | iOS home screen, no transparency |

**Color constraints:**
- Must work in monochrome (white on dark, dark on light)
- Primary brand color is emerald green `#10B981` (may shift to teal — see color research)
- Must work on both dark and light backgrounds
- Must not rely on color alone for recognition (shape must carry the identity)

---

## What the Logo Should Evoke

**Primary concepts:**
- The moment of **picking/choosing** — a decisive selection action
- **Fairness and balance** — orderly, systematic, structured
- **Energy and competition** — this is game day, not a spreadsheet

**Secondary concepts (subtle, not literal):**
- The pitch — football's universal shared element
- Teams — division into balanced groups
- Movement — draft flow, snake pattern, player assignment

---

## What the Logo Should NOT Be

1. **A soccer ball** — every football app uses one. FotMob, OneFootball, FIFA — all balls. We need to stand out. A ball says "soccer" but doesn't say "draft" or "teams."

2. **A whistle, trophy, or boot** — too literal, clip-art energy.

3. **Anything resembling a club crest/shield** — we are deliberately not a club. We serve all clubs. A crest implies allegiance.

4. **A complex illustration** — the Hebrew version had an elaborate illustrated icon with players, goals, and grass. It breaks at small sizes and doesn't scale.

5. **Just initials** — "DP" on a circle is our placeholder. The final mark should have more concept behind it.

6. **A mascot** — unless it's genuinely brilliant and sport-agnostic. Sleeper's SleeperBot works because it's abstract. But mascots are risky for a utility app.

---

## Competitor Logo Analysis

| App | Logo Type | Description | What Works | What Doesn't |
|---|---|---|---|---|
| **FotMob** | Abstract mark | Stylized "F" in green | Simple, recognizable at any size | Doesn't communicate "scores" |
| **OneFootball** | Geometric wordmark | "1" in a circle + custom type | Clean, modern, scales well | Requires the full word to be understood |
| **Sleeper** | Character mascot | SleeperBot with "S" hair shape | Memorable, works as avatar and icon | Complex, took years to refine |
| **FPL** | Badge/crest | Lion head in purple shield | Premium, authoritative | Crest style = one league, not universal |
| **TeamSnap** | Wordmark + abstract mark | "T" with a swoosh | Simple, functional | Forgettable, generic |
| **Spond** | Geometric | Abstract "S" wave | Modern, clean | Doesn't communicate "sports" at all |

**Observation:** The best sports app logos are **simple geometric marks** that work at all sizes. They communicate brand personality (premium, energetic, modern) rather than literal product function.

---

## Concept Directions to Explore

Explore at least these 3 directions. For each, describe: the visual concept, how it connects to the brand, how it works at 16px and 512px, and a mood/reference.

### Direction A: The Draft Board
A mark based on the draft/tactical board concept — lines, columns, or a grid pattern that suggests team organization. Think: a minimalist clipboard or board divided into sections.

### Direction B: The Pick
A mark based on the moment of selection — a pointing hand, a checkmark, a highlighted player, or a "tap" gesture. Think: the decisive moment of choosing.

### Direction C: The Split
A mark based on the concept of fair division — a circle or shape divided into equal parts, balance scales, or a symmetrical pattern. Think: fairness made visual.

### Direction D: (Your choice)
Propose a fourth direction the researcher thinks is strongest, even if not listed above.

---

## Context: Where the Logo Appears

1. **Phone home screen** — as a PWA icon among other apps. Must stand out at ~60px.
2. **WhatsApp link preview** — in the OG image when sharing results. Small, alongside text.
3. **App header** — 32px tall in the navigation bar. Next to the app name.
4. **Landing page hero** — large, central, first thing visitors see.
5. **WhatsApp message footer** — appears as text: "⚡ Fair teams. No arguments. — Draft Pick"
6. **Browser tab** — 16px favicon alongside the page title.
7. **Social media avatar** — circular crop at 40-80px on Instagram, X, etc.

---

## Deliverable

For each of 3-4 concept directions, provide:
1. **Visual description** — detailed enough for a designer to sketch (shape, proportions, line weight, negative space)
2. **How it scales** — what does it look like at 16px? At 512px? What simplifies?
3. **Color application** — how does the brand color apply? Monochrome version?
4. **Mood references** — name 2-3 existing logos/marks that share the aesthetic (not soccer — from any industry)
5. **Strengths and risks** — what makes it work, what could go wrong

Then: **recommend one direction** with reasoning.
