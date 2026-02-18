# Draft Pick — International Soccer Draft App

## What This Is

An **international, English-first** soccer/football draft app for pickup groups. Forked from [kohot.online](https://kohot.online) (Hebrew RTL version) and fully transformed to LTR with i18n support.

**Product name**: Draft Pick (working title — see `docs/research/01-naming.md`)
**Target languages**: English (default), Spanish, French, German, Italian, Dutch
**Direction**: LTR only (no RTL languages in v1)

---

## Current State (as of Feb 2026)

The app is **functional in English** and nearly launch-ready.

**Completed:**
- Full i18n system (react-i18next, namespace-per-page, language picker)
- All pages translated to English
- All RTL removed, LTR-first
- TTS reads language dynamically from `localStorage` key `draftpick_lang`
- Multi-team support (2-3 teams, expandable to 4-5)
- PWA icons replaced (Hebrew → "DP" initials)
- 24 tests passing, production build clean

**Not yet done:**
- OG image (needs design, not code generation)
- Logo component still uses emoji placeholder (⚽ in `src/components/ui/logo.tsx`)
- English legal pages (Privacy.tsx, Terms.tsx still have Hebrew text)
- Production domain not set up
- Brand identity decisions open (name, colors, logo, typography, visual language)
- Translations for ES, FR, DE, IT, NL

**Docs:**
- `docs/ROADMAP.md` — product roadmap with launch checklist and 5 phases
- `docs/BRAND-GUIDE.md` — current visual state + brand direction
- `docs/research/01-06` — self-contained research prompts for each brand decision

---

## Reference: What This App Does

The core loop:

> Owner signs up → creates a club → adds player roster → on game day selects tonight's players → picks 2-3 captains → runs a live snake draft → shares final teams via WhatsApp → optionally runs a game night with timer, goals, and standings.

### Routes & Pages

| Route | Page | Purpose |
|---|---|---|
| `/` | Landing | Marketing homepage — explain product, CTA to sign up |
| `/auth` | Auth | Login / signup (email + Google OAuth) |
| `/dashboard` | Dashboard | Club hub — draft history, player card, create draft |
| `/players` | Players | Manage player pool — add, edit, invite, permissions |
| `/create-draft` | CreateDraft | Multi-step: name → select players → pick captains → confirm |
| `/join/:roomCode` | JoinDraft | Captains claim identity before draft |
| `/room/:roomCode` | WaitingRoom | Raffle animation, wait for captains |
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
| i18n | react-i18next + i18next-browser-languagedetector |
| Auth | Supabase Auth (email/password + Google OAuth) |
| Database | Supabase (Postgres) |
| Realtime | Supabase Realtime (presence + postgres_changes) |
| Storage | Supabase Storage (`player-photos` bucket) |
| Routing | React Router v6 with **HashRouter** |
| Animation | Framer Motion |
| Testing | Vitest + React Testing Library |
| PWA | vite-plugin-pwa |

---

## i18n System

Fully set up with `react-i18next`. All pages use `t()` for translations.

**Directory structure:**
```
src/i18n/
  index.ts              ← i18next init config
  locales/
    en/
      common.json       ← shared: nav, buttons, errors, toasts
      landing.json      ← Landing page
      auth.json         ← Auth page
      dashboard.json    ← Dashboard page
      players.json      ← Players page
      draft.json        ← CreateDraft, WaitingRoom, DraftBoard
      results.json      ← Results, sharing templates
      gamenight.json    ← GameNight, NightResults
```

- Language stored in `localStorage` key: `draftpick_lang`
- Language picker in app header (`LanguagePicker` component)
- TTS in `src/lib/sounds.ts` reads language dynamically from localStorage
- `<html lang="">` attribute updated on language change

---

## Multi-Team Architecture

The app supports **2-3 teams** (expandable to 4-5). This is a recent addition built on top of the original 3-captain-only system.

### Database Schema

- `draft_rooms.num_teams` — integer, defaults to 3
- `draft_rooms.captains` — JSONB array of player UUIDs (`["uuid1", "uuid2", ...]`)
- Legacy columns preserved: `captain1_player_id`, `captain2_player_id`, `captain3_player_id`

### Captain Resolution: `src/lib/captainHelpers.ts`

All captain logic flows through this single module:

| Function | Purpose |
|---|---|
| `getNumTeams(room)` | Returns `num_teams` or 3 for legacy rooms |
| `getCaptainPlayerId(room, n)` | Gets captain N's player ID (JSONB first, legacy fallback) |
| `resolveCaptainNumber(room, playerId)` | Which captain number is this player? |
| `getAllCaptains(room)` | Array of all `{ captainNumber, playerId }` |

**Every page uses these helpers** instead of hardcoding captain1/2/3. Pages updated: CreateDraft, WaitingRoom, DraftBoard, Results, GameNight, NightResults, JoinDraft, QuickDraft.

### Database Migration

`supabase/migrations/20260219_multi_team_support.sql` — comprehensive migration that updates schema + all RPCs (`pick_player_atomic`, `start_draft_if_ready`, `create_quick_draft`, `start_game`, `get_game_night_summary`).

---

## Supabase Setup

Currently shares the **same Supabase project** as kohot.online during development.

- **Project**: `ntpowzcvjkgtdbasjqjq`
- **Dashboard**: https://supabase.com/dashboard/project/ntpowzcvjkgtdbasjqjq
- **Client**: `src/integrations/supabase/client.ts`

When ready to launch for real users, create a separate Supabase project and run all migrations from `supabase/migrations/` in order.

---

## Architecture & Known Gotchas

**Do not change** these patterns:

- **HashRouter + PKCE flow** — The app uses `HashRouter` for static hosting. All routes are `/#/path`. Supabase Auth uses `flowType: 'pkce'` because implicit flow puts `#access_token=` in the URL hash, which overwrites the HashRouter route. **Never switch to implicit flow.**

- **OAuthCallbackHandler** — In `App.tsx`, detects both implicit and PKCE tokens. After processing, cleans up the query string and checks for pending invite tokens.

- **Dual storage for invite tokens** — `pendingInviteToken` is stored in both `sessionStorage` and `localStorage` because email confirmation opens a new tab where `sessionStorage` is empty.

- **RLS + SECURITY DEFINER RPCs** — Most data access goes through RPCs to avoid RLS recursion. Direct table queries work only for owners. Members must use RPCs.

- **DraftBoard uses light theme** — `bg-gray-100` for readability during draft, unlike the rest of the dark emerald theme.

- **Secure session IDs** — `getSecureSessionId()` generates browser session IDs for captain identity claiming (separate from Supabase auth).

- **Sound system** — `src/lib/sounds.ts` plays sound effects and browser TTS. Sound files in `public/sounds/`. Mute toggle persisted in `sessionStorage`. TTS language reads from `localStorage` key `draftpick_lang`.

- **Selfie Avatar Editor** — Camera/gallery capture with oval face crop guide. Outputs PNG with transparent corners.

- **Oval avatars** — `PlayerAvatar` renders photos as ovals (~1:1.35 ratio). Initials fallback stays circular.

- **Photo upload** — `compressPhoto()` (500KB, 400px, WebP) + `uploadPlayerPhoto()` to Supabase storage.

- **Captain helpers** — All captain resolution goes through `src/lib/captainHelpers.ts`. Never hardcode captain1/2/3 logic in pages.

---

## Key Supabase RPCs

| RPC | Used By | Purpose |
|---|---|---|
| `get_user_club` | Dashboard, CreateDraft, ClubSettings | Get user's club |
| `get_club_players` | CreateDraft, Players | Get player pool |
| `get_club_drafts` | Dashboard | Get draft history |
| `get_my_linked_clubs` | useClubContext | Get clubs user belongs to |
| `get_room_players_public` | Multiple pages | Get players for a draft (public) |
| `get_draft_state` | DraftBoard | Get current draft turn |
| `pick_player_atomic` | DraftBoard | Atomic player pick (N-team aware) |
| `claim_player_identity` | JoinDraft | Claim captain identity |
| `auto_identify_player` | JoinDraft | Auto-identify linked user |
| `start_draft_if_ready` | WaitingRoom | Start draft when all captains ready (N-team aware) |
| `peek_invite` | AcceptInvite | Preview invite (anon, read-only) |
| `accept_player_invite` | AcceptInvite | Accept invite + link user |
| `generate_player_invite` | Players | Create 48h invite token |
| `create_quick_draft` | QuickDraft | Anonymous draft (SECURITY DEFINER, N-team aware) |
| `start_game_night` | Results | Create game night from draft |
| `start_game` | GameNight | Start a game (N-team aware) |
| `record_goal` | GameNight | Record goal |
| `end_game` | GameNight | End game, calc winner |
| `end_game_night` | GameNight | End entire night |
| `get_game_night_summary` | GameNight, NightResults | Full night data (N-team aware) |
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
npm test        # Vitest — all tests must pass (24 tests currently)
npm run build   # Vite production build — catches TypeScript errors
```

**Test files:**
- `src/test/pages.test.tsx` — smoke tests for Landing, Auth, AcceptInvite, QuickDraft
- `src/test/invite-flow.test.tsx` — OAuth redirect logic, invite token handling
- `src/test/security.test.ts` — open redirect prevention, token validation
- `src/test/setup.tsx` — mocks for Supabase, framer-motion, matchMedia
- `src/test/test-utils.tsx` — `renderWithProviders()` helper

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

## PWA Icons

Generated via `scripts/generate-icons.mjs` using the `sharp` library. Currently shows "DP" initials on emerald circle. To regenerate after brand changes:

```bash
node scripts/generate-icons.mjs
```

Outputs: `favicon.ico`, `logo.png`, and all icons in `public/icons/`.

---

## Summary: What Makes This App Special

1. **Zero-friction draft**: 2-3 captains join via WhatsApp link, pick players live on their phones
2. **Snake draft fairness**: Randomized order + snake pattern = balanced teams
3. **Flexible team count**: 2-3 teams supported (expandable to 4-5)
4. **WhatsApp-native sharing**: Results shared as formatted text + link
5. **Game night mode**: Timer, live scoring, winner-stays rotation, goal tracking
6. **Club management**: Persistent player pool, invite members, permissions
7. **PWA**: Install on home screen, works offline-ish, push-ready
8. **Sound & TTS**: Crowd effects + voice announcements during draft (language-aware)
9. **Selfie avatars**: Camera capture with oval face crop for player identity
