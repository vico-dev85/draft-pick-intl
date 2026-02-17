# Draft Soccer – Builder Instructions for Claude Code

## Git Workflow

**Repository:** https://github.com/vico-dev85/kohot.online

**IMPORTANT:** When the user says something is "working", "good", "save this", "commit", or similar:
1. Stage all changes: `git add -A`
2. Create a descriptive commit explaining what was fixed/added
3. Push to origin: `git push`
4. Confirm to the user what was committed

**IMPORTANT:** When the user says "deploy", "build", "ship it", or after committing changes:
1. Run `npm run deploy` (runs tests + build)
2. Tell the user: "dist/ is ready — upload to FastPanel"
3. Server path: `/var/www/kohot_online_usr41/data/www/kohot.online`

---

## What you are doing in this repo

Stabilize and restructure the Draft Soccer app into a **working MVP** around one core loop:

> Owner logs in → creates first club → adds player list → before each game selects tonight’s players → runs a 3-captain snake draft → shares final teams via WhatsApp.

**Frontend**: keep and improve the existing React/TypeScript/Vite/Tailwind app.  
**Backend/DB**: you are allowed (and expected) to design a **new Supabase/Postgres schema from scratch** that matches the model below.  
You do NOT need to keep compatibility with the old Lovable database; treat previous tables as disposable.

If PocketBase is already wired in and easier, you may design an equivalent clean schema there, but pick **one primary backend** for MVP (no mixing).

---

## Accounts & Roles (MVP)

- **Who needs an account**
  - Owner / future managers: must log in (Supabase Auth with email/password + Google login).
  - Captains / players / viewers: join drafts/results via link without account.

- For now, treat the logged-in user as the **single owner/manager** of the (single) club in the UI, but design DB tables so one user can own multiple clubs in future.

---

## Core Data Model (for new DB)

Design tables/collections approximately around:

- **User**
  - Auth via Supabase (email + Google OAuth).
  - Can own multiple **clubs** in the schema, even if UI shows only one for now.

- **Club**
  - Fields: id, owner_id, name, default_location, created_at.
  - Each club has:
    - Player pool
    - Sessions/Games
    - Drafts

- **ClubPlayer**
  - Fields: id, club_id, name, photo_url, is_member (optional flag), is_guest_flag (optional), created_at.
  - UI must remain clear even if owner ignores member/guest flags.

- **Session/Game**
  - Fields: id, club_id, date, optional start_time, location (default to club default, editable), created_at.

- **Draft**
  - Fields: id, session_id, room_code, status (`waiting`, `drafting`, `completed`), raffle_order, snake_order, created_at, completed_at.
  - MVP: always 3 captains, 3 teams.

- **DraftPlayer**
  - Fields: id, draft_id, player_name, optional club_player_id, is_captain, picked_by_captain_number, pick_number.
  - Arriving players (12–15 non-captains) + captains are represented here for that draft.

You can choose exact table/field names, but keep this structure.

---

## MVP Flows (implement end-to-end with new DB)

### 1. Owner onboarding

First login:

- Short popup (<10 seconds to read) explains:
  1. Create your club
  2. Add your usual players
  3. On game day, choose who arrives and run a draft
- Then: create club → add players to the club’s pool.

### 2. Select tonight’s players & captains (Session + Draft creation)

- Create Session: set date/time, confirm/edit location (prefill last used for club).
- From club pool:
  - “Select all members” / “Unselect all”.
  - Tap players (member or guest) to mark as **arriving tonight**.
  - Add “other guest” by typing their name.
- Enforce **12–15 arriving non-captain players** before continuing.
- From the arriving list, pick **exactly 3 captains**.
- Create Draft:
  - Store captains as `is_captain = true`.
  - Only non-captain arriving players are in the draftable pool.

### 3. Waiting room & raffle

- Captains join via WhatsApp invite link (room_code based).
- Each captain chooses “I am Player X” from arriving players → mark with **C** and exclude from draftable list.
- Run a random raffle to determine captain pick order and show a short snake-draft explanation.
- Draft cannot start until 3 captains claimed.
- After **90 seconds** with at least 1 but not all 3 connected:
  - Show WhatsApp share/remind button to invite missing captains.

### 4. Live snake draft

- Generate full snake order from raffle (1,2,3,3,2,1,1,2,3,...).
- On captain’s turn:
  - Highlight current captain and available pool.
  - When they click a player, ask: “Do you pick PlayerName this turn?” Yes/No.
  - On Yes:
    - Save pick (no undo).
    - Animate player moving from pool to under that captain.
- When the pool is empty:
  - Draft is final, even if team sizes are uneven (4 vs 5, etc.).
  - Optionally show helper text like “Team A has one fewer player”.

