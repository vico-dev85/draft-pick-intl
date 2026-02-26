# Reddit Beta Tester Outreach — Ready to Post

> Copy-paste these. Adapt slightly if needed. Be yourself in the comments.

---

## r/bootroom (~21K) — Amateur players who care about the game

**Title:** We started picking teams before we get to the pitch — total game changer

**Body:**

```
Played weekly for a few years now. We used to waste 10-15 minutes at the
pitch arguing about teams. By the time we actually started playing we'd
already lost a chunk of our booking.

Now we do it online before the game. Captains draft on their phones —
snake order, takes about 2 minutes. Everyone shows up, teams are already
done, we go straight to playing.

Sounds like a small thing but we literally gained 15 minutes of football
every week. Over a year that's hours of actual playing time we were just
throwing away.

I built a free web app for it called PickNKick — works in the browser,
no download. Still early and I'd love feedback from other groups who
play regularly.

https://picknkick.com

How does your group do it? Does anyone else sort teams before arriving
or is it always chaos at the pitch?
```

---

## r/5aside (~5K) — Your exact users

**Title:** We do our team draft online before the game now — no more wasting pitch time

**Body:**

```
My group plays every week. Used to burn 10-15 minutes at the pitch
picking teams — arguing, re-shuffling, someone thinks it's unfair.
That's time we're paying for and not playing.

So I built a free web app where captains draft before the game. Everyone
does it on their phones, snake order so it's fair, share teams to
WhatsApp, done. When you show up to the pitch the teams are ready and
you go straight to kickoff.

Called it PickNKick. No app store, no signup needed for quick mode,
completely free. I play too and just wanted to stop wasting our pitch
time.

It's still new and I'd love feedback from other groups. What's confusing?
What's missing? What would make you actually use it every week?

https://picknkick.com

If your group tries it even once I'd be grateful. Happy to walk you
through it.
```

---

## r/SideProject (~200K) — Builders who love testing stuff

**Title:** Built a free PWA so my football group stops wasting pitch time picking teams — would love feedback

**Body:**

```
Hey — sharing something I built to solve a real problem for my pickup
football group.

Every week we'd waste 10-15 minutes of our pitch booking arguing about
teams. Now captains draft on their phones before the game — snake order,
share teams to WhatsApp, everyone shows up and goes straight to playing.
We literally got 15 minutes of football back every week.

Stack: React 18, TypeScript, Supabase (Realtime + Auth + Postgres),
Tailwind, Framer Motion. PWA so it's installable from browser.

Some things I'm proud of:
- Real-time picks via Supabase channels
- Crypto RNG for draft order (no Math.random)
- Works without signup (quick draft mode)
- Snake draft handles 2-3 teams

It's free, no ads, no monetization plan yet. Just wanted more time
actually playing.

https://picknkick.com

Would love honest feedback — especially first impressions of the landing
page and the draft flow. What's unclear? What would you change?
```

---

## r/PickupSoccer (~5K) — People looking for games

**Title:** Free tool to sort teams before you get to the pitch — looking for groups to test it

**Body:**

```
If you play regular pickup you know the drill — show up, spend 10-15
minutes picking teams, lose a chunk of your playing time.

My group started drafting teams online before the game. Captains pick
on their phones, snake order so it's fair, teams shared to the group
chat. Everyone shows up knowing their team, straight to kickoff.

Built a free web app for it: https://picknkick.com
No download, works in any browser.

It's new and I'm looking for groups who play regularly to try it and
tell me what sucks. Not selling anything — it's free and I just want
to make it good.

Anyone willing to give it a shot before your next game?
```

---

## r/soccer (~4M) — Use Free Talk Friday thread ONLY

**Don't make a standalone post** — it'll get removed. Drop this in the weekly Free Talk Friday thread:

```
Anyone here play weekly pickup? My group started drafting teams online
before the game instead of wasting 15 minutes at the pitch arguing
about it. Game changer — everyone shows up, teams are done, straight
to playing.

Built a free web app for it: picknkick.com (no signup for quick mode)

Looking for groups to try it and give feedback. Curious how other
people handle this.
```

---

## r/football (~2M) — Use Daily Discussion thread

Same deal — don't make a standalone post. Drop in the daily thread:

```
Question for anyone who plays pickup/5-a-side — do you pick teams
at the pitch or before?

My group started doing it online before the game. Captains draft on
their phones, share to WhatsApp, show up ready to play. Gained like
15 minutes of actual football every week.

Built a free app for it if anyone wants to try: picknkick.com
Would love feedback from other groups.
```

---

## r/webdev (~2M) — Showoff Saturday

**Title:** Showoff Saturday — real-time draft app so my football group stops wasting pitch time (React + Supabase)

**Body:**

```
Built this for my weekly football group. We were wasting 10-15 min at
the pitch picking teams. Now captains draft on their phones before the
game — show up, teams are ready, play.

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
Side project — pickup football groups use it to draft teams on their
phones before the game. No more wasting pitch time picking teams.

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

**"Why not just use a random generator?"**
> "Random doesn't account for skill differences. With a draft, captains who know the players make judgment calls. Teams end up way more balanced. Plus you do it before the game so you're not wasting pitch time."

**"Is it really free?"**
> "Yeah, no ads, no premium tier. Built it for my own group and figured others could use it too."

**"Does it work for basketball/volleyball/etc?"**
> "Should work for any sport where you need to split into teams. Haven't tested it specifically but the draft mechanic is the same."

**"Open source?"**
> "Not yet but thinking about it. Want to get it more stable first."

**"We just do it at the pitch, it's fine"**
> "Fair enough — we thought the same for years. The 15 minutes back every week adds up though. If you ever want to try it, it's there."

**Bug report**
> "Appreciate you flagging that — I'll look into it today. Thanks for testing."
