# kohot.online - Project Status & Roadmap

**Last Updated:** February 9, 2026
**Status:** Active development - MVP complete, member experience shipping

---

## Current State Summary

The app is a working MVP for running snake drafts for pickup soccer games. Core flow, player identity linking, and member experience are all implemented.

### What Works Now

#### Core Draft Flow
- Owner creates account (email or Google OAuth)
- Owner adds players to their library (player pool) with categories (regular/occasional)
- Owner creates draft: selects 12-15 players, picks 3 captains
- "Select all regulars" button for fast player selection
- Generates 4-letter room code for sharing
- Captains join via WhatsApp link (no account needed)
- Captains claim their identity from player list
- Raffle determines pick order (animated hand)
- Live snake draft with real-time updates
- Results page with teams, sharing, emoji reactions

#### Quick Draft (No Account)
- Anyone can create a draft without signing up
- Type player names manually (12-15 players)
- Full draft experience
- Incentive to create account shown on Results page

#### Player Identity Linking (NEW - Implemented)
- Owner generates invite link for any player
- Invited user opens link, sees Google OAuth button
- After login, automatically linked as that player (no manual confirm step)
- Linked members see:
  - Dashboard with profile card (avatar, name, club, auto-ID badge)
  - Read-only Players page ("this is me" badge on own row, can edit own photo)
  - Club drafts list
  - "Create Draft" button (if permitted)
- Permissions (`can_create_drafts`, `can_send_invites`) default to **true** — owner revokes via toggle
- Auto-identify: linked members joining a draft are automatically matched to their player

#### Smart Results CTAs
- **Not logged in:** "Played today? Create account — next time you'll be auto-identified" + signup button
- **Logged in, not linked:** "Part of the group? Ask the organizer for an invite"
- **Already linked:** "You're a member of [club]"

#### Authentication
- Email/password signup and login
- Google OAuth (working)
- Password reset via email
- OAuth callback correctly handles pending invite tokens

#### Visual Design
- Consistent emerald pitch theme across all pages
- Mobile-first, Hebrew RTL
- Light theme for draft board (readability)
- Background images on Landing and Auth pages

---

## Technical Stack

- **Frontend:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS + shadcn/ui components
- **State:** React Query + Supabase Realtime
- **Backend:** Supabase (Postgres + Auth + Realtime)
- **Routing:** HashRouter (for static hosting compatibility)
- **Testing:** Vitest + React Testing Library (19 tests)
- **Hosting:** Static files on web server

---

## Verification & Testing

```bash
npm test        # 19 Vitest tests — pages, invite flow, security
npm run build   # Vite production build — catches TypeScript errors
```

**Test files:**
- `src/test/pages.test.tsx` — smoke tests for Landing, Auth, AcceptInvite, QuickDraft (4 tests)
- `src/test/invite-flow.test.tsx` — OAuth redirect logic, invite token handling (5 tests)
- `src/test/security.test.ts` — open redirect prevention, invite token validation, URL encoding (10 tests)
- `src/test/setup.tsx` — mocks for Supabase, framer-motion, matchMedia
- `src/test/test-utils.tsx` — `renderWithProviders()` wrapping all providers

---

## Database Schema (Current)

