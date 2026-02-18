# Draft Pick — Brand Guide

> Last updated: February 2026

---

# PART 1: CURRENT STATE (What We Have)

Everything in this section documents what exists today in the codebase.

---

## 1.1 Identity

| Element | Current Value |
|---|---|
| **App name** | Draft Pick |
| **Primary tagline** | "Fair teams. No arguments." |
| **Secondary tagline** | "Fair teams. More time to play." |
| **Domain** | TBD (no production domain yet) |
| **Logo** | Soccer ball emoji (⚽) + "Draft Pick" gradient text (`src/components/ui/logo.tsx`) |
| **App icons** | Hebrew letter "כ" on emerald circle — **leftover from Hebrew version** |

## 1.2 Color Palette

All colors defined in `src/index.css` as CSS custom properties.

### Brand Colors

| Role | HSL | Hex | Tailwind | CSS Variable |
|---|---|---|---|---|
| Primary | 160 84% 39% | `#10B981` | emerald-500 | `--primary` |
| Primary Dark | 160 84% 30% | `#059669` | emerald-600 | gradient end |
| Secondary | 210 100% 56% | `#0EA5E9` | sky-500 | `--secondary` |
| Accent | 38 92% 50% | `#F97316` | orange-500 | `--accent` |
| Captain Gold | 45 93% 47% | `#EAB308` | yellow-400 | `--captain` |
| Destructive | 0 84% 60% | `#EF4444` | red-500 | `--destructive` |

### Backgrounds

| Context | HSL | Hex |
|---|---|---|
| Light mode background | 120 15% 97% | `#F7FBEE` |
| Dark mode background | 220 20% 8% | `#0F172A` |
| Landing page | Tailwind emerald-800 → emerald-950 gradient | — |
| DraftBoard | `bg-gray-100` (intentionally light for readability) | — |
| PWA theme-color | — | `#065f46` |
| PWA background-color | — | `#064e3b` |

### Team Draft Colors (in `src/lib/draftUtils.ts`)

| Captain # | Color | Tailwind Class |
|---|---|---|
| 1 | Emerald (primary) | `bg-primary` |
| 2 | Sky blue (secondary) | `bg-secondary` |
| 3 | Orange (accent) | `bg-accent` |
| 4 | Orange-600 | `bg-orange-600` |
| 5 | Pink-600 | `bg-pink-600` |

### Player Avatar Colors (8 colors in `src/index.css`)

| # | Color | Hex |
|---|---|---|
| 1 | Emerald | `#10B981` |
| 2 | Sky blue | `#0EA5E9` |
| 3 | Orange | `#F97316` |
| 4 | Purple | `#A855F7` |
| 5 | Pink | `#EC4899` |
| 6 | Teal | `#14B8A6` |
| 7 | Red-orange | `#F97316` |
| 8 | Indigo | `#6366F1` |

### Where Colors Live

| File | Controls |
|---|---|
| `src/index.css` | CSS custom properties (light + dark mode) |
| `src/lib/draftUtils.ts` | Team color arrays (BG_COLORS, TEXT_COLORS, BORDER_COLORS) |
| `index.html` | `<meta name="theme-color" content="#065f46">` |
| `vite.config.ts` | PWA `theme_color` and `background_color` |

## 1.3 Typography

| Setting | Value |
|---|---|
| Font | Inter (weights 300-800, variable) |
| Import | Google Fonts in `src/index.css` line 1 |
| Fallback | `system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif` |
| Config | `tailwind.config.ts` → `fontFamily.sans` |

Old Hebrew font (Heebo) has been fully removed.

## 1.4 Visual Assets

### Icons (`public/icons/`)

| File | Size | Status |
|---|---|---|
| `icon-192.png` | 192x192 | Hebrew "כ" — needs replacement |
| `icon-512.png` | 512x512 | Hebrew "כ" — needs replacement |
| `icon-maskable-192.png` | 192x192 | Hebrew "כ" — needs replacement |
| `icon-maskable-512.png` | 512x512 | Hebrew "כ" — needs replacement |
| `apple-touch-icon.png` | 180x180 | Hebrew "כ" — needs replacement |
| `icon.svg` | Vector | Hebrew "כ" — needs replacement |

Generation script: `scripts/generate-icons.mjs` (update SVG template, then run to regenerate all sizes).

