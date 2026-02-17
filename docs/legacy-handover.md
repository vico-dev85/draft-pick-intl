> ⚠️ IMPORTANT – LEGACY IMPLEMENTATION DOC  
> This document describes the **original Lovable implementation** and its current Supabase schema.  
> It is **not** the product spec for the next MVP iteration.
>
> When there is any conflict between this file and `CLAUDE.md`:
> - **`CLAUDE.md` is the source of truth** for product behavior, data model, and future direction.
> - This file is only for understanding the existing code and database so you can refactor, migrate, or replace them.
>
> It is allowed to:
> - Change or replace the database schema described here
> - Simplify or remove legacy tables/RPCs
> - Adjust flows to match `CLAUDE.md`

# Draft Soccer ⚽ - Project Handover Document

> **Last Updated:** February 2025  
> **Language:** Hebrew-only application  
> **Status:** Functional MVP with real-time capabilities

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Architecture Overview](#architecture-overview)
4. [Database Schema](#database-schema)
5. [Key Features](#key-features)
6. [User Flows](#user-flows)
7. [Real-time Implementation](#real-time-implementation)
8. [Security Model](#security-model)
9. [Known Issues & Technical Debt](#known-issues--technical-debt)
10. [Future Roadmap](#future-roadmap)
11. [Development Notes](#development-notes)

---

## 🎯 Project Overview

**Draft Soccer** is a Hebrew SaaS web application for managing live snake drafts to divide players into balanced soccer teams. It's designed for casual soccer groups in Israel who meet regularly to play and need a fair way to divide players into teams.

### Core Value Proposition
- Create drafts in under a minute
- Share room codes via WhatsApp
- 3 captains pick players in real-time using snake draft order
- All participants see picks instantly

### Target Users
- Organizers of recreational soccer games (הארגן)
- Captains who pick players
- Players who want to see team compositions

---

## 🛠 Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for build tooling
- **React Router v6** for navigation
- **TanStack Query** for server state management
- **Tailwind CSS** with shadcn/ui components
- **Framer Motion** for animations

### Backend (Lovable Cloud / Supabase)
- **PostgreSQL** database with RLS policies
- **Supabase Auth** for email/password authentication
- **Supabase Realtime** for live updates (Presence + Broadcast + Postgres Changes)
- **Supabase Storage** for player photos
- **Edge Functions** for session validation

### Key Dependencies
```json
{
  "@supabase/supabase-js": "^2.89.0",
  "framer-motion": "^12.23.26",
  "browser-image-compression": "^2.0.2",
  "lucide-react": "^0.462.0"
}
```

---

## 🏗 Architecture Overview

### Application Structure

```
src/
├── pages/               # Route-based pages
│   ├── Landing.tsx      # Public landing page
│   ├── Auth.tsx         # Login/Signup
│   ├── Dashboard.tsx    # User's draft list
│   ├── Players.tsx      # Player library management
│   ├── CreateDraft.tsx  # Multi-step draft creation wizard
│   ├── JoinDraft.tsx    # Claim player identity
│   ├── WaitingRoom.tsx  # Pre-draft lobby with presence
│   ├── DraftBoard.tsx   # Live draft picking UI
│   └── Results.tsx      # Final team compositions
├── components/
│   ├── ui/              # shadcn/ui components
│   ├── PlayerAvatar.tsx # Player display with initials/photo
│   ├── CaptainWheel.tsx # Captain display component
│   └── FeatureCard.tsx  # Landing page feature cards
├── hooks/
│   ├── useAuth.tsx      # Auth context provider
│   └── use-toast.ts     # Toast notifications
├── lib/
│   ├── draftUtils.ts    # Draft logic (snake order, room codes)
│   └── sessionManager.ts # Browser session ID management
└── integrations/
    └── supabase/
        ├── client.ts    # Auto-generated Supabase client
        └── types.ts     # Auto-generated TypeScript types
```

### Route Structure

| Route | Page | Access |
|-------|------|--------|
| `/` | Landing | Public |
| `/auth` | Auth | Public |
| `/dashboard` | Dashboard | Authenticated |
| `/players` | Players | Authenticated |
| `/create-draft` | CreateDraft | Authenticated |
| `/join/:roomCode` | JoinDraft | Public |
| `/room/:roomCode` | WaitingRoom | Public (with session) |
| `/draft/:roomCode` | DraftBoard | Public (with session) |
| `/results/:roomCode` | Results | Public |

---

## 🗄 Database Schema

### Tables

#### `user_players`
Personal player library for each organizer.
```sql
- id: UUID (PK)
- user_id: UUID (FK to auth.users)
- name: TEXT
- photo_url: TEXT (nullable)
- created_at: TIMESTAMP
```

#### `draft_rooms`
Draft sessions (private - contains creator_user_id).
```sql
- id: UUID (PK)
- creator_user_id: UUID (FK to auth.users)
- draft_name: TEXT
- room_code: TEXT (4 chars, unique)
- status: TEXT ('waiting', 'drafting', 'completed')
- captain1_player_id: UUID (FK to user_players)
- captain2_player_id: UUID (FK to user_players)
- captain3_player_id: UUID (FK to user_players)
- draft_order: JSONB (snake order array)
- current_turn_captain_number: INTEGER (1-3)
- current_pick_number: INTEGER
- started_at: TIMESTAMP
- completed_at: TIMESTAMP
- created_at: TIMESTAMP
```

#### `draft_rooms_public`
Public view of draft_rooms (excludes creator_user_id for security).

#### `draft_room_players`
Players assigned to a specific draft.
```sql
- id: UUID (PK)
- room_id: UUID (FK to draft_rooms)
- player_id: UUID (FK to user_players, nullable for guests)
- is_captain: BOOLEAN
- is_guest: BOOLEAN
- guest_name: TEXT (nullable)
- claimed_by_session_id: TEXT (browser session)
- picked_by_captain_number: INTEGER (1-3, nullable)
- pick_number: INTEGER (order picked)
- created_at: TIMESTAMP
```

#### `captain_connections` (Legacy - replaced by Presence API)
Tracks captain online status (kept for backward compatibility).

#### `profiles`
User profile data.
```sql
- id: UUID (PK)
- user_id: UUID (FK to auth.users)
- email: TEXT
- created_at/updated_at: TIMESTAMP
```

### Key RPC Functions

- `get_room_players_public(p_room_code)` - Fetches players with display names/photos without exposing user_id
- `claim_player_identity(p_draft_room_player_id, p_session_id)` - Securely claim a player identity
- `pick_player_atomic(p_room_id, p_captain_number, p_player_id, p_pick_number, p_session_id)` - Atomic pick with validation
- `create_captain_connection(...)` - Legacy captain connection tracking
- `update_captain_heartbeat(...)` - Legacy heartbeat mechanism

---

## ✨ Key Features

### 1. Player Library Management
- Add/edit/delete players with optional photos
- Photo compression and WebP conversion
- Search functionality for large libraries
- Unique names per user enforced

### 2. Multi-Step Draft Creation Wizard
1. **Name Step:** Enter draft name
2. **Players Step:** Select players from library (min 6)
3. **Captains Step:** Choose 3 captains from selected players
4. **Confirm Step:** Review and create

### 3. Room Code Sharing
- 4-character alphanumeric room codes
- WhatsApp deep linking support (`/?join=CODE`)
- Copy to clipboard functionality

### 4. Identity Claiming
- Captains and players claim their identity via session ID
- One claim per session per room
- Prevents duplicate claims

### 5. Real-time Waiting Room
- Supabase Presence API shows connected captains
- Auto-start when all 3 captains connect
- Visual connection indicators (online/offline)

### 6. Live Snake Draft
- Turn-based picking with visual indicators
- Snake order: 1,2,3,3,2,1,1,2,3,...
- Instant updates via Broadcast + Postgres Changes
- Pick confirmation with player feedback

### 7. Results & Sharing
- Final team compositions display
- Share results via native share / clipboard
- Direct home navigation

---

## 🔄 User Flows

### Organizer Flow (Creator)
```
Landing → Auth → Dashboard → Players (manage library)
                          ↓
                    Create Draft → Waiting Room → Draft Board → Results
```

### Captain Flow (Participant)
```
WhatsApp Link → Landing (deep link) → Join Draft (claim identity)
                                    ↓
                              Waiting Room → Draft Board → Results
```

### Draft Flow State Machine
```
waiting → drafting → completed
  │          │           │
  │          │           └→ Results page
  │          └→ DraftBoard (active picking)
  └→ WaitingRoom (captains connecting)
```

---

## ⚡ Real-time Implementation

### Presence API (WaitingRoom)
```typescript
// Channel: presence-room-{roomId}
// Tracks: captain connections
const channel = supabase.channel(`presence-room-${room.id}`, {
  config: { presence: { key: sessionId } }
});

channel.track({
  role: "captain" | "viewer",
  captain_number: 1 | 2 | 3 | null,
  draft_room_player_id: string,
  display_name: string,
  online_at: ISO timestamp
});
```

### Broadcast (Draft Events)
```typescript
// Event: draft_start (WaitingRoom → all clients)
// Event: player_picked (DraftBoard → all clients)
channel.send({
  type: "broadcast",
  event: "player_picked",
  payload: { room_id, captain_number, player_id, pick_number }
});
```

### Postgres Changes (Fallback)
```typescript
// Watches: draft_rooms_public, draft_room_players
// Triggers: fetchData() on changes
```

---

## 🔐 Security Model

### Row Level Security (RLS)
- `user_players`: Users can only CRUD their own players
- `draft_rooms`: Creator can manage; participants via session validation
- `draft_room_players`: Public read via RPC, updates via secure RPCs
- `storage.objects`: User-folder-based photo access

### Session-Based Authorization
- Browser session ID stored in localStorage
- Validated server-side in RPC functions
- No authentication required for participants (captains/players)
- Only organizers need accounts

### Public vs Private Data
- `draft_rooms` exposes `creator_user_id` only to creator
- `draft_rooms_public` view hides sensitive fields
- `get_room_players_public` RPC provides safe player data

---

## ⚠️ Known Issues & Technical Debt

### Current Issues
1. **DEFINER_OR_RPC_BYPASS Warning:** RPC functions bypass some RLS - mitigated by session validation
2. **Leaked Password Protection:** Needs manual enable in Supabase Auth settings

### Technical Debt
1. **captain_connections Table:** Legacy table, replaced by Presence API but still exists
2. **Edge Function:** `supabase/functions/session/index.ts` exists but may be unused
3. **Snake Draft Only:** No support for other draft formats yet
4. **No Guest Support:** Guest player addition feature started but incomplete

### Missing Validations
- Room expiration (drafts persist indefinitely)
- Player count limits
- Draft timeout handling

---

## 🚀 Future Roadmap

### Phase 2: Enhanced Features
- [ ] **Guest Players:** Allow adding players not in library during draft creation
- [ ] **Draft History:** View past drafts and results
- [ ] **Team Export:** Export teams as image/PDF
- [ ] **Timer Mode:** Optional pick timer for captains

### Phase 3: Social Features
- [ ] **Player Stats:** Track player participation across drafts
- [ ] **Captain Rating:** Rate captain picks for fun
- [ ] **Group Management:** Create recurring groups with persistent player pools
- [ ] **Push Notifications:** Notify when it's your turn

### Phase 4: Advanced Draft Modes
- [ ] **Auction Draft:** Budget-based bidding
- [ ] **Random Draft:** Auto-assign with balance algorithms
- [ ] **2-Captain Mode:** Support for 2 teams instead of 3
- [ ] **Variable Team Sizes:** Custom team size settings

### Phase 5: Localization & Scale
- [ ] **English Support:** i18n implementation
- [ ] **RTL Improvements:** Better RTL component handling
- [ ] **Performance:** Optimize for large player libraries (100+)
- [ ] **Offline Support:** PWA with offline viewing

---

## 📝 Development Notes

### Debug Mode
Add `?debug=1` to any room URL to see:
- Session ID
- Room ID
- Realtime connection status
- Connected captains list
- Player claim status

### Key Environment Variables
```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=xxx
VITE_SUPABASE_PROJECT_ID=xxx
```

### Design System
- Colors use HSL via CSS custom properties
- Captain colors: primary (1), secondary (2), accent (3)
- Gradients: `bg-gradient-hero`, `bg-gradient-primary`, `bg-gradient-accent`
- All text in Hebrew (RTL)

### Testing Recommendations
1. Test with 3 browser windows for full draft simulation
2. Use `?debug=1` to verify presence and session state
3. Test WhatsApp deep links on mobile
4. Test reconnection scenarios (refresh during draft)

### Common Patterns
```typescript
// Session ID retrieval (async preferred)
const sessionId = await getSecureSessionId();

// Captain number from player
const myCaptainNumber = room.captain1_player_id === playerId ? 1 
  : room.captain2_player_id === playerId ? 2 
  : room.captain3_player_id === playerId ? 3 
  : null;

// Snake draft order generation
const order = generateSnakeDraftOrder(totalPicks);
// Returns: [1,2,3,3,2,1,1,2,3,...]
```

---

## 📞 Contact & Resources

- **Lovable Project:** Built with Lovable AI
- **Database:** Lovable Cloud (Supabase)
- **Documentation:** See inline code comments

---

*This document was generated for handover purposes. For the most accurate information, refer to the actual codebase.*