```sql
-- Users via Supabase Auth (auth.users)

-- Clubs
clubs (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,  -- owner
  name TEXT,
  default_location TEXT,
  default_notes TEXT,
  created_at TIMESTAMPTZ
)

-- Player pool for each club
user_players (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,     -- club owner
  club_id UUID REFERENCES clubs,
  name TEXT,
  photo_url TEXT,
  category TEXT DEFAULT 'regular',         -- 'regular' or 'occasional'
  linked_user_id UUID REFERENCES auth.users, -- linked member account
  can_create_drafts BOOLEAN DEFAULT true,  -- member permission
  can_send_invites BOOLEAN DEFAULT true,   -- member permission
  invite_token UUID UNIQUE,                -- pending invite
  invite_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)

-- Draft rooms
draft_rooms (
  id UUID PRIMARY KEY,
  creator_user_id UUID REFERENCES auth.users,  -- NULL for Quick Drafts
  created_by_user_id UUID REFERENCES auth.users, -- who pressed "create"
  club_id UUID REFERENCES clubs,
  draft_name TEXT,
  room_code TEXT UNIQUE,       -- 4-letter code
  status TEXT,                 -- 'waiting', 'drafting', 'completed'
  captain1_player_id UUID,
  captain2_player_id UUID,
  captain3_player_id UUID,
  draft_order INTEGER[],       -- Pre-generated snake order
  raffle_order INTEGER[],      -- [1,2,3] shuffled
  location TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
)

-- Players in a specific draft
draft_room_players (
  id UUID PRIMARY KEY,
  room_id UUID REFERENCES draft_rooms,
  player_id UUID REFERENCES user_players,  -- NULL for guests
  guest_name TEXT,
  is_captain BOOLEAN,
  claimed_by_session_id TEXT,
  picked_by_captain_number INTEGER,
  pick_number INTEGER,
  created_at TIMESTAMPTZ
)
```

### RPC Functions (SECURITY DEFINER)

| Function | Purpose |
|----------|---------|
| `get_user_club()` | Get/create owner's club |
| `get_my_linked_clubs()` | Get all clubs user is owner/member of |
| `get_club_players(club_id)` | Get players for owners + linked members |
| `get_club_drafts(club_id)` | Get drafts for owners + linked members |
| `auto_identify_player(room_code)` | Match logged-in user to draft player |
| `generate_player_invite(player_id)` | Create 48-hour invite token |
| `accept_player_invite(token)` | Link account + grant permissions |
| `unlink_player(player_id)` | Remove link (owner or self) |
| `update_player_permissions(...)` | Toggle permissions (owner only) |
| `update_player_category(...)` | Change regular/occasional (owner only) |
| `claim_player_identity(...)` | Captain claims identity in draft |
| `get_room_players_public(room_code)` | Public player list for joining |

### Migrations (Applied)

| # | File | Description |
|---|------|-------------|
| 0 | `00000000000000_initial_schema.sql` | Base tables |
| 1 | `20260209_player_identity_linking.sql` | Categories, permissions, invite flow RPCs |
| 2 | `20260209_fix_user_players_rls.sql` | Fix RLS recursion |
| 3 | `20260209_linked_member_rls.sql` | Club RPCs, auto-identify, updated get_my_linked_clubs |
| 4 | `20260209_fix_default_permissions.sql` | Default permissions to true, fix accept_player_invite |

---

## Code Structure

```
src/
├── components/
│   ├── ui/              # shadcn/ui components
│   ├── draft/           # Draft-specific components
│   │   ├── PlayerChip.tsx
│   │   ├── TeamColumn.tsx
│   │   ├── ConfirmPickModal.tsx
│   │   └── PickAnnouncement.tsx
│   ├── PlayerAvatar.tsx
│   └── ClubSettings.tsx
├── hooks/
│   ├── useAuth.tsx       # Auth context (user, signIn, signInWithGoogle, signOut)
│   ├── useClubContext.tsx # Owner/member context (club, permissions, player info)
│   └── use-toast.ts
├── integrations/
│   └── supabase/
│       ├── client.ts
│       └── types.ts
├── lib/
│   ├── draftUtils.ts     # Room codes, draft order, session IDs
│   └── safeRedirect.ts   # Open redirect prevention
├── pages/
│   ├── Landing.tsx        # Home page (auto-redirect if logged in)
│   ├── Auth.tsx           # Login/signup (email + Google)
│   ├── Dashboard.tsx      # Owner: drafts + management / Member: profile + drafts
│   ├── Players.tsx        # Owner: full CRUD / Member: read-only + own photo
│   ├── CreateDraft.tsx    # 4-step draft creation (permission-gated)
│   ├── QuickDraft.tsx     # No-account draft creation
│   ├── JoinDraft.tsx      # Claim identity (auto-identify for linked members)
│   ├── WaitingRoom.tsx    # Captains wait for raffle
│   ├── DraftBoard.tsx     # Live snake draft
│   ├── Results.tsx        # Final teams + smart CTAs
│   ├── AcceptInvite.tsx   # Google OAuth + auto-accept invite
│   └── NotFound.tsx
├── test/
│   ├── setup.tsx          # Supabase/framer-motion mocks
│   ├── test-utils.tsx     # renderWithProviders helper
│   ├── pages.test.tsx     # Page smoke tests (4)
│   ├── invite-flow.test.tsx # Invite/OAuth redirect logic (5)
│   └── security.test.ts   # Open redirect + token validation (10)
└── App.tsx                # Routes, OAuthCallbackHandler, providers
```