### Background Images (`public/assets/bg/`)

| File | Usage |
|---|---|
| `landing-desktop.jpg` | Landing hero (16:9) |
| `landing-mobile.jpg` | Landing hero (9:16) |
| `landing-mobile2.jpg` | Alternate mobile landing |
| `auth-desktop.jpg` | Auth page background |
| `auth-mobile.jpg` | Auth page background |

### Other Assets

| File | Usage | Status |
|---|---|---|
| `favicon.ico` | Browser tab | Needs replacement |
| `logo.png` | Privacy/Terms pages | Needs replacement |
| `og-image.webp` | Social sharing preview | Needs replacement |
| `placeholder.svg` | Fallback image | OK |

### Hand Animations (`public/assets/hands/`)

6 hand PNGs used in raffle palm game animation. No branding — keep as-is.

### Sound Effects (`public/sounds/`)

| File | Usage |
|---|---|
| `ding.mp3` | Pick confirmation |
| `drumroll.mp3` | Raffle anticipation |
| `reveal.mp3` | Player reveal |
| `whistle.mp3` | Draft complete |
| `crowd1-4.mp3` | Ambient stadium reactions |
| `captain-enter.mp3` | Captain joins room |

All sounds are neutral/universal. No changes needed.

### CSS Animations

| Class | Effect | Usage |
|---|---|---|
| `.animate-float` | 3s float | Decorative elements |
| `.animate-pulse-glow` | Emerald glow pulse | Active states |
| `.animate-spin-slow` | 3s rotation | Loading/raffle |
| `.animate-glow` | Box-shadow glow | Active team column |

## 1.5 Meta Tags & PWA

### HTML (`index.html`)

```html
<title>Draft Pick — Fair Teams in One Click</title>
<meta name="description" content="Live soccer draft — pick captains, randomize order, build balanced teams" />
<meta name="theme-color" content="#065f46" />
<meta property="og:title" content="Draft Pick — Fair Teams in One Click" />
<meta property="og:description" content="Live soccer draft, game night tracking — timer, goals, standings & WhatsApp sharing" />
<meta property="og:image" content="/icons/apple-touch-icon.png" />
<meta property="og:site_name" content="Draft Pick" />
<meta name="twitter:card" content="summary" />
```

### PWA Manifest (in `vite.config.ts`)

```
name: "Draft Pick — Fair Teams in One Click"
short_name: "Draft Pick"
description: "Live soccer draft — pick captains, randomize order, build balanced teams"
theme_color: "#065f46"
background_color: "#064e3b"
display: "standalone"
orientation: "portrait"
lang: "en"
dir: "ltr"
```

## 1.6 Copy & Messaging

### Landing Page (from `src/i18n/locales/en/landing.json`)

- Hero title: "Draft Pick"
- Three-line tagline: "Pick captains" / "Draft teams from your phone" / "Fair teams. No arguments."
- CTAs: "Create Your Club", "Sign in", "Try without an account"

### WhatsApp Share Templates

**Draft invite:**
```
Join our draft "{{name}}"!
Game code: {{code}}
Click to join: {{url}}
```

**Draft results:**
```
🏆 {{draftName}}
⚽ Team {{captain}}: {{players}}
📍 {{location}}
📋 View results: {{url}}
⚡ Fair teams. No arguments. — Draft Pick
```

### Translation Files (`src/i18n/locales/en/`)

`common.json`, `landing.json`, `auth.json`, `dashboard.json`, `players.json`, `draft.json`, `results.json`, `gamenight.json`, `legal.json`

Only English exists. Other languages (ES, FR, DE, IT, NL) not yet created.

## 1.7 Sound & TTS

| Setting | Value | Status |
|---|---|---|
| TTS language | `utterance.lang = "he-IL"` | **BUG — still hardcoded Hebrew** |
| Mute storage key | `kohot_sound_muted` | Legacy name from Hebrew version |
| Language storage key | `draftpick_lang` | Correct |
| Crowd volume | 0.25 | OK |
| UI sound volume | 0.80 | OK |

## 1.8 Known Issues

