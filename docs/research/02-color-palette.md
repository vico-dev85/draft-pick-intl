# Research Prompt: Color Palette

## Your Task

Determine the optimal color palette for a soccer/football draft app. The palette must be neutral enough that fans of any club feel comfortable using it, while still feeling energetic and soccer-connected. End with one recommended palette.

---

## App Context

**What it does:** A live snake draft app for pickup soccer. Captains join via WhatsApp link, pick players from their phones in snake order, share balanced teams via WhatsApp, then optionally track the game night (timer, goals, standings).

**Core value prop:** "Fair teams. No arguments."

**Target users:** Casual pickup soccer groups worldwide. English default, expanding to Spanish, French, German, Italian, Dutch.

**Key interaction moments:**
- Landing page (marketing, first impression)
- Draft board (live picking, high energy, 10-20 minutes of focused use)
- Results page (shared via WhatsApp — this is the viral moment)
- Game night (timer running, goals being scored, 60-90 minutes)

**Distribution:** WhatsApp is primary. Every shared result is a potential conversion. The app's colors appear in the WhatsApp link preview (OG image).

---

## Current Palette

| Role | Hex | Name | CSS Variable |
|---|---|---|---|
| Primary | `#10B981` | Emerald 500 | `--primary` |
| Primary Dark | `#059669` | Emerald 600 | gradient |
| Secondary | `#0EA5E9` | Sky 500 | `--secondary` |
| Accent | `#F97316` | Orange 500 | `--accent` |
| Captain Gold | `#EAB308` | Yellow 400 | `--captain` |
| Destructive | `#EF4444` | Red 500 | `--destructive` |
| Light bg | `#F7FBEE` | Off-white green tint | `--background` |
| Dark bg | `#0F172A` | Slate 950 | `--background` (dark) |
| PWA theme | `#065f46` | Emerald 800 | meta theme-color |

The app is currently **wall-to-wall emerald green** — page backgrounds use emerald-800 to emerald-950 gradients. Landing page is dark emerald. Most pages have dark emerald chrome.

**Team draft colors** (used to distinguish teams during the draft):
- Captain 1: Emerald (primary)
- Captain 2: Sky blue (secondary)
- Captain 3: Orange (accent)
- Captain 4: Orange-600
- Captain 5: Pink-600

---

## The Problem: Soccer Fans Are Color-Tribal

Soccer fans have deep emotional associations with colors because of club rivalries:

**High-danger combinations:**
- Red + White → Arsenal, Liverpool, Man Utd, AC Milan, River Plate, Ajax, Bayern
- Blue + White → Chelsea, Man City, Inter, Lazio, Argentina
- Red + Blue → Barcelona, Crystal Palace, PSG
- Black + White → Juventus, Newcastle, Besiktas
- Blue + Yellow → Boca Juniors, Fenerbahce
- Red + Yellow → Galatasaray, Roma, Spain

**Statistical reality:** White, red, and blue are the top 3 kit colors globally. 63% of English league clubs use red or blue as primary.

**Green specifically:** Celtic, Sporting Lisbon, Palmeiras, Werder Bremen, Saint-Etienne all use green. It's less dangerous than red or blue but not fully neutral. Additionally, our app shares via WhatsApp (also green) — creating potential brand confusion.

**Safe colors:**
- Purple — rarest in football (only Fiorentina at major level)
- Teal/Cyan — almost no club uses it as primary
- Charcoal/dark gray — universally neutral
- Lime/neon green — reads as "UI accent" not "team color"
- Coral/salmon — not used by any major club

---

## What Competitors Do

| App | Primary Color | Strategy |
|---|---|---|
| **FotMob** | Green accent on white | Subtle green, content-first, mostly white space |
| **OneFootball** | Dark gray `#1A1A1A` + Hype Green `#E1FF57` | Neutral base, accent used at max 10% |
| **FPL** | Deep purple `#38003c` + neon lime | Premium, broadcast feel |
| **Sleeper** | Dark purple/blue | Dark-mode-first, premium |
| **EA FC** | Black + shifting accent per mode | Dark, modal |
| **Sorare** | Dark/black + card art | Collector aesthetic |

**Industry trend (2025-2026):** Dark neutral base + vivid accent at 10-15%. Not wall-to-wall color. 68%+ of users prefer dark mode.

**2026 color trends:** Pantone's Color of the Year 2026 is "Transformative Teal." Behr's is "Hidden Gem" (smoky jade). Teal and jade are trending across app design.

---

## Research Questions

1. **Should we keep emerald green as primary?** Evaluate pros (pitch association, FotMob validation, trending jade/teal) vs cons (WhatsApp confusion, some club associations, OneFootball moved away from it).

2. **Dark-first or light-first?** The app has two modes. Should the default be dark (like FPL, Sleeper, OneFootball) or light (like FotMob)? Consider: most usage is outdoors before a game (daytime → light) vs evening games (→ dark). DraftBoard is already light for readability.

3. **Should the primary color change?** Evaluate these specific options:

   | Option | Primary | Accent | Rationale |
   |---|---|---|---|
   | A. Keep emerald | `#10B981` | Current set | Don't fix what works |
   | B. Shift to teal | `#0D9488` | Emerald accents | Close to green but distinct, 2026 trend |
   | C. Go purple | `#7C3AED` | Lime/green | FPL-proven, rarest in football |
   | D. Dark neutral + teal accent | `#1A1A1A` base, `#14B8A6` accent | OneFootball approach | Maximum neutrality |
   | E. Dark neutral + emerald accent | `#1A1A1A` base, `#10B981` at 10% | Preserve green, reduce it | Evolutionary change |

4. **Team draft colors:** Should the 3 team colors (emerald, blue, orange) change? They need to be visually distinct, readable with white text, and not map to club rivalries. The current set avoids major rivalries — should it stay?

5. **Captain gold:** Yellow/gold (`#EAB308`) for captain highlighting — universal (trophies, stars). Keep?

6. **WhatsApp OG image:** The colors in our social preview image are the first brand impression for most new users. Which palette creates the most click-worthy preview?

---

## Constraints

- Team draft colors (3-5 colors for captains) must remain visually distinct
- Must work in both light and dark mode
- Captain gold should stay universal
- Red should remain only for errors/destructive actions
- Colors are defined in CSS custom properties (`src/index.css`) — easy to change technically
- PWA theme-color affects browser chrome on Android and iOS

---

## Deliverable

Provide:
1. **One recommended primary palette** with exact hex values for: primary, secondary, accent, background (light), background (dark), PWA theme-color
2. **Rationale** — why this palette over alternatives, addressing club neutrality, WhatsApp visibility, competitor differentiation
3. **Team draft colors** — keep or change? Provide the set of 5 colors for captains 1-5
4. **Dark-first or light-first recommendation** with reasoning
5. **Side-by-side comparison** of the recommended palette vs current emerald palette — what changes and what stays