---

## Architecture & Known Gotchas

- **HashRouter** — Uses `HashRouter` (not `BrowserRouter`) for static hosting. All routes are `/#/path`. OAuth tokens arrive in the URL hash and are handled by `OAuthCallbackHandler` in `App.tsx` before the router loads.
- **OAuth + invite flow** — When a user opens an invite link, the token is saved to `sessionStorage`. After Google OAuth redirect, `OAuthCallbackHandler` checks for `pendingInviteToken` in sessionStorage and redirects to AcceptInvite (not Dashboard). The AcceptInvite page auto-accepts.
- **RLS + SECURITY DEFINER** — Most data access goes through RPCs to avoid RLS recursion. Direct table queries are used as fallbacks.
- **Permissions default to true** — `can_create_drafts` and `can_send_invites` are true by default. The owner revokes via toggle, not grants.
- **DraftBoard uses light theme** — `bg-gray-100` for readability during the draft.
- **Session IDs** — `getSecureSessionId()` generates a persistent browser session ID for captain identity claiming. Separate from Supabase auth.

### Style Mapping (Emerald Pitch Theme)
- `bg-card` → `bg-black/30 backdrop-blur-sm`
- `border-border` → `border-white/10`
- `text-foreground` → `text-white`
- `text-muted-foreground` → `text-white/60`
- Primary button → `bg-emerald-500 hover:bg-emerald-600`

---

## Configuration Constants

In `CreateDraft.tsx` and `QuickDraft.tsx`:

```typescript
const NUM_TEAMS = 3;      // Ready for 2-team mode
const MIN_PLAYERS = 12;   // Total including captains
const MAX_PLAYERS = 15;   // Total including captains
```

---

## Security

- **Open redirect prevention**: `src/lib/safeRedirect.ts` validates all redirect paths before navigation
- **Invite tokens**: UUID format only, expire after 48 hours, validated server-side in RPCs
- **No secrets in git**: `.env.local` is gitignored
- **10 security tests** covering redirect validation, token formats, URL encoding

---

## Next Steps

1. **Test invite + auto-identify flows** end-to-end on production
2. **2-team mode** — Code ready, just config change + UI toggle
3. **International LTR fork** — Separate codebase for English/Spanish/French/German/Italian/Dutch with react-i18next
4. **Supabase CLI** — Replace manual SQL editor with `npx supabase db push`
5. **Supabase type generation** — `npx supabase gen types typescript` for type safety

---

## Quick Resume Checklist

When resuming development:

1. Read `CLAUDE.md` (builder instructions) and this document
2. `git pull && npm install`
3. `npm test` — verify 19 tests pass
4. `npm run dev` — start dev server
5. Check for any pending migrations in `supabase/migrations/`

---

## Environment Setup

### Required Environment Variables
```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJxxxx...
```

### Deployment
```bash
npm test && npm run build
# Upload contents of 'dist' folder to web hosting root
```

---

## Contact & Resources

- **Repo:** github.com/vico-dev85/kohot.online
- **Production:** https://kohot.online
- **Supabase Dashboard:** supabase.com/dashboard