| Issue | Severity | Location |
|---|---|---|
| All app icons use Hebrew letter "כ" | Critical | `public/icons/*` |
| TTS hardcoded to `he-IL` | Critical | `src/lib/sounds.ts` |
| OG image is apple-touch-icon (too small) | High | `index.html` |
| OG image URL is relative (breaks WhatsApp) | High | `index.html` |
| No production domain configured | High | — |
| Storage key uses "kohot" prefix | Low | `src/lib/sounds.ts` |
| Logo is emoji-based (⚽ + text), not a designed mark | Medium | `src/components/ui/logo.tsx` |
| Bundle is 1.2MB (no code splitting) | Medium | Build output |

---

# PART 2: BRAND DIRECTION (What We Should Build)

Everything in this section is a recommendation. Nothing here is implemented yet.

---

## 2.1 Product Identity

### What We Are

A **live snake draft app for pickup soccer**. We turn the chaotic "picking teams" moment into a fair, fun, phone-based experience — then extend into game night tracking.

### Core Loop

> Organizer creates a club → adds players → on game day selects tonight's squad → picks captains → runs a live snake draft → shares teams via WhatsApp → optionally tracks the game night with timer, goals, and standings.

### Brand Promise

**"Fair teams. No arguments."**

Every design decision should serve this promise.

### What Makes Us Different

| Differentiator | Why It Matters |
|---|---|
| **Zero-friction draft** | Captains join via WhatsApp link, pick from their phones |
| **Snake draft fairness** | Randomized order + snake pattern = balanced teams |
| **WhatsApp-native** | Results shared where pickup soccer actually lives |
| **Game night mode** | Timer, live scoring, rotation, goal tracking |
| **Beautiful utility** | Every competitor is an ugly form — we make it an event |

### Positioning Statement

> For pickup soccer organizers who want fair teams without arguments, Draft Pick is the live draft app that makes team picking fast, transparent, and fun — unlike random generators or arguing in the parking lot.

### Competitive Landscape

| Category | Competitors | Our Advantage |
|---|---|---|
| Team pickers | Team Picker (web), AppSorteos | Beautiful UX vs ugly utilities |
| Pickup game finders | Footy Addicts, Playfinder, GoodRec | We don't find games — we make them fair |
| Team management | TeamSnap, Spond, SportEasy | We're game-day, not season-long |
| Fantasy drafts | Sleeper, ESPN, Yahoo | Real pickup, not fantasy |

> **Key insight:** The "live draft for pickup soccer" niche has zero well-branded competitors. Any strong brand will own the space.

## 2.2 Brand Personality

| Trait | Expression |
|---|---|
| **Fair** | Snake draft, randomized order, transparent process |
| **Fast** | Zero signup for quick drafts, 2-minute setup, instant sharing |
| **Fun** | Sound effects, crowd cheers, TTS, raffle animation |
| **Social** | WhatsApp sharing, club membership, invites |
| **Premium** | Dark theme, smooth animations, stadium-like feel |

## 2.3 Naming

### Current: "Draft Pick" — Analysis

| Pros | Cons |
|---|---|
| Immediately communicates function | Generic — hard to trademark |
| 10 chars (under 11-char mobile truncation) | Common fantasy sports term |
| 2 + 2 syllable punchy rhythm | Could mean beer drafts |
| Works in EN, ES, FR, DE, IT, NL | — |

### Alternative Directions (If Rebranding)

| Direction | Examples | Vibe |
|---|---|---|
| Compound | PickDay, DraftNight, KickDraft | Descriptive, functional |
| Action | Lineup, Whistle, Snap | Dynamic, energetic |
| Metaphor | Pitch, Huddle, Formation | Evocative, sports-native |
| Coined | Draftly, Pickster, Squadra | Unique, trademarkable |

### Naming Rules

1. Under 11 characters
2. 1-3 syllables, emphasis on first
3. Pronounceable in all 6 target languages
4. No app store conflicts
5. Domain available (.com or .app)
6. Strong consonants (T, R, S, P, D, K)

## 2.4 Logo

### Design Brief

**Concept:** A minimalist **draft board / tactical board** mark. Not a soccer ball (every football app has one).

**What it should evoke:**
- The moment of picking — a decisive action
- Fairness and structure — balanced, orderly
- The pitch — subtle football connection without being literal

**What it should NOT be:**
- A soccer ball (overused)
- A whistle or trophy (too literal)
- Anything resembling a club crest
- Complex illustration that breaks at small sizes

**System requirements — 3 variations:**

