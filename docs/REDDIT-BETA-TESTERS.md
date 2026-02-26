# Reddit Beta Tester Outreach — Ready to Post

> Copy-paste these. Adapt slightly if needed. Be yourself in the comments.

---

## r/bootroom (~21K) — Amateur players who care about the game

**Title:** How does your group pick teams before a game? Is it even a problem for you?

**Body:**

```
Genuinely curious — for those who play regular pickup/5-a-side, how
do you handle team selection? And does it bother anyone in your group
or is it a non-issue?

We usually play 3 teams of 4-5 depending on who shows up. We rent a
pitch for 2 hours every week so every minute counts. Over the years
we went through a few stages. At first we did it at the pitch —
wasted 10-20% of our paid time just standing around arguing. Then we moved it to WhatsApp — one guy would volunteer and
post his team split before the game, sometimes two variations.
Sometimes 2-3 guys would each post their own. Worked for a while
until complaints started. People noticed bias, patterns, the same
guy always ending up with the better players. Nobody wanted to
volunteer anymore.

So I ended up building a free web app for it. Captains draft on their
phones before the game, snake order keeps it fair, teams go to WhatsApp,
everyone shows up and plays. Works for 2 or 3 teams. No one person
"owns" the teams anymore.

It's called PickNKick: https://picknkick.com

Still early days. If anyone plays regularly and wants to help test it
and give feedback — I'd love to build this into something that actually
saves time for groups around the world. No download, no signup needed
for quick mode.

But mainly just curious — how do you guys do it?
```

---

## r/5aside (~5K) — Your exact users

**Title:** How do you split teams before your weekly game? Curious what actually works

**Body:**

```
For those who play weekly — what's your system for picking teams?
Do people in your group even care or is it just "whatever"?

We usually run 3 teams of 4-5, rent a pitch for 2 hours every week.
Played for years going through every version. Picking at the pitch
and wasting time we're paying for. Then one
guy posting teams on WhatsApp before the game — sometimes one split,
sometimes two for people to vote on, sometimes 2-3 guys each posting
their own version. Then people complaining his splits were biased.
Then nobody wanting to be that guy because you just get blamed.

That cycle is what made me build PickNKick — a free web app where
captains draft on their phones before the game. Snake order, works
for 2 or 3 teams, shared to WhatsApp, nobody to blame.

https://picknkick.com

I'd love for groups who play regularly to try it and help shape it.
It's free and I want to make it genuinely useful for pickup groups
everywhere. No download, works in the browser.

What's your group's approach? Curious if everyone goes through the
same stages we did.
```

---

## r/SideProject (~200K) — Builders who love testing stuff

**Title:** Built a free app to solve a problem my football group argued about for years — looking for testers

**Body:**

```
Hey — sharing something I built out of a real frustration.

My pickup football group plays every week — usually 3 teams of 4-5,
we rent a pitch for 2 hours. For years we picked teams at the pitch
and wasted 10-20% of time we're paying for. Moved it to WhatsApp — one guy would volunteer to post
teams before the game, sometimes two variations to vote on. Worked
until people started noticing bias and patterns. Nobody wanted to be
that guy anymore.

So I built PickNKick — captains draft on their phones before the game.
Snake order (last pick round 1 = first pick round 2), works for 2 or
3 teams, shared to WhatsApp, show up and play.

Stack: React 18, TypeScript, Supabase (Realtime + Auth + Postgres),
Tailwind, Framer Motion. PWA, installable from browser.

Some bits I'm proud of:
- Real-time picks via Supabase channels
- Crypto RNG for draft order (no Math.random)
- Works without signup (quick draft mode)
- Snake draft handles 2-3 teams

Free, no ads. I want to turn this into something that saves time for
pickup groups around the world and I need people to test it and tell
me what's wrong with it.

https://picknkick.com

First impressions, the draft flow, anything confusing — I want to
hear it all.
```

---

## r/PickupSoccer (~5K) — People looking for games

**Title:** Curious — how does your pickup group decide teams? Is it smooth or chaos?

**Body:**

```
For those who play regular pickup — do you have a system for teams
or is it a mess every time?

My group (3 teams of 4-5, rented pitch every week) went through the
whole evolution: wasting paid time at the pitch, then one guy posting
teams on WhatsApp
before the game, then complaints about his picks being biased.
That's what made me build a free app where captains draft on their
phones before the game instead. Works for 2 or 3 teams.

https://picknkick.com

No download, browser-based. Looking for groups to test it and help
make it better — I want to build something that works for pickup
groups everywhere.

What's your current system?
```

---

## r/soccer (~4M) — Free Talk Friday thread ONLY

**Don't make a standalone post** — it'll get removed. Drop this in the weekly Free Talk Friday thread:

```
For those who play weekly pickup — how does your group pick teams?
Is it a problem or does nobody care?

My group (3 teams of 4-5 usually) argued about it for years until
I built a free app where captains draft on their phones before the
game. Snake order, works for 2-3 teams, shared to WhatsApp, show
up and play: picknkick.com

Looking for groups to try it and give feedback. Curious what other
people's experience is with this.
```

---

## r/football (~2M) — Daily Discussion thread

Don't make a standalone post. Drop in the daily thread:

```
Pickup/5-a-side question — how does your group handle team selection?
Does anyone actually have a system that works?

My group (3 teams of 4-5 usually) tried everything over the years —
picking at the pitch (waste of time), one guy posting teams on
WhatsApp (complaints about bias). Eventually built a free app where
captains draft on phones instead — works for 2-3 teams: picknkick.com

Looking for groups to test it. Curious how others deal with this.
```

---

## r/webdev (~2M) — Showoff Saturday

**Title:** Showoff Saturday — built a real-time draft app because my football group's WhatsApp drama got out of hand (React + Supabase)

**Body:**

```
We play 3 teams of 4-5 every week. One guy used to post team splits
on WhatsApp before games — sometimes two variations for people to
vote on. Then everyone complained he was biased. Then nobody wanted
to do it. So I built a web app where captains draft on their phones
instead. Handles 2-3 teams.

Interesting bits:
- Supabase Realtime for live picks across devices
- HashRouter + PKCE OAuth (tricky with Supabase Auth)
- Crypto RNG for draft order fairness
- PWA with lazy routes and chunk-load recovery
- Snake draft algorithm for 2-5 teams

Stack: React 18, TypeScript, Vite 5, Supabase, Tailwind, Framer Motion

Free, no ads: https://picknkick.com

Looking for feedback on UX or architecture — and for any pickup
groups willing to test it for real. What would you do differently?
```

---

## r/reactjs (~400K) — React-specific angle

**Title:** Real-time multiplayer draft app with React 18 + Supabase — born from WhatsApp group drama

**Body:**

```
Side project — my football group (3 teams of 4-5 every week) needed
a fair way to pick teams before games without one person being the
"team maker" everyone complains about.

Some React patterns that worked well:
- Lazy routes with chunk-failure auto-retry (stale service worker recovery)
- Per-route Suspense with theme-matched loading skeletons
- Custom hook for queuing TTS announcements with language auto-detection
- Centralized captain resolution module (made N-team support easy)

Real-time picks via Supabase postgres_changes — every pick updates
all connected clients. Race conditions handled with SECURITY DEFINER
RPCs for server-authoritative state.

https://picknkick.com

Looking for feedback and testers. Curious what patterns others use
for real-time state in React.
```

---

## Posting Order

| Day | Where | Risk | Expected |
|-----|-------|------|----------|
| Tuesday | r/SideProject | Low — very welcoming | Feedback + a few signups |
| Wednesday | r/5aside | Low — exact audience | Real testers if you're lucky |
| Thursday | r/bootroom | Low — discussion-first works here | Good conversation, maybe testers |
| Friday | r/soccer Free Talk Friday | Medium — big audience, strict mods | Visibility if it gets traction |
| Next Tuesday | r/PickupSoccer | Low — small, targeted | A few interested people |
| Next Saturday | r/webdev Showoff Saturday | Low — standard for this | Dev feedback |
| Following week | r/reactjs, r/football | Medium | Technical feedback, broader reach |

**Space them out.** One post per day max. Reply to every comment within 2 hours.

---

## When People Comment

**"We just count off 1-2-1-2"**
> "That's how we started too. Does anyone in your group ever complain about it or is everyone cool with it?"

**"One guy does it and nobody cares"**
> "That worked for us too for a while. The complaints came later when people started noticing patterns. Might never happen for your group though."

**"We're still at the arguing stage"**
> "Ha — we were there for years. Moving it to before the game was the first big improvement honestly, even before the app."

**"Looks cool, I'll try it"**
> "Thanks — let me know how it goes. If anything's confusing or broken just tell me, I'll fix it."

**"Why not just use a random generator?"**
> "Random doesn't account for skill. The whole point of a draft is captains who know the players make the calls. That's what makes teams balanced, not just shuffled."

**"Is it really free?"**
> "Yeah, no ads, no premium. Built it for my own group and figured others could use it too."

**"Does it work for basketball/volleyball/etc?"**
> "Should work for any sport where you split into teams. The draft mechanic is sport-agnostic."

**"Open source?"**
> "Not yet, thinking about it. Want to get it more stable first."

**"The guy who makes teams in our group will love this"**
> "Ha — that guy in our group was the happiest when I built this. Tired of getting blamed every week."

**Bug report**
> "Appreciate you flagging that — I'll look into it today. Thanks for testing."
