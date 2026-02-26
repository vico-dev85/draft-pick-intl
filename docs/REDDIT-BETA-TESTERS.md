# Reddit Beta Tester Outreach — Ready to Post

> Copy-paste these. Adapt slightly if needed. Be yourself in the comments.

---

## r/bootroom (~21K) — Amateur players who care about the game

**Title:** How we went from wasting 20% of our pitch time to having teams ready before we arrive

**Body:**

```
We've been playing pickup weekly for years. At some point we realized
we were losing 10-20% of our playing time every session just picking
teams, arguing, reshuffling. We were paying for pitch time and spending
it standing around.

So we started doing it before the game. We already know who's coming
from the WhatsApp group, so one of the guys would volunteer and post
his teams — sometimes one version, sometimes two for people to vote on.
Sometimes 2-3 guys would each do their own split independently.

It worked for a while. But then complaints started. People noticed
patterns — the guy making teams always put himself with the better
players, or always split the same friends apart. It wasn't intentional
but it wasn't really fair either. And it felt kind of unorganized.

That's when I built PickNKick. It's a free web app where captains
draft on their phones — snake order, so whoever picks last in round 1
picks first in round 2. Takes 2 minutes, teams go to WhatsApp, everyone
shows up and plays.

The difference: nobody owns the teams. The captains make the calls,
the snake order keeps it balanced, and there's nothing to argue about.

https://picknkick.com

Still early — would love feedback from other groups who play regularly.
How does your group handle this? Have you gone through the same stages?
```

---

## r/5aside (~5K) — Your exact users

**Title:** The evolution of team picking in our group — and why I ended up building an app for it

**Body:**

```
We play every week. Here's the stages we went through:

Stage 1: Pick teams at the pitch. Waste 10-15 minutes. Argue. Finally
play with less time than we paid for.

Stage 2: Someone realizes we already know who's coming from the WhatsApp
group. One guy volunteers to make teams and posts them before the game.
Sometimes posts 2 options. Sometimes 2-3 guys each post their own split.
This feels like progress.

Stage 3: Complaints. The guy making teams has patterns. He puts himself
with the strong players. Or he always breaks up the same pairs. People
start saying it's not fair. The volunteer stops wanting to do it because
everyone complains about his picks.

That's where I built PickNKick. Free web app — captains draft on their
phones before the game, snake order keeps it balanced, teams shared to
WhatsApp. Nobody "makes" the teams, the draft does.

https://picknkick.com

No download, no signup for quick mode. Still early and I'm looking for
groups who'd try it and tell me what works and what doesn't.

Which stage is your group at?
```

---

## r/SideProject (~200K) — Builders who love testing stuff

**Title:** Built a free app because one guy in our football group kept making unfair teams — would love feedback

**Body:**

```
Hey — sharing something I built to solve a real problem in my pickup
football group.

We play every week. We used to pick teams at the pitch and waste 10-20%
of our playing time. So we moved it to WhatsApp — one guy would
volunteer and post his team split before the game.

Worked for a while, but then people started complaining. The guy making
teams had patterns — unconscious bias, always putting himself with
certain players, same pairs getting split. Nobody wanted to volunteer
anymore because you'd just get criticized.

So I built PickNKick — captains draft on their phones before the game.
Snake order (last pick round 1 = first pick round 2), teams shared to
WhatsApp, show up and play. Nobody "owns" the teams.

Stack: React 18, TypeScript, Supabase (Realtime + Auth + Postgres),
Tailwind, Framer Motion. PWA, installable from browser.

Some things I'm proud of:
- Real-time picks via Supabase channels
- Crypto RNG for draft order (no Math.random)
- Works without signup (quick draft mode)
- Snake draft handles 2-3 teams

Free, no ads. Just wanted to fix this for my group.

https://picknkick.com

Would love honest feedback — first impressions, the draft flow, anything
that's confusing. What would you change?
```

---

## r/PickupSoccer (~5K) — People looking for games

**Title:** How does your group make teams? Ours went through 3 stages before we figured it out

**Body:**

```
Stage 1: Pick at the pitch, waste time, argue.
Stage 2: One guy posts teams on WhatsApp before the game.
Stage 3: Everyone complains the teams aren't fair.

We went through all three. The problem with stage 2 is whoever makes
the teams gets blamed, and there's always unconscious bias.

So I built a free web app where captains draft before the game. Snake
order, share teams to WhatsApp, show up ready to play.

https://picknkick.com

No download, works in browser. Still new — looking for groups to try
it and tell me what's missing.

What stage is your group at?
```

---

## r/soccer (~4M) — Use Free Talk Friday thread ONLY

**Don't make a standalone post** — it'll get removed. Drop this in the weekly Free Talk Friday thread:

```
Anyone play weekly pickup? My group went through the classic stages —
picking teams at the pitch and wasting time, then one guy volunteers
to make teams on WhatsApp before the game, then everyone complains
his teams aren't fair.

Built a free web app where captains draft on their phones instead.
Snake order, teams to WhatsApp, nobody to blame: picknkick.com

Looking for groups to try it. What stage is your group at?
```

---

## r/football (~2M) — Use Daily Discussion thread

Same deal — don't make a standalone post. Drop in the daily thread:

```
Pickup/5-a-side question — does every group go through this?

1. Pick teams at the pitch, waste 15 minutes
2. One guy makes teams on WhatsApp before the game
3. Everyone complains his teams are biased

We went through all three. Ended up building a free app where captains
draft on phones instead. Nobody owns the teams, snake order keeps it
fair: picknkick.com

Curious if other groups deal with this same cycle.
```

---

## r/webdev (~2M) — Showoff Saturday

**Title:** Showoff Saturday — real-time draft app born from WhatsApp group drama (React + Supabase)

**Body:**

```
My football group used to have one guy post team splits on WhatsApp
before games. Then everyone complained he was biased. Nobody wanted
to volunteer anymore.

So I built a web app where captains draft on their phones instead.
Real-time snake draft, teams shared to WhatsApp, no human to blame.

Interesting bits:
- Supabase Realtime for live picks across devices
- HashRouter + PKCE OAuth (tricky with Supabase Auth)
- Crypto RNG for draft order fairness
- PWA with lazy routes and chunk-load recovery
- Snake draft algorithm for 2-5 teams

Stack: React 18, TypeScript, Vite 5, Supabase, Tailwind, Framer Motion

Free, no ads: https://picknkick.com

Would appreciate feedback on the UX or architecture. What would you
do differently?
```

---

## r/reactjs (~400K) — React-specific angle

**Title:** Real-time multiplayer draft app with React 18 + Supabase — scratching my own itch

**Body:**

```
Side project born from a real problem — my pickup football group needed
a way to draft fair teams before games without one person being the
"team maker" that everyone complains about.

Some React patterns that worked well:
- Lazy routes with chunk-failure auto-retry (stale service worker recovery)
- Per-route Suspense with theme-matched loading skeletons
- Custom hook for queuing TTS announcements with language auto-detection
- Centralized captain resolution module (made N-team support easy)

The real-time part uses Supabase postgres_changes — every pick triggers
updates to all connected clients. Handled race conditions with
SECURITY DEFINER RPCs for server-authoritative state.

https://picknkick.com

Curious what patterns others use for real-time state in React. Also
happy to hear any UX feedback — it's free and I'm actively improving it.
```

---

## Posting Order

| Day | Where | Risk | Expected |
|-----|-------|------|----------|
| Tuesday | r/SideProject | Low — very welcoming | Feedback + a few signups |
| Wednesday | r/5aside | Low — exact audience | Real testers if you're lucky |
| Thursday | r/bootroom | Low — if you lead with discussion | Good conversation, maybe testers |
| Friday | r/soccer Free Talk Friday | Medium — big audience, strict mods | Visibility if it gets traction |
| Next Tuesday | r/PickupSoccer | Low — small, targeted | A few interested people |
| Next Saturday | r/webdev Showoff Saturday | Low — standard for this | Dev feedback |
| Following week | r/reactjs, r/football | Medium | Technical feedback, broader reach |

**Space them out.** One post per day max. Reply to every comment within 2 hours.

---

## When People Comment

**"Looks cool, I'll try it"**
> "Thanks — let me know how it goes. If anything's confusing or broken just tell me, I'll fix it."

**"We're still at stage 1/2"**
> "Haha we were there for years. It works until it doesn't. The app's there whenever you need it."

**"Our group is fine with one guy picking"**
> "That's how we started too. Worked great until it didn't — the complaints crept in slowly. If it works for your group though, no need to fix what isn't broken."

**"Why not just use a random generator?"**
> "Random doesn't account for skill. The whole point of a draft is that captains who know the players make judgment calls. That's what makes the teams balanced, not just mixed."

**"Is it really free?"**
> "Yeah, no ads, no premium tier. Built it for my own group and figured others could use it too."

**"Does it work for basketball/volleyball/etc?"**
> "Should work for any sport where you need to split into teams. The draft mechanic is sport-agnostic."

**"Open source?"**
> "Not yet but thinking about it. Want to get it more stable first."

**"The guy who makes teams in our group will love this"**
> "Ha — that guy in our group was the happiest when I built this. He was tired of getting blamed every week."

**Bug report**
> "Appreciate you flagging that — I'll look into it today. Thanks for testing."
