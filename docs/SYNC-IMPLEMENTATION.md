# Draft Soccer - Synchronization Implementation Guide

This document explains how the real-time synchronization works in the Draft Soccer app, what problems were solved, and how to continue development.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Key Problems Solved](#key-problems-solved)
4. [WaitingRoom - Raffle Synchronization](#waitingroom---raffle-synchronization)
5. [DraftBoard - Turn Synchronization](#draftboard---turn-synchronization)
6. [Session Management](#session-management)
7. [URL Routing](#url-routing)
8. [Potential Improvements](#potential-improvements)
9. [Testing Guide](#testing-guide)
10. [File Reference](#file-reference)

---

## Overview

The app runs a 3-captain snake draft where captains take turns picking players. The critical challenge is keeping all clients (browsers/devices) synchronized so everyone sees:
- The same countdown
- The same raffle result
- The same current turn
- The same pick state

### Tech Stack
- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Edge Functions + Realtime)
- **Realtime**: Supabase Presence API (captain connections) + Broadcast (raffle sync)
- **Deployment**: Static files served from `/drafty/` subdirectory

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         WAITING ROOM                            │
├─────────────────────────────────────────────────────────────────┤
│  Captains join via link → Presence API tracks connections       │
│  When 3 captains connected:                                     │
│    - LOWEST-NUMBERED captain runs raffle (owner can leave!)     │
│    - That captain BROADCASTS: countdown, shuffle, result        │
│    - All clients receive same state via broadcast               │
│  Raffle runner updates DB with draft_order, navigates all       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         DRAFT BOARD                             │
├─────────────────────────────────────────────────────────────────┤
│  All clients POLL database every 1.5 seconds                    │
│  When it's your turn:                                           │
│    - Click player → call pick_player_atomic RPC                 │
│    - Server validates turn, updates DB atomically               │
│    - All clients see update on next poll                        │
│  When draft complete → navigate to Results                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                          RESULTS                                │
├─────────────────────────────────────────────────────────────────┤
│  Static page showing final teams                                │
│  WhatsApp share button with teams + link                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Problems Solved

### Problem 1: Different Raffle Results on Different Devices

**Symptom**: Captains saw different pick orders, leading to "not your turn" errors and confusion.

**Root Cause**: Each client ran `generateRaffleOrder()` independently. Since this uses `Math.random()`, each device generated a different random order.

**Solution**: Only the room creator runs the raffle. The creator broadcasts all state changes (countdown, shuffle display, final order) to all clients via Supabase Broadcast. Non-creators only listen and update their UI based on received broadcasts.

**Backup Mechanism**: The draft_order is stored in DB immediately after generation (before broadcast). If a non-creator misses the broadcast, they poll the DB after 5 seconds and extract the raffle order from there.

```typescript
// Only creator runs the raffle sequence
const runRaffleSequence = async () => {
  if (!isCreator) return; // Non-creators don't run this!

  // Generate order ONCE on creator's device
  const finalOrder = generateRaffleOrder();

  // CRITICAL: Store in DB immediately as backup
  const draftOrder = generateSnakeDraftOrder(totalPicks, finalOrder);
  await supabase
    .from("draft_rooms")
    .update({ draft_order: draftOrder })
    .eq("id", room.id);

  // Then broadcast to all clients
  channel?.send({
    type: "broadcast",
    event: "raffle_result",
    payload: { order: finalOrder },
  });
};

// Non-creator fallback: poll DB if stuck
useEffect(() => {
  if (isCreator) return;
  if (rafflePhase !== "shuffling") return;

  const fallback = setTimeout(async () => {
    const { data } = await supabase
      .from("draft_rooms")
      .select("draft_order")
      .eq("id", room.id)
      .single();

    if (data?.draft_order?.length >= 3) {
      const extractedOrder = data.draft_order.slice(0, 3);
      setRaffleOrder(extractedOrder);
      setRafflePhase("result");
    }
  }, 5000);

  return () => clearTimeout(fallback);
}, [rafflePhase, isCreator]);
```

### Problem 2: Draft Turns Out of Sync

**Symptom**: One device showed Captain 1's turn while another showed Captain 2's turn.

**Root Cause**: Supabase Realtime subscriptions were unreliable - some updates were delayed or missed entirely.

**Solution**: Switched from realtime subscriptions to simple polling. All clients fetch state from database every 1.5 seconds. The database is the single source of truth.

```typescript
// Simple, reliable polling
useEffect(() => {
  if (!room?.id || room.status === "completed") return;

  const pollInterval = setInterval(() => {
    fetchData(); // Fetch current state from DB
  }, 1500);

  return () => clearInterval(pollInterval);
}, [room?.id, room?.status, fetchData]);
```

### Problem 3: Owner Must Stay Online

**Symptom**: If the owner/creator closed their browser after creating the draft, the raffle would never start.

**Root Cause**: Only the creator's browser was allowed to run the raffle sequence.

**Solution**: The **lowest-numbered connected captain** runs the raffle. This is deterministic (no race conditions) and allows the owner to leave immediately after sharing the room code.

```typescript
// Determine if I should run the raffle
const lowestConnectedCaptain = Math.min(...Array.from(connectedCaptainNumbers));
const shouldRunRaffle = isCaptain && myCaptainNumber === lowestConnectedCaptain;

// In runRaffleSequence:
if (!shouldRunRaffle) return; // Only lowest-numbered captain runs
```

**How it works:**
- If captains 1, 2, 3 are all connected → Captain 1 runs raffle
- If only captains 2 and 3 are connected (waiting for 1) → Nobody runs yet
- When captain 1 joins → Captain 1 automatically runs raffle

### Problem 4: URL Format for WhatsApp Links

**Symptom**: Links like `/drafty/join/CODE` resulted in 404 errors.

**Root Cause**: The app is an SPA deployed to `/drafty/`. Direct navigation to subroutes doesn't work without server-side configuration.

**Solution**: Use query parameters that work with the landing page: `?join=CODE`. The Landing page detects this and redirects internally.

```typescript
// In Landing.tsx
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const joinCode = params.get('join');
  if (joinCode) {
    navigate(`/join/${joinCode.toUpperCase()}`);
  }
}, [navigate]);

// In WaitingRoom.tsx - generate correct share URL
const joinUrl = `${baseUrl}/drafty/?join=${room?.room_code}`;
```

---

## WaitingRoom - Raffle Synchronization

### File: `src/pages/WaitingRoom.tsx`

### How It Works

1. **Captain Connection Tracking**
   - Uses Supabase Presence API
   - Each captain tracks their presence with `captain_number`
   - UI shows who is connected

2. **Raffle Trigger**
   - When `connectedCaptainNumbers.size === 3`, raffle auto-starts
   - Lowest-numbered connected captain runs the raffle (owner can leave!)

3. **Palm Raffle Game** (New Visualization)
   - Theatrical "odd-one-out" game with palm images
   - Stage 1: Determine 1st place among 3 captains
   - Stage 2: Determine 2nd place among 2 captains + neutral tile
   - Ready phase (2s wiggling fists) → Reveal (UP/DOWN) → Resolve (winner highlight)

4. **Raffle Phases**
   - `waiting` → Initial state
   - `shuffling` → Palm game is active (PalmRaffleGame component handles internal phases)
   - `result` → Game complete, showing final order
   - `starting` → Update DB, navigate to draft

5. **Broadcast Events**
   - `raffle_script` - `{ script: RaffleScript }` - Complete theatrical script
   - `draft_starting` - Signal that draft is being created
   - `draft_start` - Signal to navigate to draft

### Key State Variables

```typescript
const [rafflePhase, setRafflePhase] = useState<RafflePhase>("waiting");
const [raffleOrder, setRaffleOrder] = useState<number[]>([1, 2, 3]);
const [raffleScript, setRaffleScript] = useState<RaffleScript | null>(null);
const raffleStartedRef = useRef(false); // Prevent duplicate runs
```

### Theatrical Script Structure

```typescript
interface RaffleScript {
  finalOrder: [number, number, number]; // [1st, 2nd, 3rd]
  stage1: PalmRound[]; // Rounds to determine 1st
  stage2: PalmRound[]; // Rounds to determine 2nd (with neutral)
  positions: [number, number, number]; // Captain positions
}

interface PalmRound {
  hands: ['up' | 'down', 'up' | 'down', 'up' | 'down'];
  winner: number | null;
  isReroll: boolean;
  neutralPosition: number | null;
}
```

---

## DraftBoard - Turn Synchronization

### File: `src/pages/DraftBoard.tsx`

### How It Works

1. **Polling Loop**
   - Fetches room state every 1.5 seconds
   - Updates `room.current_turn_captain_number` and `room.current_pick_number`

2. **Turn Determination**
   - Compare `myCaptainNumber` with `room.current_turn_captain_number`
   - Only allow picks when `isMyTurn && !picking && !pickLockRef.current`

3. **Pick Flow**
   - Lock picks with `pickLockRef.current = true`
   - Call `pick_player_atomic` RPC with all required params
   - RPC validates: correct turn, correct pick number, player available
   - On success: optimistically update UI, then fetch fresh data
   - On error: show toast, refresh data

4. **Database RPC: `pick_player_atomic`**
   - Validates it's the correct captain's turn
   - Validates pick number matches expected
   - Updates player's `picked_by_captain_number` and `pick_number`
   - Advances to next turn or completes draft
   - All in a single atomic transaction

### Key Validation

```typescript
// Client-side validation
if (room.current_turn_captain_number !== myCaptainNumber) {
  toast({ title: "לא התור שלך", variant: "destructive" });
  return;
}

// Server-side validation (in RPC)
IF current_turn != p_captain_number THEN
  RAISE EXCEPTION 'Not your turn';
END IF;
```

---

## Session Management

### File: `src/lib/sessionManager.ts`

Captains don't log in - they're identified by a session ID stored in the browser.

### How It Works

1. **Generation**: `session_{timestamp}_{random9chars}`
2. **Storage Priority**:
   - Try Supabase Edge Function (httpOnly cookie)
   - Fallback to sessionStorage
   - Fallback to localStorage (migration from old version)
3. **Caching**: In-memory cache prevents repeated fetches
4. **Expiry**: 30 days based on embedded timestamp

### Usage

```typescript
// Async (preferred)
const sessionId = await getSecureSessionId();

// Sync (for backward compatibility)
const sessionId = getSessionIdSync();
```

---

## URL Routing

### App Routes (from `src/App.tsx`)

```typescript
<BrowserRouter basename="/drafty">
  <Route path="/" element={<Landing />} />
  <Route path="/join/:roomCode" element={<JoinDraft />} />
  <Route path="/room/:roomCode" element={<WaitingRoom />} />
  <Route path="/draft/:roomCode" element={<DraftBoard />} />
  <Route path="/results/:roomCode" element={<Results />} />
</BrowserRouter>
```

### URL Formats

| Purpose | URL Format | Notes |
|---------|------------|-------|
| Landing | `https://domain.com/drafty/` | Main entry point |
| Join (via link) | `https://domain.com/drafty/?join=CODE` | Redirects to /join/CODE |
| Waiting Room | `https://domain.com/drafty/room/CODE` | Internal navigation |
| Draft Board | `https://domain.com/drafty/draft/CODE` | During draft |
| Results | `https://domain.com/drafty/results/CODE` | After completion |

---

## Potential Improvements

### High Priority

1. **~~Raffle Order Persistence~~** ✅ DONE
   - ~~Store raffle order in DB before starting draft~~
   - ~~If creator disconnects during raffle, order is preserved~~
   - ~~Non-creators can read from DB as backup~~
   - Implemented: draft_order stored immediately after generation, non-creators poll DB after 5s if stuck

2. **Broadcast Acknowledgment**
   - Verify non-creators received raffle result before starting draft
   - Add retry logic if broadcast fails

3. **Reconnection Handling**
   - If captain refreshes during raffle, they should see current state
   - Consider storing raffle phase in DB

### Medium Priority

4. **Adaptive Polling**
   - Poll every 1s when it's your turn
   - Poll every 3s when it's not your turn
   - Reduces server load

5. **Stale Data Detection**
   - Show warning if poll fails multiple times
   - Indicate when data might be outdated

6. **Error Recovery**
   - Add "Refresh" button if state seems stuck
   - Auto-refresh on repeated errors

### Low Priority

7. **Optimistic Conflict Resolution**
   - If optimistic update conflicts with server, show animation of correction
   - Better UX than sudden state change

8. **Connection Quality Indicator**
   - Show latency/connection quality
   - Warn if connection is poor

---

## Testing Guide

### Debug Mode

Add `?debug=1` to any URL to enable debug panels:

- **WaitingRoom**: Shows phase, countdown, connected captains, raffle order, creator status
- **DraftBoard**: Shows captain number, turn, pick number, my turn status

### Manual Testing Checklist

1. **Raffle Sync Test**
   - Open 3 browsers/devices
   - Join same room as different captains
   - Verify all see same countdown (within 1 second)
   - Verify all see same final raffle order

2. **Draft Turn Test**
   - Start draft
   - Verify correct captain's turn is highlighted on ALL devices
   - Make a pick
   - Verify ALL devices update to next turn within 2 seconds

3. **Pick Validation Test**
   - Try clicking player when not your turn (should be blocked)
   - Try double-clicking quickly (should only pick once)

4. **Reconnection Test**
   - During draft, refresh one captain's browser
   - Verify they rejoin with correct state
   - Verify they can still pick on their turn

5. **WhatsApp Share Test**
   - Share invite link via WhatsApp
   - Open link on different device
   - Verify it loads the join page correctly

---

## File Reference

### Core Files

| File | Purpose |
|------|---------|
| `src/pages/WaitingRoom.tsx` | Pre-draft lobby, captain presence, raffle |
| `src/pages/DraftBoard.tsx` | Live draft picking interface |
| `src/pages/Results.tsx` | Final teams display, sharing |
| `src/pages/Landing.tsx` | Entry point, handles ?join=CODE |
| `src/lib/draftUtils.ts` | Utility functions (snake order, colors) |
| `src/lib/sessionManager.ts` | Session ID management |

### Supabase

| Resource | Purpose |
|----------|---------|
| `draft_rooms` | Main room table (private) |
| `draft_rooms_public` | Public view (no creator_user_id) |
| `draft_room_players` | Players in each room |
| `get_room_players_public` | RPC to fetch players with display names |
| `pick_player_atomic` | RPC to make a pick atomically |

### Key Dependencies

- `@supabase/supabase-js` - Realtime, database, auth
- `framer-motion` - Animations
- `react-router-dom` - Routing
- `lucide-react` - Icons

---

## Summary

The synchronization strategy uses two complementary approaches:

1. **Waiting Room / Raffle**: Single-source broadcast
   - Only creator generates random values
   - Creator broadcasts all state changes
   - Ensures everyone sees identical sequence

2. **Draft Board**: Database polling
   - All state stored in database
   - All clients poll every 1.5 seconds
   - Database is single source of truth
   - Server validates all picks

This combination is simple, reliable, and doesn't require Supabase Pro features.
