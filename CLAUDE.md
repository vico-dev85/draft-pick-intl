# Draft Pick — International Soccer Draft App

## What This Is

This is the **international LTR version** of [kohot.online](https://kohot.online), a Hebrew RTL soccer draft app. This codebase was copied from the Hebrew version and needs to be transformed into a **multi-language, LTR-first** app for global audiences.

**Product name**: Draft Pick (working title — can be changed)
**Target languages**: English (default), Spanish, French, German, Italian, Dutch
**Direction**: LTR only (no RTL languages in v1)

---

## Reference: What This App Does

The core loop (keep this identical to the Hebrew version):

> Owner signs up → creates a club → adds player roster → on game day selects tonight's players → picks 3 captains → runs a live snake draft → shares final teams via WhatsApp → optionally runs a game night with timer, goals, and standings.

### Routes & Pages

| Route | Page | Purpose |
|---|---|---|
| `/` | Landing | Marketing homepage — explain product, CTA to sign up |
| `/auth` | Auth | Login / signup (email + Google OAuth) |
| `/dashboard` | Dashboard | Club hub — draft history, player card, create draft |
| `/players` | Players | Manage player pool — add, edit, invite, permissions |
| `/create-draft` | CreateDraft | Multi-step: name → select players → pick captains → confirm |
| `/join/:roomCode` | JoinDraft | Captains claim identity before draft |
| `/room/:roomCode` | WaitingRoom | Raffle animation, wait for 3 captains |
| `/draft/:roomCode` | DraftBoard | Live snake draft — pick players in turn |
| `/results/:roomCode` | Results | Final teams — share via WhatsApp, start game night |
| `/night/:nightId` | GameNight | Live game tracking — timer, goals, rotation |
| `/night-results/:nightId` | NightResults | Game night summary — standings, top scorers |
| `/quick-draft` | QuickDraft | Anonymous draft (no signup required) |
| `/accept-invite` | AcceptInvite | Player invite acceptance flow |
| `/privacy` | Privacy | Privacy policy |
| `/terms` | Terms | Terms of service |

### Key Flows

**Draft flow**: CreateDraft → WaitingRoom → DraftBoard → Results
**Game night flow**: Results → GameNight → NightResults
**Invite flow**: Player gets WhatsApp link → AcceptInvite → Auth → Dashboard (as member)
**Quick draft**: Landing → QuickDraft → WaitingRoom → DraftBoard → Results (no signup)

---

## Git Workflow

**IMPORTANT:** When the user says "working", "good", "save this", "commit", or similar:
1. Stage all changes: `git add -A`
2. Create a descriptive commit explaining what was fixed/added
3. Push to origin: `git push`
4. Confirm to the user what was committed

**IMPORTANT:** When the user says "deploy", "build", "ship it":
1. Run `npm run build` (outputs to `dist/`)
2. Tell the user: "dist/ is ready for deployment"

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript |
| Build | Vite 5 |
| Styling | Tailwind CSS + shadcn/ui components |
| Auth | Supabase Auth (email/password + Google OAuth) |
| Database | Supabase (Postgres) |
| Realtime | Supabase Realtime (presence + postgres_changes) |
| Storage | Supabase Storage (`player-photos` bucket) |
| Routing | React Router v6 with **HashRouter** |
| Animation | Framer Motion |
| Testing | Vitest + React Testing Library |
| PWA | vite-plugin-pwa |

---

## The Transformation: Hebrew → International

### Current State

The codebase is a **working Hebrew RTL app**. Every page, component, hook, and utility has hardcoded Hebrew strings and `dir="rtl"` attributes. There are **~44 source files** with Hebrew text and **61 `dir="rtl"` usages**.

### What Must Change

#### 1. i18n System — `react-i18next`

Set up `react-i18next` with:
- **Namespace-per-page** structure for lazy loading
- **English as default/fallback** language
- Browser language detection on first visit
- Language stored in `localStorage` (key: `draftpick_lang`)
- Language picker in app header/settings

**Directory structure:**
```
src/
  i18n/
    index.ts              ← i18next init config
    locales/
      en/
        common.json       ← shared: nav, buttons, errors, toasts
        landing.json      ← Landing page copy
        auth.json         ← Auth page copy
        dashboard.json    ← Dashboard page copy
        players.json      ← Players page copy
        draft.json        ← CreateDraft, WaitingRoom, DraftBoard
        results.json      ← Results, sharing templates
        gamenight.json    ← GameNight, NightResults
        legal.json        ← Privacy, Terms
      es/
        common.json
        landing.json
        ... (same structure)
      fr/
      de/
      it/
      nl/
```

**Translation key convention:**
```json
{
  "landing.hero.title": "Fair Teams in One Click",
  "landing.hero.subtitle": "Pick 3 captains. Run a live snake draft. Share teams on WhatsApp.",
  "draft.turn.yourTurn": "Your turn to pick",
  "draft.turn.captainPicking": "{{captain}} is picking...",
  "common.buttons.confirm": "Confirm",
  "common.buttons.cancel": "Cancel"
}
```

#### 2. Remove All RTL

- `index.html`: Change `<html lang="he" dir="rtl">` → `<html lang="en" dir="ltr">`
- Remove every `dir="rtl"` from JSX (61 occurrences across all pages/components)
- Remove Heebo font from `tailwind.config.ts` — use system font stack or Inter/Poppins
- Check all `ml-*` / `mr-*` / `pl-*` / `pr-*` / `text-right` / `text-left` classes — some were intentionally flipped for RTL and need to be un-flipped
- Check Framer Motion animations — any `x: -100` slide-ins may need direction reversal

#### 3. TTS Language

`src/lib/sounds.ts` has:
```typescript
utterance.lang = "he-IL";  // ← Must become dynamic
```

Change `speak()` to accept a language parameter or read from i18n:
```typescript
export function speak(text: string, lang?: string): void {
  // ...
  utterance.lang = lang || i18next.language || "en";
  const voice = voices.find(v => v.lang.startsWith(utterance.lang));
  // ...
}
```

TTS is used in:
- **WaitingRoom**: Raffle announcements
- **DraftBoard**: Turn notifications, pick announcements, draft complete
- **GameNight**: Timer warnings

All TTS text strings must come from i18n translation files, not hardcoded.

#### 4. WhatsApp Share Templates

Currently hardcoded Hebrew in:
- `Results.tsx` — `shareViaWhatsApp()` function
- `WaitingRoom.tsx` — captain invite message
- `Players.tsx` — player invite message
- `ClubSettings.tsx` — default invite/results templates

All must use `t()` translation keys. The `ClubSettings` default templates should be language-aware.

#### 5. Draft Utility Labels

`src/lib/draftUtils.ts` has:
```typescript
getCaptainLabel(1) → "קפטן 1"  // ← Must be "Captain 1" (from i18n)
```

#### 6. Meta Tags & PWA

`index.html` needs:
- English title, description, OG tags
- New OG image (English)
- New PWA manifest name
- New favicon/icons (if rebranding)

#### 7. Legal Pages

`Privacy.tsx` and `Terms.tsx` have full Hebrew legal text. Need English versions. Other languages can be added later or auto-translated.

---

## Implementation Phases

### Phase 1: i18n Infrastructure (do this first)

1. `npm install react-i18next i18next i18next-browser-languagedetector`
2. Create `src/i18n/index.ts` with i18next config
3. Create `src/i18n/locales/en/common.json` with shared strings
4. Wrap app in `I18nextProvider` in `main.tsx`
5. Convert ONE page (Landing) to use `t()` as proof of concept
6. Verify build passes

### Phase 2: Strip Hebrew from All Pages

Go page by page, extracting every Hebrew string into translation keys:

**Priority order** (most user-facing first):
1. `Landing.tsx` — marketing copy, CTA buttons
2. `Auth.tsx` — form labels, errors, buttons
3. `Dashboard.tsx` — headers, cards, onboarding walkthrough, selfie editor
4. `Players.tsx` — player management, invite generation
5. `CreateDraft.tsx` — multi-step form, validation messages
6. `WaitingRoom.tsx` — captain status, raffle, TTS
7. `DraftBoard.tsx` — turn banners, pick confirmation, TTS
8. `Results.tsx` — team display, sharing, game night button
9. `GameNight.tsx` — timer, scoring, matchup display
10. `NightResults.tsx` — standings, top scorers
11. `JoinDraft.tsx` — identity claiming
12. `AcceptInvite.tsx` — invite acceptance
13. `QuickDraft.tsx` — anonymous draft setup
14. `NotFound.tsx` — 404 page
15. `Privacy.tsx` + `Terms.tsx` — legal

Also extract from components:
- `ClubSettings.tsx` — settings form, WhatsApp templates
- `ErrorBoundary.tsx` — error messages
- `InstallPromptBanner.tsx` — PWA install prompts
- `SelfieAvatarEditor.tsx` — photo editor labels
- `CaptainWheel.tsx` — raffle animation
- `PalmRaffleGame.tsx` — raffle game
- Draft components: `ConfirmPickModal`, `PickAnnouncement`, `TeamColumn`, `TurnBanner`

And from libs:
- `sounds.ts` — TTS text
- `draftUtils.ts` — captain labels
- `photoUpload.ts` — error messages

### Phase 3: Remove RTL

1. Change `index.html` root to `lang="en" dir="ltr"`
2. Remove all `dir="rtl"` from JSX
3. Replace Heebo font with a Latin font (Inter or system stack)
4. Audit Tailwind classes: fix any margin/padding that was intentionally swapped
5. Test every page visually — buttons, text alignment, animations

### Phase 4: Add Language Picker

1. Language selector component (dropdown or flag icons) in app header
2. Store preference in `localStorage`
3. Update `<html lang="">` when language changes
4. Sound system reads language for TTS

### Phase 5: Translate to Other Languages

Create translation files for: `es`, `fr`, `de`, `it`, `nl`
- Start with machine translation (DeepL/GPT) for speed
- Mark as "needs review" — have native speakers refine later
- Legal pages can stay English-only initially

### Phase 6: Branding & Polish

1. New app name, logo, color scheme (or keep emerald green)
2. New OG image for social sharing
3. New PWA icons and manifest
4. New domain setup
5. Deploy pipeline

---

## Supabase Setup (New Project)

Create a **separate Supabase project** for this app. Do NOT share with kohot.online.

1. Create project at [supabase.com](https://supabase.com)
2. Run all migrations from `supabase/migrations/` in order on the SQL Editor
3. Enable Google OAuth in Auth → Providers
4. Create `player-photos` storage bucket (public read, authenticated write)
5. Set env vars in `.env.local`:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

The Supabase client is in `src/integrations/supabase/client.ts`.

---

## Architecture & Known Gotchas

These carry over from the Hebrew version — **do not change** these patterns:

- **HashRouter + PKCE flow** — The app uses `HashRouter` for static hosting. All routes are `/#/path`. Supabase Auth uses `flowType: 'pkce'` because implicit flow puts `#access_token=` in the URL hash, which overwrites the HashRouter route. **Never switch to implicit flow.**

- **OAuthCallbackHandler** — In `App.tsx`, detects both implicit and PKCE tokens. After processing, cleans up the query string and checks for pending invite tokens.

- **Dual storage for invite tokens** — `pendingInviteToken` is stored in both `sessionStorage` and `localStorage` because email confirmation opens a new tab where `sessionStorage` is empty.

- **RLS + SECURITY DEFINER RPCs** — Most data access goes through RPCs to avoid RLS recursion. Direct table queries work only for owners. Members must use RPCs.

- **DraftBoard uses light theme** — `bg-gray-100` for readability during draft, unlike the rest of the dark emerald theme.

- **Secure session IDs** — `getSecureSessionId()` generates browser session IDs for captain identity claiming (separate from Supabase auth).

- **Sound system** — `src/lib/sounds.ts` plays sound effects and browser TTS. Sound files in `public/sounds/`. Mute toggle persisted in `sessionStorage`.

- **Selfie Avatar Editor** — Camera/gallery capture with oval face crop guide. Outputs PNG with transparent corners.

- **Oval avatars** — `PlayerAvatar` renders photos as ovals (~1:1.35 ratio). Initials fallback stays circular.

- **Photo upload** — `compressPhoto()` (500KB, 400px, WebP) + `uploadPlayerPhoto()` to Supabase storage.

---

## Key Supabase RPCs

These RPCs exist in the migrations and are called from the frontend:

| RPC | Used By | Purpose |
|---|---|---|
| `get_user_club` | Dashboard, CreateDraft, ClubSettings | Get user's club |
| `get_club_players` | CreateDraft, Players | Get player pool |
| `get_club_drafts` | Dashboard | Get draft history |
| `get_my_linked_clubs` | useClubContext | Get clubs user belongs to |
| `get_room_players_public` | Multiple pages | Get players for a draft (public) |
| `get_draft_state` | DraftBoard | Get current draft turn |
| `pick_player_atomic` | DraftBoard | Atomic player pick |
| `claim_player_identity` | JoinDraft | Claim captain identity |
| `auto_identify_player` | JoinDraft | Auto-identify linked user |
| `start_draft_if_ready` | WaitingRoom | Start draft when ready |
| `peek_invite` | AcceptInvite | Preview invite (anon, read-only) |
| `accept_player_invite` | AcceptInvite | Accept invite + link user |
| `generate_player_invite` | Players | Create 48h invite token |
| `create_quick_draft` | QuickDraft | Anonymous draft (SECURITY DEFINER) |
| `start_game_night` | Results | Create game night from draft |
| `start_game` | GameNight | Start a game in night |
| `record_goal` | GameNight | Record goal |
| `end_game` | GameNight | End game, calc winner |
| `end_game_night` | GameNight | End entire night |
| `get_game_night_summary` | GameNight, NightResults | Full night data |
| `update_club_settings` | ClubSettings | Update club config |
| `update_player_category` | Players | Set player type |
| `update_player_permissions` | Players | Grant permissions |
| `toggle_reaction` | Results | Emoji reactions |
| `get_reaction_counts` | Results | Reaction counts |
| `request_player_invite` | Results, NightResults | Request to join club |

---

## Realtime Subscriptions

| Channel | Page | Purpose |
|---|---|---|
| `presence-room-${id}` | WaitingRoom | Track connected captains |
| `room-status-${id}` | WaitingRoom | Watch draft status changes |
| `draft-room-${id}` | DraftBoard | Live pick updates |

---

## Key Hooks

| Hook | Purpose |
|---|---|
| `useAuth()` | Supabase auth state, signIn/signOut/signUp, Google OAuth |
| `useClubContext()` | Club membership: `{ currentClub, isOwner, isMember, permissions, playerId, playerName }` |
| `useGameTimer()` | Game night countdown timer with audio warnings |
| `useWakeLock()` | Prevent screen sleep during drafts/games |
| `useAnnouncementQueue()` | Queue TTS + sound announcements |
| `useInstallPrompt()` | PWA install prompt detection |

---

## Verification & Testing

**Before every commit, run:**
```bash
npm test        # Vitest — all tests must pass
npm run build   # Vite production build — catches TypeScript errors
```

**Existing test files** (update Hebrew assertions as you translate):
- `src/test/pages.test.tsx` — smoke tests for Landing, Auth, AcceptInvite, QuickDraft
- `src/test/invite-flow.test.tsx` — OAuth redirect logic, invite token handling
- `src/test/security.test.ts` — open redirect prevention, token validation
- `src/test/setup.tsx` — mocks for Supabase, framer-motion, matchMedia
- `src/test/test-utils.tsx` — `renderWithProviders()` helper

When translating pages, update test assertions to match new English text.

---

## Security

These patterns must be preserved:

- **Open redirect prevention**: `src/lib/safeRedirect.ts` validates all redirect paths
- **Invite tokens**: UUID format only, validated server-side, expire after 48 hours
- **SECURITY DEFINER RPCs**: `peek_invite` (read-only, anon) and `create_quick_draft` (write, anon) both have `SET search_path TO 'public'`
- **No secrets in git**: `.env.local` is in `.gitignore`
- **All redirect targets** go through `getSafeRedirectPath()`

---

## Deploy

1. `npm run build` — outputs to `dist/`
2. Upload contents of `dist/` to hosting (static hosting, no SSR needed)
3. HashRouter means all routes work without server-side rewrite rules

---

## Files That Can Be Deleted

These are Hebrew-specific or cancelled features:
- `docs/legacy-handover.md` — old Lovable handover doc
- `docs/COPYWRITING-GUIDE.md` — Hebrew copywriting guide
- `docs/PROJECT-STATUS.md` — Hebrew project status
- Any `.png` screenshots in root
- Old Hebrew-specific docs

---

## Summary: What Makes This App Special

Focus on preserving these differentiators during translation:

1. **Zero-friction draft**: 3 captains join via WhatsApp link, pick players live on their phones
2. **Snake draft fairness**: Randomized order + snake pattern = balanced teams
3. **WhatsApp-native sharing**: Results shared as formatted text + link
4. **Game night mode**: Timer, live scoring, winner-stays rotation, goal tracking
5. **Club management**: Persistent player pool, invite members, permissions
6. **PWA**: Install on home screen, works offline-ish, push-ready
7. **Sound & TTS**: Crowd effects + voice announcements during draft
8. **Selfie avatars**: Camera capture with oval face crop for player identity

The Hebrew version is live and working. The goal is to replicate the exact same experience in English and other languages, not to redesign or add features.
