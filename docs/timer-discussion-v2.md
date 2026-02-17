# Discussion: Smart Soccer Timer + Live Score Tracking Feature

**Don't code anything yet. I want to discuss and plan this feature with you first.**

## The Idea

After the draft creates 3 teams, the app becomes a live game night manager. It runs a timer, tracks scores and goal scorers in real-time, syncs across all linked players' phones, and announces events with TTS (same system we use for draft picks).

## How Our Game Night Actually Works

- 13-15 players show up, drafted into 3 teams (the draft already handles this)
- 2 teams play, 1 team rests
- Games are ~8 minutes, OR first to 2 goals (whichever happens first)
- If tied after 8 minutes → 2 minutes extra time
- If still tied after extra time → penalties (need to figure out how to track this)
- Winner stays on the pitch, loser sits out, resting team comes in
- If a team has 4 players and the others have 5, they borrow a goalkeeper from the resting team for that game. After the game, the goalkeeper goes back to his original team. This needs to be handled so stats don't get messed up.
- A typical night is ~2 hours. With ~10 min per game including breaks/transitions, that's roughly 8-10 games per night.
- All teams and players are already known from the draft — same club, same session. The timer feature just extends the draft session.

## The "One Phone" Model

The timer should run on ONE phone per game night — a volunteer scorekeeper. Before the first game starts, the app asks "Who's running the timer tonight?" One linked club member volunteers. Their phone becomes the active controller with:
- Timer start/stop/pause
- +Goal buttons
- Scorer selection
- Announcements and whistle sounds play FROM THIS PHONE

All other linked club members can OPEN the app and SEE the live score/timer (read-only via Supabase Realtime), but they cannot control it. However — if it's between games (no active timer running), any linked member can start the next game from their phone and become the controller for that game.

**Important nudge feature:** If a game ends and 3+ minutes pass without the next game starting, send a notification/nudge to the scorekeeper: "Next game? 🟢 Team X has been waiting!" This prevents the common problem of people forgetting to start the timer after chatting/resting.

## Timer Rules (All Configurable Per Club)

These are our defaults, but everything should be flexible since different groups play differently:

```
Game length:           [8] minutes (configurable: 5-20 min range)
Win by goals:          [2] goals = instant game over (configurable: 0/1/2/3, where 0 = time only)
Extra time on draw:    [2] minutes (configurable: 0-5 min, 0 = no extra time)
Last attack warning:   [5] seconds before end of regular/extra time
Penalty on draw:       [Yes] after extra time still tied (configurable on/off)
Rotation:              Winner stays, loser sits out (this is the default — discuss if we need alternatives)
```

## TTS Announcements (Same System as Draft Picks)

All announcements play on the scorekeeper's phone only. Using the existing TTS system from sounds.ts.

**Language: Hebrew for kohot.online, English for PicknKick (follows app language).**

### Announcement triggers:
- **Game start:** Whistle sound effect + "שריקת פתיחה!" 
- **Goal scored:** "גול! [scorer name]! [new score]" (e.g., "גול! אבי! 2-1")
- **2 minutes warning:** "שתי דקות לסיום"
- **1 minute warning:** "דקה לסיום"
- **Last attack:** "התקפה אחרונה!" (5 seconds before time runs out)
- **Win by goal limit:** Whistle + immediate result announcement (no need for time warnings)
- **Extra time start:** "תיקו! שתי דקות נוספות"
- **Extra time last attack:** same as regular
- **Penalties:** "פנדלים!" (need to discuss how to track penalty results)
- **Game end:** Whistle sound effect + "המשחק הסתיים [score]! [winning team player names] למנצחים, [losing team player names] למפסידים"
- **Draw after all (if penalties disabled):** "המשחק הסתיים בתיקו [score]"

### Announcement settings per club (all toggleable):
- Enable/disable each announcement type
- Volume level / "stadium mode" (max volume)
- Announcement language follows app language

## Live Game Screen

The scorekeeper sees:
- Big timer countdown (centered, large font)
- Team names/colors on each side with current score (big numbers)
- "+Goal" button per team (large, easy to tap on sideline)
- When "+Goal" tapped → quick popup showing that team's players → one tap on scorer → done (under 2 seconds total)
- Goal timeline below showing who scored and at what minute
- Pause button (for injuries, ball lost, arguments)
- "End Game" button (triggers final whistle + result announcement)

