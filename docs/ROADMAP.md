# Draft Pick — Product Roadmap

> Last updated: February 2026

---

## Vision

**Make picking teams for pickup soccer fair, fast, and fun — worldwide.**

We own the 5 minutes between "who's playing tonight?" and "here are the teams." Every competitor in this space is an ugly utility. We make it an event.

---

## Target User

**The pickup soccer organizer.** Someone who plays weekly with 6-20 friends, coordinates via WhatsApp, and is tired of arguing about teams in the parking lot. Age 18-45, international, mobile-first.

They don't need a season-long team management tool. They don't need to find games. They need fair teams in 2 minutes, shared to the group chat.

---

## Business Model

**Free forever.** Growth-first. Build the user base, prove the viral loop, monetize later. No ads, no paywalls, no friction.

Future monetization options (not now): premium themes, advanced stats, larger clubs, white-label for leagues.

---

## Growth Strategy

Every draft is an ad. Every WhatsApp share is a conversion opportunity.

```
Create draft → Share invite → Captains join → Draft happens → Share results → 15-20 people see link → Some create their own club → Repeat
```

**Channels (in priority order):**
1. WhatsApp viral loop (built-in, highest ROI)
2. App Store / SEO (long-term, compounding)
3. Reddit / social media (community building)
4. Content / video (TikTok, YouTube, Instagram)
5. Partnerships (5-a-side venues, pickup organizers)

See `docs/research/06-growth-strategy.md` for the detailed 90-day playbook prompt.

---

## What's Done

| Area | Status |
|---|---|
| Core product (draft, results, game night) | Done |
| i18n infrastructure (react-i18next) | Done |
| English translation (all pages) | Done |
| RTL → LTR conversion | Done |
| Language picker | Done |
| 2-3 team support | Done |
| Database migration for multi-team | Applied |
| App icons (placeholder "DP") | Done |
| Brand guide | Done |

---

## Launch Checklist (This Week)

**Must ship:**

| # | Task | Status |
|---|---|---|
| 1 | Fix OG image (proper 1200x630, absolute URL) | Not started |
| 2 | Update logo component (replace emoji with mark) | Not started |
| 3 | English legal pages (Privacy, Terms) | Not started |
| 4 | Set production domain + deploy | Not started |
| 5 | Test 2-team draft end-to-end | Not started |
| 6 | Test 3-team draft (no regressions) | Not started |

**Already done:**
- App icons replaced (Hebrew → "DP")
- TTS language fixed (dynamic, not Hebrew)
- All pages translated to English
- Multi-team support frontend + backend

---

## Phase 1: Launch & Learn (Weeks 1-4)

**Goal:** Ship the MVP internationally. Get 50 real drafts from real pickup groups. Learn what breaks.

**Actions:**
- Deploy to production domain
- Share with personal network and pickup soccer contacts
- Post on Reddit (r/soccer, r/5aside) and local soccer communities
- Fix bugs discovered in real usage
- Track: drafts created, shares sent, link clicks, return rate

**Metrics:**
| Metric | Target |
|---|---|
| Clubs created | 20 |
| Drafts completed | 50 |
| Countries | 3+ |

---

## Phase 2: Viral Growth (Months 2-3)

**Goal:** Optimize the viral loop. Every share should convert better. Get to 100 active clubs.

**Actions:**
- Optimize WhatsApp share templates (A/B test message format, emoji, CTA)
- Improve "Played here? Join the club" conversion on results/night-results pages
- Add "Share with another group" prompt after initial share
- Create App Store listing (iOS + Android wrapper)
- ASO optimization per market (soccer vs football keywords)
- Translations: Spanish, French (largest soccer markets after English)
- Create short-form video content (TikTok/Reels showing a live draft)
- Partner outreach to 5-a-side venues and pickup organizers

**Metrics:**
| Metric | Target |
|---|---|
| Clubs created | 100 |
| Drafts completed | 500 |
| WhatsApp shares | 1,000+ |
| Countries | 10+ |

---

## Phase 3: Engagement & Retention (Months 3-6)

**Goal:** Make users come back every week. The draft should be the highlight of game day, not just a utility.