| Variation | Use Case | Size Range |
|---|---|---|
| Full logo | Landing, marketing, OG images | 200px+ wide |
| Icon mark | App icon, favicon, avatar | 16px - 512px |
| Wordmark | Header, footer, in-app | 100px+ wide |

**Technical requirements:**
- Works in monochrome (white on dark, dark on light)
- Recognizable at 16x16 favicon
- SVG source
- Maskable version for Android adaptive icons (safe zone: center 80%)
- Apple touch icon (180x180, no transparency)

### Icon Deliverables

| Asset | Size | Format | Purpose |
|---|---|---|---|
| `favicon.ico` | 32x32 | ICO | Browser tab |
| `icon.svg` | scalable | SVG | Vector source |
| `icon-192.png` | 192x192 | PNG | Android home screen |
| `icon-512.png` | 512x512 | PNG | PWA splash |
| `icon-maskable-192.png` | 192x192 | PNG | Android adaptive |
| `icon-maskable-512.png` | 512x512 | PNG | Android adaptive |
| `apple-touch-icon.png` | 180x180 | PNG | iOS home screen |

## 2.5 Color Strategy

### The Problem: Soccer Fans Are Color-Tribal

A hardcoded color scheme risks alienating fans whose rival uses that color:
- Red + White = Arsenal, Liverpool, Man Utd, AC Milan, River Plate
- Blue + White = Chelsea, Man City, Inter, Lazio
- Blue + Yellow = Boca Juniors, Fenerbahce
- Black + White = Juventus, Newcastle
- Red + Blue = Barcelona, PSG

Even green has associations: Celtic, Sporting, Palmeiras, Werder Bremen. Plus our app shares via WhatsApp (also green) — creating brand confusion.

### What Competitors Do

| App | Strategy |
|---|---|
| **FotMob** | White base + green accent (subtle, content-first) |
| **OneFootball** | Dark gray base + lime accent at max 10% of UI |
| **FPL** | Deep purple + neon lime/cyan (broadcast feel) |
| **Sleeper** | Dark purple/blue (premium) |
| **EA FC** | Black base + shifting accents per mode |

**Industry trend:** Dark neutral base + vivid accent color at 10-15%. Not wall-to-wall color.

### Safe Colors (Minimal Club Associations)

- **Purple** — rarest in football (only Fiorentina)
- **Teal/Cyan** — almost no club uses it; trending 2026 (Pantone "Transformative Teal")
- **Charcoal** — universally neutral
- **Lime/neon green** — reads as "UI" not "team"

### Recommended Default Palette

**Direction: Dark base + Teal accent**

| Role | Recommended | Rationale |
|---|---|---|
| **Primary accent** | Teal `~#0D9488` | Close enough to "pitch green" but distinct from clubs and WhatsApp |
| **Base** | Charcoal/dark gray | Neutral, premium, dark-mode-first |
| **Captain gold** | Keep yellow `#EAB308` | Universal (trophies, stars) — no club association |
| **Destructive** | Keep red `#EF4444` | Standard UI convention |
| **Team colors** | Keep current set | Already designed to be distinct and non-club-specific |

### Future: Theme System (Post-Launch)

Offer neutral premade themes so users can personalize without triggering rivalries:

| Theme | Base | Accent | Vibe |
|---|---|---|---|
| **Pitch** (default) | Charcoal | Teal | Modern, neutral |
| **Midnight** | Deep navy | Electric lime | Broadcast energy |
| **Sunset** | Dark warm gray | Coral/amber | Warm, inviting |
| **Arena** | Pure dark | Neon purple | Premium, intense |
| **Classic** | White/light | Emerald green | Clean, familiar |

> **Key principle:** Every theme should feel like "my app" — not "my team's app."

## 2.6 Typography

### Keep or Upgrade?

**Current (Inter) is solid.** But for more brand distinction:

**Recommended: Satoshi (headings) + Inter (body)**

| Role | Font | Weight | Usage |
|---|---|---|---|
| Headings | Satoshi | Bold/Black | Hero titles, section headings |
| Body | Inter | Regular/Medium | All body text, UI elements |
| Mono | JetBrains Mono | Regular | Room codes, scores |

**Why Satoshi:** Geometric playfulness, excellent at small sizes, open source, trending in modern sports/tech apps. Pairs naturally with Inter.