Other linked players see (read-only):
- Same display minus the control buttons
- Live-updating score and timer via Realtime
- Goal timeline

## Goalkeeper Loan

When a team of 4 plays against a team of 5, they need to borrow a goalkeeper from the resting team. 

This needs to be tracked properly:
- The borrowed GK plays FOR the borrowing team in that game
- Goals against don't count against the GK's personal stats (or maybe they do? discuss)
- After the game, the GK goes back to their original team
- The loan should be easy to set up — maybe when starting a game with uneven teams, the app prompts "Team X has 4 players. Borrow a GK from Team Z?" then shows resting team's players to pick from.

## After Each Game

When the scorekeeper taps "End Game" or the timer/goal-limit triggers game over:
1. Final whistle sound
2. TTS announces full result with player names
3. Brief result card shows on screen (score, goal scorers, game duration)
4. "Next Game" button — auto-suggests the rotation (winner stays, resting team comes in)
5. Scorekeeper confirms or adjusts, starts next game

**The nudge:** If 3+ minutes pass without next game starting → notification to scorekeeper

## End of Night

When scorekeeper taps "End Night" after the last game:

### Night summary screen shows:
- All game results in order
- Team standings for the night (wins, draws, losses, points)
- Top 3 goal scorers of the night
- (Future: MVP vote, more detailed stats)

### WhatsApp share:
The share message should be fun and shareable. Something like:

```
⚽ תוצאות הערב — [club name]

משחק 1: קבוצת אבי 2-1 קבוצת דן
משחק 2: קבוצת אבי 1-1 קבוצת ערן (פנדלים: 2-1)
...

🏆 טבלה:
  קבוצת אבי: 3W 1D — 10 pts
  קבוצת דן: 2W 2L — 6 pts  
  קבוצת ערן: 1W 1D 2L — 4 pts

⚽ כובש הערב: אבי (5 גולים)

📊 picknkick.com/results/[link]
```

The link should take people to a nice results page (even non-registered users can view it). This is the viral loop — friends see the results, get curious, click the link, see what PicknKick is, and want it for their own group.

## Data Storage for Future Statistics

Everything needs to be saved for future stats/leaderboards. After many game nights, we want to show:
- Team-level stats: which team combinations win most
- Top goal scorers over time (weekly/monthly/all-time)  
- Top 3 podium display
- Player win/loss records
- (Future: more advanced stats, player cards, season awards, "Wrapped" summary)

The data model needs to support all this from day one even if we don't build the stats UI yet.

## What I Want to Discuss

1. **Data model** — What new tables/columns do we need? How does this connect to existing draft_rooms and draft_room_players? What's the minimal schema that captures everything (games, goals, GK loans, penalties) and supports future stats/leaderboards?

2. **Timer sync** — The timer runs on one phone but displays on all. Store start_time in DB and calculate display client-side? How to handle pause/resume? What about the "one controller at a time" enforcement?

3. **The "+Goal" flow** — How to make scorer selection as fast as possible? Optimistic UI updates? Preventing double-taps/duplicate goals?

4. **Penalty tracking** — How to handle penalties in the data model and UI? It's a different kind of scoring event. Do we just track who won penalties, or individual penalty kicks?

5. **Goalkeeper loan** — Best way to model a temporary player loan for one game without messing up team assignments or stats?

6. **The nudge system** — How to implement the "start next game" reminder? Push notification? In-app alert? What triggers it?

7. **Settings storage** — New columns on clubs table? Separate game_settings table? 

8. **TTS queue** — What if a goal happens right when a time warning fires? How to queue/prioritize announcements?

9. **Edge cases:**
   - Scorekeeper's phone dies mid-game — can someone else take over?
   - App refresh during active game — rejoin seamlessly?
   - Goal correction / undo last goal
   - Pause timer (injury, lost ball)
   - What if people forget to start timer and game is already a few minutes in? (manual time adjustment?)

10. **Effort estimate** — Hours for MVP (timer + score + goals + basic TTS + night summary) vs full version with all settings, loans, penalties, announcements, nudges, shareable results page?

11. **What am I missing?** — You know the codebase. What technical challenges or opportunities do you see?

Let's plan this properly before writing any code.