**Features:**
- **Player stats & history** — goals per night, draft frequency, win rate. Every player gets a profile.
- **Player ratings / skill tiers** — organizer rates players (1-5 stars). Enables balanced auto-draft later.
- **Season mode** — track standings across multiple game nights. Weekly leaderboard.
- **Achievements & badges** — "First hat trick", "10 game nights", "Undefeated streak". Shareable.
- **Push notifications** — game night reminders, draft invites, "Your weekly game is tomorrow."
- **Theme system** — 5 neutral premade color themes (Pitch, Midnight, Sunset, Arena, Classic).

**Translations:** German, Italian, Dutch (complete all 6 target languages).

**Metrics:**
| Metric | Target |
|---|---|
| Weekly active clubs | 200 |
| Retention (draft again within 14 days) | 40%+ |
| Game nights per draft | 0.5+ (half of drafts lead to tracked games) |

---

## Phase 4: Expansion (Months 6-12)

**Goal:** Expand what the app can do and who it serves.

**Features:**
- **4-5 team support** — architecture is ready, just needs UI for 4-5 columns
- **Tournament mode** — bracket-style knockout across multiple game nights
- **Auto-draft** — balanced teams based on skill ratings, no captains needed. "Just split us fairly."
- **Advanced game night** — substitutions, yellow/red cards, assists, MVP voting
- **Multi-sport** — the draft mechanic works for basketball, volleyball, any team sport. Expand beyond soccer.
- **Public clubs / discovery** — find pickup games near you (Footy Addicts territory)

**Metrics:**
| Metric | Target |
|---|---|
| Total users | 10,000+ |
| Weekly active clubs | 500+ |
| Sports supported | 2+ |

---

## Phase 5: Platform (Year 2+)

**Goal:** Become the infrastructure for pickup sports worldwide.

**Features:**
- **API for integrations** — let others build on our draft engine
- **League management** — recurring schedules, standings tables, playoffs, promotion/relegation
- **Venue partnerships** — integration with booking platforms
- **Monetization** — premium themes, advanced analytics, larger club limits, white-label for leagues
- **Native mobile app** — React Native or Capacitor for push notifications, offline, and performance

---

## Technical Debt & Infrastructure

These should be addressed alongside feature work:

| Item | Priority | Impact |
|---|---|---|
| **Code splitting** | High | 1.2MB bundle → route-based lazy loading |
| **Separate Supabase project** | High | Production database separate from Hebrew version |
| **Error monitoring** (Sentry) | High | Know when things break in production |
| **Analytics** (PostHog/Mixpanel) | High | Track viral loop metrics |
| **CI/CD pipeline** | Medium | Automated build + deploy on push |
| **Automated testing** | Medium | Expand beyond current smoke tests |
| **Image optimization** | Low | Background images, OG images |
| **PWA offline support** | Low | Service worker caching for key pages |

---

## Metrics That Matter

### Viral Loop Metrics
| Metric | What It Tells Us |
|---|---|
| **Shares per draft** | Are users sharing results? |
| **Click-through on shared links** | Are shares compelling? |
| **New clubs from shared links** | Is the viral loop converting? |
| **K-factor** | Viral coefficient — is each user bringing >1 new user? |

### Engagement Metrics
| Metric | What It Tells Us |
|---|---|
| **Drafts per club per month** | Are clubs coming back? |
| **Game nights per draft** | Are users using the full product? |
| **Players per draft** | Is the group size growing? |
| **Time from signup to first draft** | Is onboarding smooth? |

### Retention Metrics
| Metric | What It Tells Us |
|---|---|
| **14-day return rate** | Do clubs draft again? |
| **30-day club survival** | How many clubs stay active? |
| **Player claim rate** | Are non-organizers engaging? |

---

## Open Research Questions

These need focused research before decisions. Prompts are in `docs/research/`:

| Question | Research File |
|---|---|
| Is "Draft Pick" the right name? | `01-naming.md` |
| What should our colors be? | `02-color-palette.md` |
| What should our logo look like? | `03-logo.md` |
| What fonts should we use? | `04-typography.md` |
| What's our visual design personality? | `05-visual-language.md` |
| How do we get our first 1,000 users? | `06-growth-strategy.md` |