**Alternative: Stay with Inter only.** Less brand distinction but zero implementation cost and proven reliability.

### Typography Scale

| Element | Size | Weight | Line Height |
|---|---|---|---|
| Hero title | 3rem (48px) | 800 | 1.1 |
| Page title | 1.5rem (24px) | 700 | 1.2 |
| Section heading | 1.125rem (18px) | 600 | 1.3 |
| Body text | 0.875rem (14px) | 400 | 1.5 |
| Small/caption | 0.75rem (12px) | 400 | 1.4 |
| Room code | 1.5rem (24px) | 700 (mono) | 1 |

## 2.7 Tone of Voice

### Voice Spectrum

| Dimension | Position |
|---|---|
| Formal ↔ Casual | 70% casual |
| Serious ↔ Playful | 60% playful |
| Expert ↔ Friendly | 50/50 |
| Restrained ↔ Enthusiastic | 65% enthusiastic |

### Principles

1. **Be direct** — active voice, contractions, short sentences
2. **Be confident** — no hedging ("maybe", "try to")
3. **Be energetic at moments that matter** — draft picks, reveals, goals
4. **Be calm during setup** — settings, forms, player management
5. **Be translatable** — avoid idioms and slang that won't survive translation to 6 languages

### Examples

| Context | Do | Don't |
|---|---|---|
| CTA | "Start Draft" | "Proceed to Team Selection Phase" |
| Empty state | "No drafts yet — create your first one" | "You have not created any drafts" |
| Error | "Something went wrong. Try again." | "An unexpected error has occurred" |
| Success | "Teams are set! Share them now." | "The draft process has been completed successfully" |
| Turn | "Your turn to pick!" | "It is currently your turn" |

### TTS Guidelines

- Under 10 words per announcement
- No abbreviations
- Exclamation marks for energy
- Language from `i18next.language`

## 2.8 Social & OG Images

### Specs

| Platform | Size | Format |
|---|---|---|
| Universal OG | 1200 x 630 px | PNG or JPG |
| WhatsApp preview | 1200 x 630 px | JPG |
| Twitter/X card | 1200 x 628 px | PNG |

### Design Guidelines

1. Main content in center 60% (edges get cropped)
2. Dark background with accent color (works on light + dark WhatsApp)
3. App name + tagline prominent
4. Visual hint of draft/teams (not a full screenshot)
5. Under 1MB file size
6. **Must use absolute URL** — relative paths break WhatsApp previews

### WhatsApp Notes

- WhatsApp crawler doesn't execute JavaScript — only reads `index.html` meta tags
- Caches aggressively — append `?v=2` when updating
- Test on both iOS and Android

## 2.9 App Store

### Recommended Title

```
Draft Pick — Soccer Draft & Fair Team Picker
```

### Short Description (80 chars)

```
Live snake draft for pickup soccer. Fair teams, shared via WhatsApp.
```

### First 3 Lines (Visible Before "Read More")

```
Pick captains. Run a live snake draft. Share balanced teams instantly.

Draft Pick makes picking teams for pickup soccer fast, fair, and fun.
No more arguments about who's on whose team.
```

### Keywords by Market

| Market | Keywords |
|---|---|
| US | soccer, draft, team picker, fair teams, pickup soccer, snake draft |
| UK | football, 5-a-side, team picker, fair teams, kickabout |
| Spain | futbol, equipos, draft, sorteo equipos |
| Germany | fussball, mannschaft, fair teams, team auswahl |
| France | football, equipes, tirage au sort, draft |
| Italy | calcio, squadre, draft, formazione |
| Netherlands | voetbal, teams, draft, eerlijke teams |

## 2.10 WhatsApp Template Guidelines

- End with brand footer: `⚡ Fair teams. No arguments. — Draft Pick`
- Soccer emojis sparingly: ⚽ 🏆 📍 📝 📋 ⚡
- Under 1000 characters
- Room code prominent and easy to type
- URL on its own line for clean previews

---

# PART 3: IMPLEMENTATION

What needs to happen to get from Part 1 to Part 2.

---

## 3.1 Critical (Before Launch)

