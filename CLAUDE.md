# PickNKick — International Soccer Draft App

## What This Is

An **international, English-first** soccer/football draft app for pickup groups. Forked from [kohot.online](https://kohot.online) (Hebrew RTL version) and fully transformed to LTR with i18n support and rebranded as **PickNKick**.

**Product name**: PickNKick
**Tagline**: "Fair teams. No arguments."
**Target languages**: English (default), Spanish, French, German, Italian, Dutch
**Direction**: LTR only (no RTL languages in v1)

---

## Current State (as of Feb 2026)

The app is **functional in English** with a complete purple rebrand.

**Completed:**
- Full i18n system (react-i18next, namespace-per-page, language picker)
- All pages translated to English
- All RTL removed, LTR-first
- Complete rebrand: emerald → purple color system, Satoshi + JetBrains Mono fonts
- Two visual modes: light utility (Dashboard, Players, CreateDraft) + dark event (Landing, WaitingRoom, Results)
- Logo component uses PNG image (`public/logo.png`) with light/dark variant support
- Mesh gradient backgrounds on light utility pages (`bg-mesh-light`)
- Auth page has photo background (dark overlay + white form card)
- TTS auto-detects Hebrew/Arabic names via `detectTtsLang()` in `sounds.ts`
- Oval avatars for both photos and initials placeholders (1:1.35 ratio)
- Sticky bottom bars on CreateDraft player/captain selection steps
- Multi-team support (2-3 teams, expandable to 4-5)
- HTTPS force redirect in `.htaccess`
- Security hardening: crypto RNG for room codes/raffle, UUID validation on invite tokens, safe redirect validation on localStorage, error message sanitization
- 77 tests passing (63 security tests), production build clean
- Video content plan (`docs/VIDEO-CONTENT-PLAN.md`)

**Not yet done:**
- OG image (1200x630, needs design)
- PWA icons still show old "DP" initials — replace with new logo
- Production domain not finalized
- Translations for ES, FR, DE, IT, NL
- Landing page background image (new concept needed)
- Blog/content pages for SEO (`public/blog/`)
- Hero demo video for landing page

**Docs:**
- `docs/LAUNCH-OUTREACH-STRATEGY.md` — **master launch playbook** (6-week timeline, channel priorities, ambassador strategy, metrics)
- `docs/TIKTOK-STRATEGY.md` — TikTok content strategy (2026 algorithm data, content pillars, posting schedule, cross-posting, production guide)
- `docs/TRANSLATION-AMBASSADOR-PLAN.md` — finding native-speaking players on Reddit to help localize translations per culture
- `docs/AMBASSADOR-OUTREACH-PLAN.md` — ambassador concept, country-by-country outreach, DM templates, phase plan
- `docs/REDDIT-LAUNCH-PLAN.md` — Reddit posting schedule, per-subreddit posts, response strategy
- `docs/REDDIT-LOCAL-SUBS.md` — local city/country subreddits with templates and posting schedule
- `docs/FREE-GROWTH-CHANNELS.md` — all free channels: WhatsApp, Facebook, Instagram/TikTok, Twitter, YouTube, SEO, Quora, directories
- `docs/PRESS-OUTREACH-PLAN.md` — press kit, tiered media targets, email templates, outreach phases
- `docs/VIDEO-CONTENT-PLAN.md` — 12-video production plan with storyboards
- `docs/REBRAND-PLAN.md` — brand research synthesis and implementation plan
- `docs/ROADMAP.md` — product roadmap with launch checklist
- `docs/research/01-06` — brand research studies (naming, colors, typography, visual language, competitive, tone)

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

## Design System

### Brand Colors
- **Primary**: `#7C3AED` (purple) — CTAs, active states, brand
- **Accent**: `#A3E635` (lime) — energy moments, highlights
- **Captain gold**: `#FBBF24` — captain highlights
- **Team colors**: Blue `#3B82F6`, Red `#EF4444`, Amber `#F59E0B`, Green `#22C55E`, Pink `#EC4899`

### Typography
- **Display/Heading**: Satoshi (Black 900, Bold 700) — `font-heading`
- **Body**: Inter (Regular 400, Medium 500) — default
- **Mono**: JetBrains Mono (Regular 400) — `font-mono` for room codes, timers

### Two Visual Modes
- **Light utility** (Dashboard, Players, CreateDraft, Auth form, Privacy, Terms): `bg-background bg-mesh-light`, solid cards, minimal animation
- **Dark event** (Landing, WaitingRoom, DraftBoard header, Results, GameNight, NightResults): dark purple gradients, glassmorphic cards, full animations

### Logo
- Component: `src/components/ui/logo.tsx` — renders `public/logo.png` as `<img>`
- `variant="light"` applies `brightness-0 invert` CSS filter for dark backgrounds
- Sizes: sm (24px), md (32px), lg (40px), xl (56px) height
- To change the logo: replace `public/logo.png`

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
      legal.json        ← Privacy, Terms
```

- Language stored in `localStorage` key: `draftpick_lang`
- Language picker in app header (`LanguagePicker` component)
- TTS in `src/lib/sounds.ts` reads language dynamically; `detectTtsLang()` auto-detects Hebrew/Arabic names
- `<html lang="">` attribute updated on language change

---

## Multi-Team Architecture

The app supports **2-3 teams** (expandable to 4-5).

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

**Every page uses these helpers** instead of hardcoding captain1/2/3.

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

- **Dual storage for invite tokens** — `pendingInviteToken` is stored in both `sessionStorage` and `localStorage` because email confirmation opens a new tab where `sessionStorage` is empty. Tokens are validated as UUID format before storage.

- **RLS + SECURITY DEFINER RPCs** — Most data access goes through RPCs to avoid RLS recursion. Direct table queries work only for owners. Members must use RPCs.

- **DraftBoard uses light theme** — `bg-gray-100` for readability during draft.

- **Secure session IDs** — `getSecureSessionId()` in `src/lib/sessionManager.ts` generates cryptographic browser session IDs using `crypto.getRandomValues()` for captain identity claiming.

- **Sound system** — `src/lib/sounds.ts` plays sound effects and browser TTS. Sound files in `public/sounds/`. Mute toggle persisted in `sessionStorage`. `detectTtsLang()` auto-detects Hebrew/Arabic characters in player names and switches TTS voice accordingly.

- **Selfie Avatar Editor** — Camera/gallery capture with oval face crop guide. Outputs PNG with transparent corners.

- **Oval avatars** — `PlayerAvatar` renders both photos and initials as ovals (~1:1.35 ratio).

- **Photo upload** — `compressPhoto()` (500KB, 400px, WebP) + `uploadPlayerPhoto()` to Supabase storage.

- **Captain helpers** — All captain resolution goes through `src/lib/captainHelpers.ts`. Never hardcode captain1/2/3 logic in pages.

- **Room codes** — Generated with `crypto.getRandomValues()` (not Math.random) for unpredictability. 4 chars from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (excludes ambiguous 0/O/1/I).

---

## Key Supabase RPCs

| RPC | Used By | Purpose |
|---|---|---|
| `get_user_club` | Dashboard, CreateDraft, ClubSettings | Get user's club |
| `get_club_players` | CreateDraft, Players | Get player pool (includes `invite_requested_at`) |
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
| `useAnnouncementQueue()` | Queue TTS + sound announcements (uses `detectTtsLang`) |
| `useInstallPrompt()` | PWA install prompt detection |

---

## Verification & Testing

**Before every commit, run:**
```bash
npm test        # Vitest — all tests must pass (77 tests across 4 suites)
npm run build   # Vite production build — catches TypeScript errors
```

**Test files:**
- `src/test/security.test.ts` — 63 security tests: redirects, tokens, room codes, raffle, sessions, TTS, XSS, storage, schemas, env vars
- `src/test/pages.test.tsx` — smoke tests for Landing, Auth, AcceptInvite, QuickDraft
- `src/test/invite-flow.test.tsx` — OAuth redirect logic, invite token handling
- `src/test/game-night.test.tsx` — GameNight and NightResults smoke tests
- `src/test/setup.tsx` — mocks for Supabase, framer-motion, matchMedia
- `src/test/test-utils.tsx` — `renderWithProviders()` helper

---

## Security

These patterns must be preserved:

- **Open redirect prevention**: `src/lib/safeRedirect.ts` validates all redirect paths — used in Auth.tsx, App.tsx
- **Invite tokens**: UUID format validated client-side before storage, validated server-side in RPCs, expire after 48 hours
- **returnTo validation**: Auth.tsx validates `returnTo` with `isSafeRedirectPath()` before storing in localStorage
- **Cryptographic RNG**: Room codes and raffle order use `crypto.getRandomValues()`, not `Math.random()`
- **Error sanitization**: Auth error fallback returns i18n `unexpectedError`, never raw backend messages
- **SECURITY DEFINER RPCs**: `peek_invite` (read-only, anon) and `create_quick_draft` (write, anon) both have `SET search_path TO 'public'`
- **No secrets in git**: `.env.local` is in `.gitignore`
- **HTTPS forced**: `.htaccess` redirects HTTP → HTTPS

---

## SEO Limitations

The app uses **HashRouter** (`/#/path`), which means only the landing page (`/`) is crawlable by search engines. This is a deliberate trade-off for PKCE OAuth compatibility.

**Workarounds available:**
- Static HTML pages in `public/blog/` bypass the SPA and are fully crawlable
- `robots.txt` and `sitemap.xml` should be added to `public/`
- Dynamic page titles via `useEffect` + `document.title` (not yet implemented)
- Structured data (JSON-LD) can be added to `index.html`

See SEO audit notes in session history for full details.

---

## Deploy

1. `npm run build` — outputs to `dist/`
2. Upload contents of `dist/` to hosting (static hosting, no SSR needed)
3. HashRouter means all routes work without server-side rewrite rules
4. `.htaccess` in `public/` forces HTTPS redirect

---

## Logo & PWA Icons

- **Logo**: `public/logo.png` — used by `src/components/ui/logo.tsx` as an `<img>` tag
- To change: replace `public/logo.png` with new image
- Light variant uses CSS `brightness-0 invert` filter
- **PWA icons** in `public/icons/` — still show old "DP" initials, need updating to match new logo
- Icon generation script: `scripts/generate-icons.mjs` (uses `sharp` library)

---

## Summary: What Makes This App Special

1. **Zero-friction draft**: 2-3 captains join via WhatsApp link, pick players live on their phones
2. **Snake draft fairness**: Cryptographically randomized order + snake pattern = balanced teams
3. **Flexible team count**: 2-3 teams supported (expandable to 4-5)
4. **WhatsApp-native sharing**: Results shared as formatted text + link
5. **Game night mode**: Timer, live scoring, winner-stays rotation, goal tracking
6. **Club management**: Persistent player pool, invite members, permissions
7. **PWA**: Install on home screen, works offline-ish, push-ready
8. **Sound & TTS**: Crowd effects + voice announcements during draft (auto-detects Hebrew/Arabic names)
9. **Selfie avatars**: Camera capture with oval face crop for player identity
10. **Security-hardened**: Crypto RNG, UUID validation, redirect prevention, error sanitization
