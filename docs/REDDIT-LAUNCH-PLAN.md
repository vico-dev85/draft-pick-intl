# Reddit Launch Plan — PickNKick

## Overview

Launch PickNKick across targeted subreddits over 1-2 weeks. Each post is tailored to the subreddit's culture, rules, and audience. Never cross-post the same text — each community gets a unique angle.

**Product URL:** https://picknkick.com
**One-liner:** Free web app that runs a live snake draft for pickup football teams

---

## Posting Schedule

| Day | Subreddit | Angle |
|-----|-----------|-------|
| Day 1 (Tue) | r/SideProject | Builder story — product showcase |
| Day 2 (Wed) | r/5aside | Exact target user — solve their problem |
| Day 4 (Fri) | r/webdev | Technical deep-dive |
| Day 7 (Tue) | r/soccer | Personal story — "my group had this problem" |
| Day 8 (Wed) | r/football | Same personal angle, different post |
| Day 9 (Thu) | r/reactjs | React-specific technical showcase |
| Day 11 (Tue) | r/FootballManager | Draft mechanics crossover |
| Day 14 (Fri) | r/InternetIsBeautiful | Direct link, polished product |

**Best posting times:** Tuesday–Thursday, 9–11am EST (highest Reddit engagement)

---

## Tier 1 — Your Exact Users

### r/5aside (~5K members)

**Why:** These are literally your users — people who play weekly 5-a-side and deal with team-splitting every week.

**Format:** Text post with images

**Title:**
> We built a free app to stop the "who picks teams?" argument before kickabouts

**Body:**
```
Every week it's the same thing. Someone has to pick teams, half the group
thinks it's unfair, the other half doesn't care until they're losing.

We made PickNKick — a free web app (no download needed) that handles it:

1. Add your regular players once
2. On game day, select who's playing
3. Pick 2-3 captains
4. Each captain joins on their phone with a 4-letter code
5. Live snake draft — captains pick one at a time, order reverses each round
6. Teams are done in 2 minutes, shared to your WhatsApp group

The snake draft means the person picking last in round 1 picks first in
round 2 — so teams come out balanced without arguments.

There's also a "Solo Draft" mode if you just want to split teams yourself
without the whole captain thing.

It's completely free, works on any phone browser, no app store needed.

https://picknkick.com

Happy to answer any questions. We play every Thursday and this has genuinely
saved us 15 minutes of arguing each week.
```

**Tips:**
- Small community, very targeted — engagement rate will be high
- Reply to every comment
- Don't oversell — these people are pragmatic

---

### r/soccer (~4M members)

**Why:** Massive audience of football fans, many play pickup/casual.