| # | Task | Files |
|---|---|---|
| 1 | **Design new logo** (icon mark + wordmark + full logo) | External design work |
| 2 | **Replace all app icons** with new logo | `public/icons/*`, `scripts/generate-icons.mjs` |
| 3 | **Replace favicon** | `public/favicon.ico` |
| 4 | **Replace logo.png** | `public/logo.png` |
| 5 | **Update logo component** (replace emoji with real mark) | `src/components/ui/logo.tsx` |
| 6 | **Create OG image** (1200x630, new branding) | `public/og-image.webp` |
| 7 | **Fix OG image URL** (absolute, not relative) | `index.html` |
| 8 | **Fix TTS language** (`he-IL` → dynamic from i18n) | `src/lib/sounds.ts` |
| 9 | **Set production domain** in OG tags and PWA manifest | `index.html`, `vite.config.ts` |

## 3.2 High Priority

| # | Task | Files |
|---|---|---|
| 10 | Review/update PWA theme colors if palette changes | `vite.config.ts`, `index.html` |
| 11 | Review/update CSS custom properties if palette changes | `src/index.css` |
| 12 | English legal pages (Privacy, Terms) | Translation files |
| 13 | Delete Hebrew docs | `docs/legacy-handover.md`, `docs/COPYWRITING-GUIDE.md`, `docs/PROJECT-STATUS.md` |

## 3.3 Nice-to-Have

| # | Task | Impact |
|---|---|---|
| 14 | Upgrade to Satoshi + Inter font pairing | Brand distinction |
| 15 | Branded loading/splash screen | First impression |
| 16 | Code splitting (route-based lazy loading) | Performance (1.2MB → smaller chunks) |
| 17 | Dynamic OG images per draft result | Better social sharing |
| 18 | Translations (ES, FR, DE, IT, NL) | Market expansion |

## 3.4 Post-Launch

| # | Task | Impact |
|---|---|---|
| 19 | Theme system (5 premade neutral palettes) | Color personalization |
| 20 | Animated logo reveal | Premium feel |
| 21 | Native speaker copy review | Polish |

---

# APPENDICES

## Appendix A: File Map

| File | Brand Relevance |
|---|---|
| `src/index.css` | All CSS color variables (light + dark) |
| `src/lib/draftUtils.ts` | Team color arrays |
| `src/components/ui/logo.tsx` | Logo component |
| `src/i18n/locales/en/common.json` | App name, taglines |
| `src/i18n/locales/en/landing.json` | Marketing copy |
| `src/lib/sounds.ts` | Sound system + TTS |
| `index.html` | Meta tags, OG tags, theme-color |
| `vite.config.ts` | PWA manifest |
| `tailwind.config.ts` | Font family, color references |
| `scripts/generate-icons.mjs` | Icon generation script |
| `public/icons/*` | All app icons |
| `public/assets/bg/*` | Background images |
| `public/sounds/*` | Sound effects |
| `public/og-image.webp` | Social share image |
| `public/logo.png` | Static logo image |
| `public/favicon.ico` | Browser tab icon |

## Appendix B: Research Sources

### Color & Design
- OneFootball Brand Guidelines (brand.onefootball.com)
- DesignStudio's identity for OneFootball (Creative Review, Brand New, Underconsideration)
- FotMob Design Critique (IXD@Pratt)
- Premier League brand colors (Mobbin, SchemeColor)
- Pantone Color of the Year 2026: "Transformative Teal"
- 2026 App Color Trends (DesignRush, WebOsmotic, IxDF)
- Color Psychology in Sports (Wooter, Badge Design Studio, Valspar)
- Soccer Kit Colors and Identity (SoccerWizdom, Gift of Kit)

### Typography
- 35 Sports Fonts That Score Big (Design Work Life)
- Top Sans Serif Fonts 2025 (Inklusive, Looka)
- Satoshi Font Pairings (MaxiBestOf)
- Best Fonts for Apps 2025 (Frontmatter)

### Naming & ASO
- App Naming Principles (River + Wolf, AngleTech)
- ASO Keyword Research (AppTweak, MobileAction, ASOMobile)
- App Store Optimization Guide (Udonis)

### Competitors
- Footy Addicts, TeamSnap, Spond, GoodRec, Pickup Games
- Team Picker (team-picker.com)
- Sleeper Rebrand Case Study (sleeper.com/blog)

### Social/OG
- OG Image Best Practices (Slick Media, Krumzi)
- WhatsApp Link Preview Optimization (OGPreview, MetaTagPreview, OpenGraphPlus)