Short disconnects:

- Same browser session auto-rejoins as same captain.
- For MVP, don’t implement replacement captains; just pause on their turn until reconnect.

### 5. Results & sharing

- After draft completes:
  - Create public results page:
    - Club name, date/time, 3 teams, captains with C.
  - WhatsApp share:
    - Prefer sharing the link, plus a simple text fallback.
- Link should **appear valid for 12 hours**:
  - After 12 hours, show “This draft has expired” but keep data stored for future history.

---

## Constraints & Non-goals (MVP)

- UI: mobile-first, Hebrew + RTL only; keep text separate from logic for future multi-language.
- Business rules:
  - 3 captains, 3 teams.
  - 12–15 arriving non-captain players.
- Do **not** build yet:
  - Multi-club UI, 2-captain mode, in-app attendance, game timers/announcements, stats/history pages.

Focus on:  
1) clean new DB schema that fits this model,  
2) stable flows end-to-end,  
3) smooth live draft experience and WhatsApp sharing.

---

## Verification & Testing

**Before every commit, run:**
```bash
npm test        # Vitest — 22 tests covering pages, invite flow, and security
npm run build   # Vite production build — catches TypeScript errors
```

**Test files:**
- `src/test/pages.test.tsx` — smoke tests for Landing, Auth, AcceptInvite, QuickDraft (4 tests)
- `src/test/invite-flow.test.tsx` — OAuth redirect logic, sessionStorage/localStorage invite token handling, dual-storage cleanup (8 tests)
- `src/test/security.test.ts` — open redirect prevention, invite token validation, URL encoding (10 tests)
- `src/test/setup.tsx` — mocks for Supabase, framer-motion, matchMedia
- `src/test/test-utils.tsx` — `renderWithProviders()` helper wrapping all providers

**When adding new pages or flows**, add a smoke test that renders the component and checks key UI elements are present.

---

## Deploy

1. `npm run build` — outputs to `dist/`
2. Upload contents of `dist/` to web hosting root
3. Static hosting with HashRouter — no server-side config needed

---

## Database Migrations

Migrations live in `supabase/migrations/` and must be run manually on the **Supabase SQL Editor** in order:

| # | File | Status |
|---|------|--------|
| 1 | `20260209_player_identity_linking.sql` | Applied |
| 2 | `20260209_fix_user_players_rls.sql` | Applied |
| 3 | `20260209_linked_member_rls.sql` | Applied |
| 4 | `20260209_fix_default_permissions.sql` | Applied |
| 5 | `20260213_peek_invite.sql` | Applied |
| 6 | `20260213_create_quick_draft.sql` | Applied |
| 7 | `20260213_fix_ambiguous_columns.sql` | Applied |
| 8 | `20260213_fix_captain_fk.sql` | Applied |
| 9 | `20260213_invite_permission_default.sql` | Applied |
| 10 | `20260213_invite_request.sql` | Applied |
| 11 | `20260214_game_night.sql` | Applied |

When creating new migrations, add them to this table.

---

## Architecture & Known Gotchas