**Format:** Text post (check current rules — some periods allow self-promo, some don't)

**Title:**
> My group kept arguing about team splits for pickup — so I made an app that runs a live snake draft on everyone's phones

**Body:**
```
Been playing pickup every week for a few years. The worst part is never the
football — it's the 10 minutes before kickoff where someone tries to pick
"fair" teams and everyone complains.

So I built a thing. It's called PickNKick. Here's how it works:

- Before the game, you select who's coming tonight
- Pick 2 or 3 captains
- Each captain opens a link on their phone
- They take turns picking players in a snake draft (like fantasy football
  but for your real pickup game)
- Last pick in round 1 = first pick in round 2, so it stays fair
- Final teams get shared to WhatsApp in one tap

It also has a game night mode where you can track scores and do
winner-stays-on rotation if you play multiple games.

Free, no download, works in any browser: https://picknkick.com

If you play any kind of regular pickup/5-a-side/futsal, give it a try.
Been using it with my group for a while and it's genuinely made game day
smoother.
```

**IMPORTANT — Read the rules first:**
- r/soccer has strict self-promotion rules
- You may need to be an active commenter for a while before posting
- If direct links aren't allowed, share the URL in comments only
- Consider posting during "Free Talk Friday" or "Daily Discussion" threads first
- If your post gets removed, don't repost — engage in comments for a few weeks first, then try again

---

### r/football (~2M members)

**Why:** Football-focused (non-American), good overlap with pickup players.

**Title:**
> Built a free tool for splitting pickup teams fairly — live snake draft on your phones

**Body:**
```
If you play regular pickup/5-a-side, you know the problem: picking teams
takes forever and someone always thinks it's unfair.

I made PickNKick to fix this. It's a web app (no download) that runs a
snake draft:

- Select tonight's players from your saved squad
- Pick captains
- Each captain joins on their phone with a game code
- Take turns picking — snake order means it stays balanced
- Done in 2 minutes, teams shared to WhatsApp

Also has a solo mode where you can just split teams yourself by dragging
players around — good for when you don't need the whole draft ceremony.

Free at https://picknkick.com — works on any phone browser.

We've been using it weekly and it's eliminated the pre-game arguments.
Would love feedback from other pickup groups.
```

**Same self-promotion caution as r/soccer — check rules, engage first if needed.**

---

### r/FootballManager (~200K members)

**Why:** These people understand drafts, tactics, and player management. They'll appreciate the mechanics.

**Title:**
> Brought the FM draft concept to real-life pickup football

**Body:**
```
You know how FM has fantasy drafts? I built something similar for actual
pickup games.

PickNKick runs a live snake draft on everyone's phones:

- You maintain a squad of your regular players (like your FM squad)
- On game day, select who's available
- Pick captains → they join via a 4-letter code
- Snake draft: captains pick one player at a time, order reverses each round
- Random draft order decided by an animated raffle

Then after the draft, there's a Game Night mode:
- Timer for each game
- Tap to record goals
- Winner-stays-on rotation (3-team mode)
- End-of-night standings and top scorers

It's like a mini Football Manager for your weekly kickabout.

Free, no download: https://picknkick.com

Built it because my group was spending more time arguing about teams than
actually playing.
```

---

## Tier 2 — Builder / Developer Communities

### r/SideProject (~200K members)

**Why:** Friendliest community for launches. People genuinely want to see what you built and give feedback.

**Format:** Text post with screenshots/GIF

**Title:**
> I built a free PWA that lets pickup football groups draft fair teams live on their phones

**Body:**
```
Hey everyone — sharing a side project I've been working on.

**The problem:** My friends and I play pickup football every week. Picking
teams always caused arguments about fairness. Someone always felt they got
the weaker squad.

**The solution:** PickNKick — a web app that runs a live snake draft.
Captains join on their phones and take turns picking players. Snake order
(last pick in round 1 → first pick in round 2) keeps things balanced.

**How it works:**
1. Create a club, add your regular players once
2. On game day, select who's playing, pick 2-3 captains
3. Captains join with a 4-letter code on their phones
4. Live snake draft — pick players in turn with real-time updates
5. Final teams shared via WhatsApp with one tap
6. Optional: track scores with built-in game night mode

**Tech stack:**
- React 18 + TypeScript + Vite
- Supabase (Postgres + Auth + Realtime)
- Tailwind CSS + Framer Motion
- PWA (installable, works offline-ish)
- i18n ready (English first, more languages coming)

**What makes it interesting technically:**
- Real-time draft picks via Supabase Realtime channels
- Cryptographic RNG for draft order (no Math.random)
- Snake draft algorithm that handles 2-5 teams
- HashRouter + PKCE OAuth flow (tricky combo)
- Lazy loading with auto-retry on stale service worker chunks

It's completely free, no ads, no premium tier. I just wanted to solve
this problem for my group and figured others might find it useful too.

Live at https://picknkick.com

Would love feedback on the UX — especially the draft flow and the
landing page. What's your first impression?
```

**Tips:**
- Include 2-3 screenshots (landing page, draft board, results)
- This is your warmup — use feedback here to refine messaging for bigger subs
- Reply to every comment within a few hours
- Post on Tuesday or Wednesday morning EST

---

### r/webdev (~2M members)

**Why:** Large developer audience. Appreciates well-built side projects.

**Format:** Text post (check if "Showoff Saturday" or similar tag exists)

**Title:**
> Showoff Saturday: Real-time snake draft app for pickup soccer — React + Supabase Realtime

**Body:**
```
Built a PWA for my weekly pickup football group to draft fair teams.
Thought I'd share some of the interesting technical decisions.

**What it does:**
Captains join on their phones with a game code. They take turns picking
players in a live snake draft with real-time updates. Teams get shared
via WhatsApp.

**Stack:** React 18, TypeScript, Vite, Supabase (Postgres + Realtime + Auth),
Tailwind, Framer Motion, vite-plugin-pwa

**Interesting challenges:**

*Real-time draft picks*
Supabase Realtime postgres_changes channel — every pick triggers an update
that all connected clients receive. Had to handle race conditions with
optimistic UI + server-authoritative state via SECURITY DEFINER RPCs.

*Snake draft algorithm*
Fair pick order for N teams. Round 1: A→B→C. Round 2: C→B→A. Round 3:
A→B→C. The order generation is a pure function that handles 2-5 teams.

*HashRouter + PKCE OAuth*
Using HashRouter for static hosting (no server rewrites). But Supabase
implicit OAuth puts #access_token in the URL hash — which overwrites the
router. Solution: PKCE flow, which uses query params instead of hash.
Took a while to figure out.

*Cryptographic fairness*
Draft order raffle uses crypto.getRandomValues(), not Math.random().
Room codes too. Overkill? Maybe. But "the app cheated" is an argument
I never want to have.

*Chunk loading resilience*
React.lazy with auto-retry: if a chunk fails to load (stale service
worker after deploy), the app automatically reloads the page once
instead of showing an error screen.

**Live:** https://picknkick.com
**Free, no ads, no signup required for quick draft mode.**

Would appreciate feedback on the architecture or UX. What would you
do differently?
```

---

### r/reactjs (~400K members)

**Why:** React-specific community. Cares about patterns and architecture.

**Title:**
> Built a real-time multiplayer draft app with React 18 + Supabase — lessons learned

**Body:**
```
Sharing a side project and some React patterns I found useful.

**The app:** PickNKick — pickup football groups use it to draft fair teams
live on their phones. Captains join with a code and pick players in real
time.

**Patterns that worked well:**

*Lazy loading with chunk failure recovery*
```tsx
function lazyRetry(importFn) {
  return lazy(() =>
    importFn().catch(() => {
      if (!sessionStorage.getItem("chunk_reload")) {
        sessionStorage.setItem("chunk_reload", "1");
        window.location.reload();
        return new Promise(() => {});
      }
      sessionStorage.removeItem("chunk_reload");
      return importFn();
    })
  );
}
```
After deploys, stale service workers serve old chunk URLs. This auto-
reloads once instead of showing an error boundary.

*Per-route Suspense with theme-matched skeletons*
Dark-themed pages (auth, results) get a dark loading skeleton. Light pages
get the default. Prevents the flash when lazy chunks load.

*Centralized captain resolution*
All captain logic flows through a single helper module instead of
hardcoding captain1/captain2/captain3 across pages. Made adding support
for 2-5 teams much easier.

*Announcement queue hook*
Custom hook that queues TTS + sound effect announcements with auto-
language detection (switches voice for Hebrew/Arabic player names).

*SECURITY DEFINER RPCs over RLS*
Most data access goes through Postgres functions instead of direct table
queries. Avoids RLS policy recursion and keeps authorization logic
server-side.

**Stack:** React 18, TypeScript, Vite 5, Supabase, Tailwind, Framer Motion,
react-i18next, @dnd-kit/core

**Try it:** https://picknkick.com

What patterns do you use for handling real-time state in React?
```

---

## Tier 3 — General Interest

### r/InternetIsBeautiful (~17M members)

**Why:** Massive exposure if accepted. Very strict rules.

**Format:** Link post (direct URL)

**Title:**
> PickNKick — A free web app that runs a live snake draft to split pickup football teams fairly

**URL:** https://picknkick.com

**IMPORTANT RULES:**
- Must be a direct link post, no text body
- Site must be functional and polished
- No sign-up walls for core functionality (Quick Draft works without account ✓)
- No ads
- Must be free
- They remove anything that feels like marketing
- Post and don't engage in a salesy way — just answer questions honestly

---

## Visual Assets to Prepare

Before posting, create these:

1. **Screenshot: Landing page** — shows the product name and CTAs
2. **Screenshot: Draft board** — mid-draft with teams being built, players being picked
3. **Screenshot: Results page** — final teams with the WhatsApp share button
4. **GIF/Video (optional but high impact):** 15-second clip of the draft flow — captain picks a player, animation plays, player appears in team column

Upload to **Imgur** and include links in text posts. Reddit's algorithm favors posts with visual content.

---

## Response Strategy

**First 2 hours are critical.** Reddit's algorithm ranks posts by early engagement.

- Reply to EVERY comment within the first few hours
- Be genuine, not salesy — "thanks for checking it out" not "sign up now!"
- If someone reports a bug, thank them and fix it publicly
- If someone asks "why not just use X?", acknowledge the alternative and explain what's different
- Common questions to prepare answers for:
  - "Why not just use a random number generator?" → Snake draft is fairer than random, captains have agency
  - "Does it work for basketball/volleyball/etc?" → Yes, it works for any sport where you need to split into teams
  - "Is it really free?" → Yes, no ads, no premium. Built it for my own group.
  - "Open source?" → Not yet, considering it
  - "What about privacy?" → Only email for account, no tracking, no ads, data stays in Supabase

---

## What NOT to Do

- **Don't post to all subreddits on the same day** — looks like spam, and people notice
- **Don't use the same title/body across subs** — each community has different culture
- **Don't be defensive about criticism** — "good point, I'll look into that" goes far
- **Don't astroturf** — no fake accounts commenting positively
- **Don't buy upvotes** — Reddit detects and bans for this
- **Don't link in comments if the sub allows link posts** — it looks shady
- **Don't post during weekends** — lower engagement for product posts

---

## Tracking Success

After each post, note:
- Upvotes after 24h
- Number of comments
- Traffic to picknkick.com (check Supabase: new user signups, new clubs created)
- Any bugs reported
- Feedback themes (what people liked, what confused them)

Use this to refine your messaging for the next subreddit.

---

## Quick Reference

| Subreddit | Audience | Angle | Risk |
|-----------|----------|-------|------|
| r/SideProject | Builders | Product + tech showcase | Low — very friendly |
| r/5aside | Pickup players | Solve their exact problem | Low — small community |
| r/webdev | Developers | Technical deep-dive | Medium — can be critical |
| r/soccer | Football fans | Personal story | High — strict self-promo rules |
| r/football | Football fans | Personal story | High — strict self-promo rules |
| r/reactjs | React devs | React patterns | Medium — wants real substance |
| r/FootballManager | FM players | Draft mechanics crossover | Low — niche overlap |
| r/InternetIsBeautiful | General | Direct link, polished product | High — very strict curation |
