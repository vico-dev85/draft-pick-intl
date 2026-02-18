# Research Prompt: Visual Language & Design Personality

## Your Task

Define the overall visual design personality for a soccer/football draft app. This goes beyond colors and fonts — it covers the look and feel of every screen, every interaction, every pixel. End with 5-7 visual design principles that guide all future design decisions.

---

## App Context

**What it does:** Live snake draft for pickup soccer. Full flow: create club → add players → select tonight's squad → pick captains → live draft → share teams via WhatsApp → track game night.

**Core value prop:** "Fair teams. No arguments."

**Target users:** Casual pickup soccer groups, 18-45, primarily male, mobile-first, international.

**Brand personality:** Fair, fast, fun, social, premium.

**Tone of voice:** 70% casual, 60% playful, 65% enthusiastic. Confident but not arrogant.

**Key moments (in order of emotional intensity):**
1. **Raffle animation** — captains watch to see who picks first. HIGH energy, anticipation.
2. **Draft picking** — "Your turn!" → scan players → tap to pick. FOCUSED, competitive.
3. **Results reveal** — teams are final. CELEBRATION, relief, excitement.
4. **Game night goal** — someone scores. CROWD ENERGY, stadium feel.
5. **WhatsApp share** — sending teams to the group. PRIDE, sharing.
6. **Club setup** — adding players, creating drafts. CALM, functional.

---

## Current Visual State

### Page Backgrounds
- **Landing:** Dark emerald gradient (emerald-800 → emerald-950) with background photo + overlay
- **Auth:** Dark emerald with background photo
- **Dashboard:** Dark emerald gradient
- **DraftBoard:** Light gray (`bg-gray-100`) — intentionally different for readability
- **Results:** Dark emerald gradient
- **GameNight:** Dark emerald gradient
- **All other pages:** Dark emerald gradient

**Issue:** Almost every page is dark emerald. There's little visual variety between sections.

### Component Patterns
- Cards: `bg-black/20` or `bg-black/30` with `border-white/10` and `backdrop-blur-sm`
- Buttons: Emerald primary (`bg-emerald-500`), white/transparent secondary
- Avatars: Oval shape (~1:1.35 ratio) with initials fallback as circles
- Animations: Framer Motion throughout — slide-ins, scale-ups, layout animations
- Glows: Emerald glow (`ring-emerald-300 animate-glow`) on active elements

### Sound Design
- Crowd effects at low volume (ambient)
- Ding/reveal for picks
- Whistle for draft complete
- TTS voice announcements
- Drumroll for raffle anticipation

### Current Issues
- Wall-to-wall emerald creates monotony
- Hard to distinguish which page you're on (all look similar)
- DraftBoard's light theme feels disconnected from the rest
- Landing page background images may not match new brand direction
- No illustration style defined
- No iconography system beyond Lucide icons

---

## Visual Design Questions

### 1. Dark vs Light — What's the Default?

| Approach | Pros | Cons |
|---|---|---|
| **Dark-first** (current) | Premium feel, stadium atmosphere, focus | Outdoor daytime readability issues, monotonous if one color |
| **Light-first** | Better outdoor readability, cleaner feel, content-focused | Feels less premium, less "event-like" |
| **Context-dependent** | Draft/GameNight dark (event mode), Dashboard/Players light (utility mode) | More work, potential inconsistency |
| **User choice** | Respects preference | More development work |

Most usage happens before/during a game — is that daytime or evening? For pickup soccer groups playing after work, it's likely evening under field lights → dark works. For weekend games, it's daytime → light is better.

### 2. Minimal vs Energetic

| Approach | Description | Reference |
|---|---|---|
| **Minimal** | Clean, lots of white space, content-first, subtle animations | FotMob, Spond |
| **Energetic** | Bold colors, active animations, sound, crowd effects, stadium feel | Current app, FPL during gameweek |
| **Adaptive** | Calm during setup, energetic during draft/game | Ideal but harder to design consistently |

The current app is energetic across the board — should it calm down during non-draft moments?

### 3. Illustration & Iconography

The app currently uses:
- Lucide icons for UI (standard, minimal)
- No custom illustrations
- Background photos for landing/auth (stock/generated)
- Hand PNG animations for raffle game
- Emoji for logo and some UI elements

Should the app have:
- Custom illustrations for empty states and onboarding?
- A custom icon set that matches the brand?
- Micro-illustrations (small visual flourishes)?
- Or stay icon-minimal and let the data/content be the visual?

### 4. Motion & Animation Philosophy

Current animations:
- Framer Motion slide-ins on page transitions
- Scale-up on player picks
- Layout animation on team column additions
- Glow pulse on active team
- Float animation on decorative elements
- Raffle wheel/palm game animation

Questions:
- Are animations too much or just right?
- Should the draft board feel more intense (faster transitions, more dramatic reveals)?
- Should non-draft pages be calmer (reduce or remove animations)?
- What's the right balance between "fun" and "I just need to add a player quickly"?

### 5. The WhatsApp Preview Moment

When someone shares draft results on WhatsApp, recipients see:
- A text message with team lists (formatted plain text)
- A link preview with OG image + title + description

This is the **most important visual touchpoint** — it's where most new users first encounter the brand. The OG image needs to:
- Be instantly recognizable as "team draft results"
- Look professional enough to tap on
- Work at WhatsApp's small preview size (~300x157px)
- Look good on both light and dark WhatsApp

### 6. The "Pitch Line" Decorative Pattern

Several pages have decorative "pitch lines" — a center circle, halfway line, quarter lines — rendered as faint white/10 opacity elements on the dark background. This is a subtle football reference.

Should this pattern:
- Stay as-is?
- Become a stronger brand element (more visible, consistent)?
- Be removed (too literal)?
- Evolve into a more abstract geometric pattern?

---

## Competitor Visual Language

| App | Visual Personality | Key Traits |
|---|---|---|
| **FotMob** | Clean, data-first | White space, green accents, content IS the design |
| **OneFootball** | Bold, editorial | Dark base, hype colors at 10%, custom type, high contrast |
| **FPL** | Premium broadcast | Purple base, neon accents, badge-heavy, tournament feel |
| **Sleeper** | Social-native | Dark purple, chat-like UI, mascot, playful but structured |
| **EA FC** | Cinematic | Black, gold, dynamic lighting effects, premium |

---

## Constraints

- Mobile-first (90%+ of usage is phone)
- PWA — no native features like haptics or blur effects that need native code
- Tailwind CSS + shadcn/ui — design must work within this system
- Framer Motion for animations
- Must feel the same across all 6 languages (no culture-specific visual elements)
- Outdoor readability matters (games happen on real fields)

---

## Deliverable

Provide:

1. **5-7 Visual Design Principles** — numbered rules that guide every future design decision. Each should be a short statement with a 1-2 sentence explanation. Example format:
   > **1. Event Mode vs Utility Mode.** Draft and game night screens are dark, energetic, and immersive. Setup screens (dashboard, players, settings) are light, clean, and functional.

2. **Recommended approach** for each question above (dark/light, minimal/energetic, illustrations, animations, pitch lines)

3. **Visual identity summary** — in 3-4 sentences, describe what the app looks and feels like to someone who's never seen it. This is the "elevator pitch" for the visual design.

4. **Consistency rules** — specific guidelines for: card styles, button hierarchy, spacing rhythm, border radius, shadow usage, opacity levels for overlays

5. **What to change from current state** — top 5 visual changes that would have the biggest impact on brand perception
