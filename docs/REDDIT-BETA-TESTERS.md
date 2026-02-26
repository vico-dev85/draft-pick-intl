# Reddit Beta Tester Outreach — Ready to Post

> Copy-paste these. Adapt slightly if needed. Be yourself in the comments.

---

## r/bootroom (~21K) — Amateur players who care about the game

**Title:** How does your group pick teams? We started doing a snake draft and it actually fixed the problem

**Body:**

```
Played weekly for a few years now. We tried everything to pick teams —
counting off, one guy picks, "random" that never feels random.

Eventually we started doing a snake draft. 2-3 captains, pick one player
at a time, order flips each round. Takes about 2 minutes on our phones
and teams actually come out balanced.

I ended up building a free web app for it because setting it up manually
was annoying. It's called PickNKick — no download, works in the browser.

Still early days and I'm looking for pickup groups who'd try it and tell
me what works and what doesn't. If you play regularly and want to give it
a go, I'd genuinely appreciate the feedback.

https://picknkick.com

How does your group do it? Curious if anyone else has found something
that works.
```

---

## r/5aside (~5K) — Your exact users

**Title:** Built a free team picker for our weekly games — looking for groups to try it

**Body:**

```
My group plays every week and we were wasting 10+ minutes picking teams
and arguing about it. So I built a thing.

It's a free web app where captains draft players on their phones. Snake
order — last pick round 1 gets first pick round 2. Takes about 2 minutes,
then you share teams to WhatsApp.

Called it PickNKick. No app store, no signup needed for quick mode, no ads,
no catch. I play too and just wanted something that worked.

It's still pretty new and I'd love feedback from other groups. What's
confusing? What's missing? What would make you actually use it every week?

https://picknkick.com

If your group tries it even once I'd be grateful. Happy to jump on a
message and walk you through it.
```

---

## r/SideProject (~200K) — Builders who love testing stuff

**Title:** Built a free PWA for my football group to draft fair teams — would love feedback

**Body:**

```
Hey — sharing something I built to solve a real problem for my pickup
football group.

Every week we'd argue about how to split teams. So I made PickNKick —
a web app where captains join on their phones and do a live snake draft.
Pick one player at a time, order reverses each round, done in 2 minutes.
Teams get shared to WhatsApp.

Stack: React 18, TypeScript, Supabase (Realtime + Auth + Postgres),
Tailwind, Framer Motion. PWA so it's installable from browser.

Some things I'm proud of:
- Real-time picks via Supabase channels
- Crypto RNG for draft order (no Math.random)
- Works without signup (quick draft mode)
- Snake draft handles 2-3 teams

It's free, no ads, no monetization plan yet. Just wanted to make game
day less annoying.

https://picknkick.com

Would love honest feedback — especially first impressions of the landing
page and the draft flow. What's unclear? What would you change?
```

---

## r/PickupSoccer (~5K) — People looking for games

**Title:** Free tool for splitting teams before pickup games — looking for testers

**Body:**

```
If you play regular pickup you know the drill — someone has to pick teams
and it's never smooth.

I built a free web app that handles it. Captains draft on their phones,
snake order so it's fair, done in 2 minutes. No download, works in any
browser.

https://picknkick.com

It's new and I'm looking for groups who actually play regularly to try
it and tell me what sucks. Not trying to sell anything — it's free and
I just want to make it good.

Anyone willing to give it a shot next time you play?
```

---

## r/soccer (~4M) — Use Free Talk Friday thread ONLY

**Don't make a standalone post** — it'll get removed. Drop this in the weekly Free Talk Friday thread:

```
Built a free web app for picking teams before pickup games. Captains
draft on their phones, snake order, done in 2 minutes.

Looking for people who play regularly to try it and give feedback.
No signup needed for quick mode.

picknkick.com

Anyone here play weekly and deal with the "picking teams" problem?
```

---

## r/football (~2M) — Use Daily Discussion thread

Same deal — don't make a standalone post. Drop in the daily thread:

```
Question for anyone who plays pickup/5-a-side regularly — how do you
pick teams?

My group started using a snake draft (captains pick on phones, order
reverses each round). Built a free app for it: picknkick.com

Looking for other groups to test it. Completely free, no download.
Would love to hear what you think.
```

---

## r/webdev (~2M) — Showoff Saturday

**Title:** Showoff Saturday — real-time snake draft app for pickup football (React + Supabase)

**Body:**

```
Built this for my weekly football group. Captains join on their phones
and pick players in a live draft with real-time updates.

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

**Title:** Real-time multiplayer app with React 18 + Supabase Realtime — looking for feedback

**Body:**

```
Side project — pickup football groups use it to draft teams live on
their phones.

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
→ "Thanks — let me know how it goes. If anything's confusing or broken just tell me, I'll fix it."

**"Why not just use a random generator?"**
→ "Random doesn't account for skill differences. With a draft, captains who know the players make judgment calls. Teams end up way more balanced."

**"Is it really free?"**
→ "Yeah, no ads, no premium tier. Built it for my own group and figured others could use it too."

**"Does it work for basketball/volleyball/etc?"**
→ "Should work for any sport where you need to split into teams. Haven't tested it specifically but the draft mechanic is the same."

**"Open source?"**
→ "Not yet but thinking about it. Want to get it more stable first."

**Bug report**
→ "Appreciate you flagging that — I'll look into it today. Thanks for testing."
