# Research Prompt: Growth Strategy — First 1,000 Users

## Your Task

Create a 90-day growth playbook to get the first 1,000 active users for a soccer/football draft app. The app is free, the primary distribution channel is WhatsApp, and the budget is zero (bootstrapped). End with a week-by-week action plan.

---

## App Context

**What it does:** Live snake draft for pickup soccer. Create a club → add players → pick captains → live draft on phones → share teams via WhatsApp → track game night (timer, goals, standings).

**Core value prop:** "Fair teams. No arguments."

**Target users:** Casual pickup soccer groups — friends who play weekly, 6-20 players, organize via WhatsApp. International (English default, expanding to ES, FR, DE, IT, NL).

**Business model:** Free forever. Growth-first, monetize later.

**Tech:** PWA (installable web app, works on any phone, no app store required). Can also be listed on app stores.

**Current state:** App is functional. Hebrew version (kohot.online) has real users in Israel. International version is nearly launch-ready.

---

## The Viral Loop (Already Built)

The app has a natural viral loop built into its core flow:

```
User creates draft
    → Shares invite link on WhatsApp group
        → 2-3 captains open link and join
            → Draft happens live
                → Results shared on WhatsApp
                    → Everyone in the group sees the results link
                        → Some click → see "Create your own club"
                            → New user creates draft → loop repeats
```

**Key viral moments:**
1. **Captain invite** — organizer sends a WhatsApp link to the group. Everyone sees it.
2. **Results share** — formatted team lists + link posted to the group. ~10-20 people see it.
3. **Game night summary** — scores and standings shared after games.
4. **Player claim CTA** — "Played here? Tap to join the club" on results/night-results pages.

**Current share templates:**

Draft invite:
```
Join our draft "{{name}}"!
Game code: {{code}}
Click to join: {{url}}
```

Results:
```
🏆 {{draftName}}
⚽ Team {{captain}}: {{players}}
📋 View results: {{url}}
⚡ Fair teams. No arguments. — Draft Pick
```

---

## Growth Channels to Research

### 1. WhatsApp Viral Optimization

The app's primary growth engine. Research questions:
- What makes a WhatsApp shared link get clicked? Preview image, text formatting, emoji usage?
- How can we optimize the OG image for WhatsApp? (Current: no proper OG image)
- Should the share message be shorter or longer? What's the optimal format?
- Can we add a "Share with other groups" prompt after sharing to one group?
- How do we convert results-page visitors into club creators? What CTA works?
- What's the expected viral coefficient (K-factor) for this type of share? If each draft reaches 15 people and 2% create their own club, is that enough?

### 2. App Store Optimization (ASO)

The app is a PWA but can be wrapped for app stores.
- Should we list on App Store and Google Play at launch? Or stay PWA-only?
- What are the top search terms for team picking / soccer draft apps?
- What's the competition like for "soccer team picker", "fair team picker", "snake draft"?
- What screenshots and descriptions drive installs for utility sports apps?
- Should we optimize for "soccer" (US) or "football" (everywhere else) or both?

**Keywords by market:**

| Market | Primary Keywords |
|---|---|
| US | soccer, draft, team picker, fair teams, pickup soccer |
| UK | football, 5-a-side, team picker, kickabout |
| Spain | futbol, equipos, draft, sorteo |
| Germany | fussball, mannschaft, fair teams |
| France | football, equipes, tirage au sort |
| Italy | calcio, squadre, draft |
| Netherlands | voetbal, teams, draft |

### 3. Community & Social Media

- **Reddit:** r/soccer, r/football, r/pickupsoccer, r/5aside — can we post authentically without being spam?
- **TikTok/Reels:** Short video showing a live draft happening — phones picking players, crowd sounds, team reveal. What format works?
- **Instagram:** Before/after (arguing about teams → using the app). Stories showing draft in action.
- **Facebook Groups:** Pickup soccer groups in major cities.
- **X (Twitter):** Soccer communities, #5aside, #pickupsoccer.
- **Local soccer forums:** Country-specific forums and Discord servers.

### 4. Content Marketing / SEO

- Blog or landing pages targeting "how to pick fair teams for soccer"
- "Fair team picker" as a search intent
- YouTube: "How we pick teams for our weekly game" — authentic content

### 5. Partnerships & Outreach

- Soccer facility owners (indoor, 5-a-side venues)
- Pickup soccer organizers on Meetup, Footy Addicts, etc.
- Soccer coaches and referees
- Soccer-focused content creators

### 6. Product-Led Growth Features

Things we could build to accelerate growth:
- **Public results pages** — SEO-indexable, shareable, discoverable
- **"Start your own club" CTA** on every shared page
- **Quick draft** without signup — lowest friction entry point
- **Invite friends to create clubs** — not just join yours
- **"Powered by Draft Pick"** watermark on shared results
- **Club discovery** — find public clubs near you (future feature)

---

## Constraints

- Zero marketing budget (bootstrapped)
- Single developer (limited time for marketing activities)
- No app store presence yet (PWA only at launch)
- Hebrew version exists but is a separate product (shared database during dev)
- Must work across multiple countries and languages
- No paid ads — organic only for now

---

## Success Metrics

| Metric | Target (90 days) |
|---|---|
| Clubs created | 100+ |
| Drafts completed | 500+ |
| WhatsApp shares sent | 1,000+ |
| Unique users (via results pages) | 5,000+ |
| Return users (drafted 2+ times) | 200+ |
| Countries represented | 10+ |

---

## Research Questions

1. **What's the realistic viral coefficient?** If an average draft has 15 players and reaches a WhatsApp group of 20 people, what % will create their own club? Model this.

2. **Which market to focus first?** Should we launch in one country (e.g., UK with its massive 5-a-side culture) or go global immediately?

3. **PWA vs App Store:** Is a PWA enough for the first 1,000 users? Or do people only trust apps from the store?

4. **Reddit strategy:** What's the right way to share on r/soccer or r/5aside without getting banned for self-promotion?

5. **TikTok potential:** Is there a "soccer team draft" video format that could go viral? What would it look like?

6. **Partnerships:** Who are the 10 most valuable people/organizations to reach out to in the pickup soccer world?

7. **Quick wins:** What are 3 things we can do THIS WEEK to start getting users?

---

## Deliverable

Provide:

1. **Viral loop analysis** — map the current viral loop, estimate K-factor, identify the weakest link and how to fix it

2. **Channel ranking** — rank all growth channels by: effort required, expected impact, time to results. Format as a 2x2 matrix (effort vs impact).

3. **Week-by-week action plan (12 weeks):**
   - Week 1-2: Launch preparation
   - Week 3-4: Initial distribution
   - Week 5-8: Scaling what works
   - Week 9-12: Optimization and expansion

4. **Share template optimization** — rewrite the WhatsApp share messages for maximum click-through. A/B test suggestions.

5. **Content calendar** — what to post, where, how often, for the first 90 days

6. **Top 10 specific actions** — the single most impactful thing to do in each of the first 10 weeks