- **HashRouter + PKCE flow** — The app uses `HashRouter` (not `BrowserRouter`) for static hosting. All routes are `/#/path`. Supabase Auth is configured with `flowType: 'pkce'` (in `src/integrations/supabase/client.ts`) because the default implicit flow puts `#access_token=` in the URL hash, which **overwrites the HashRouter route**. PKCE uses `?code=` in the query string instead, preserving the hash. **Never switch back to implicit flow.**
- **OAuthCallbackHandler** — In `App.tsx`, detects both implicit (`#access_token=`) and PKCE (`?code=`) tokens. After processing, cleans up the query string and checks for pending invite tokens. Uses a 1000ms timeout to allow PKCE code exchange to complete.
- **Dual storage for invite tokens** — Invite tokens (`pendingInviteToken`) are stored in **both** `sessionStorage` and `localStorage`. This is because email confirmation opens in a new browser tab where `sessionStorage` is empty. `OAuthCallbackHandler` checks both and cleans both after use.
- **OAuth + invite flow** — When a user opens an invite link, the token is saved to both storages. After Google OAuth redirect or email confirmation, `OAuthCallbackHandler` finds the token and redirects to `/accept-invite?token=...` (not Dashboard).
- **AcceptInvite is self-contained** — The invite page has inline auth (Google OAuth + email signup/login). Users never navigate to the separate Auth page during the invite flow. The page calls `peek_invite` RPC for a personalized greeting but falls back gracefully if the RPC returns 404 (migration not applied).
- **RLS + SECURITY DEFINER** — Most data access goes through RPCs (`get_club_players`, `get_club_drafts`, etc.) to avoid RLS recursion. Direct table queries are used as fallbacks **only for owners** — members must use RPCs since RLS filters by `auth.uid() = user_id` which only matches the owner.
- **QuickDraft uses RPC** — Anonymous quick drafts go through the `create_quick_draft` SECURITY DEFINER RPC because RLS policies on `draft_rooms` require `auth.uid() = creator_user_id`. The `creator_user_id` column is nullable to support anonymous drafts.
- **Permissions** — `can_create_drafts` defaults to `true`. `can_send_invites` defaults to `false` (migration #9). Owner grants invite permission explicitly via Players page toggle.
- **DraftBoard uses light theme** — `bg-gray-100` for readability during the draft, unlike the rest of the app which uses the emerald dark theme.
- **Session IDs** — `getSecureSessionId()` generates a persistent browser session ID used for captain identity claiming. This is separate from Supabase auth.

- **Sound system** — `src/lib/sounds.ts` provides `playSound`, `speak` (Hebrew TTS), `playRandomCrowd`, and mute toggle (persisted in sessionStorage). Used in WaitingRoom (captain-enter, drumroll, reveal) and DraftBoard (ding+TTS on turn, crowd+TTS on picks, whistle+TTS on complete). Sound files are in `public/sounds/`. Mute toggle in header of both pages.
- **Photo upload** — `src/lib/photoUpload.ts` provides shared `compressPhoto` (500KB, 400px, WebP) and `uploadPlayerPhoto` (to `player-photos` bucket). Used by Players.tsx and Dashboard.tsx. Owner photo stored via `supabase.auth.updateUser({ data: { avatar_url } })`.
- **Selfie Avatar Editor** — `src/components/SelfieAvatarEditor.tsx` is a Drawer-based selfie capture tool. Two steps: pick source (camera/gallery) → drag/zoom face into oval guide → canvas crop → returns File. Used on Dashboard for both owner and member cards. Camera input uses `capture="user"` to trigger front camera on mobile. Crop utility in `src/lib/cropFace.ts` (pure function, no React).
- **Oval avatars** — `PlayerAvatar` renders photos in oval shape (taller than wide, ~1:1.35 ratio) and initials in circular shape. Oval propagates to all usages: draft chips, waiting room, results, etc.
- **Dashboard cards** — Members see a profile card with oval avatar (tap → selfie editor). Owners see a card with Crown badge + "מנהל הקבוצה". Members do NOT see the "שחקנים" header button. Member name comes from `user_players.name` (pool name), NOT from auth metadata.
- **Bobblehead cancelled** — `BobbleheadAvatar.tsx` exists but is NOT used. The soccer player body composite feature was cancelled. Oval face photos are used directly without body template.
- **Google OAuth consent screen** — Shows "המשך אל ntpowzcvjkgtdbasjqjq.supabase.co" because the OAuth callback redirects through Supabase. Only fixable with Supabase Custom Domain (Pro plan, $25/month). Not a code issue.

---

## Key Hooks

- `useAuth()` — Supabase auth state (user, session, signIn, signOut, signInWithGoogle). `signUp` accepts optional `redirectTo` param for custom email confirmation redirect URLs.
- `useClubContext()` — Single source of truth for owner/member state. Returns `{ currentClub, isOwner, isMember, permissions, playerId, playerName, playerPhoto }`

---

## Security

- **Open redirect prevention**: `src/lib/safeRedirect.ts` validates all redirect paths. Used in `App.tsx`, `Auth.tsx`, `AcceptInvite.tsx`.
- **Invite tokens**: UUID format only, validated in RPCs. Expire after 48 hours. `peek_invite` is read-only and returns only player_name + club_name (no IDs, no emails).
- **No secrets in git**: `.env.local` is in `.gitignore`.
- **All redirect targets** go through `getSafeRedirectPath()` before navigation.
- **SECURITY DEFINER RPCs** for anonymous access: `peek_invite` (read-only, anon), `create_quick_draft` (write, anon). Both have `SET search_path TO 'public'` to prevent schema injection.

---

## Planned: International LTR Fork

User wants to keep Hebrew kohot.online separate and create a new LTR-only international version:
- Languages: English, Spanish, French, German, Italian, Dutch
- Approach: Fork codebase, strip RTL/Hebrew, add react-i18next
- **Not yet started** — waiting for user to initiate

---

## Other docs in this repo

There is a file at `docs/legacy-handover.md` describing the original Lovable implementation and its Supabase schema.

Use it **only** to understand the current code and tables.
For all new work (flows, DB design, behavior), follow **this `CLAUDE.md`**, even if it contradicts the legacy handover.
