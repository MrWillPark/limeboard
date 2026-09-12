# Burnline Go-to-Market Playbook

**Status:** Research synthesis · Sep 11, 2026  
**App:** Burnline Cockpit (App Store) · [burnline.dev](https://burnline.dev)  
**Companion canvas:** open beside chat for the interactive summary

---

## Executive verdict

Own **“AI credit runway”** — the mobile LLM spend cockpit for OpenRouter.

| Decision | Choice |
|---|---|
| **Category** | AI credit runway / LLM spend cockpit (not enterprise FinOps) |
| **Beachhead** | Solo agent builders on OpenRouter ($20–500/mo) with overnight burn anxiety |
| **Hero promise** | Know your burn. Know your runway. |
| **Moat** | Desk Monitor + runway-to-zero + freemium + Platform Pulse |
| **Primary rival** | OpenRouter Activity (free substitute) + Openrouter Tracker (iOS peer ~$9.99) |
| **Price** | Keep freemium; test Pro **$4.99/mo** (current $2.99 is underpriced for specialized workflow) |
| **Ship gate** | Fix Limeboard residue (screenshots + ASC privacy URL) before any GTM push |

---

## 1. Positioning

### Statement

> For indie AI builders and agent operators who need to know how fast OpenRouter credits are dying, Burnline is the **mobile LLM spend cockpit** that turns balance into burn velocity and days-to-zero — on phone, lock screen, and second display. Unlike web dashboards and balance-only trackers, Burnline puts a live speedometer, runway, and Desk Monitor in your pocket — keys stay on-device.

**Internal shorthand:** Burnline = OpenRouter spend awareness you can glance at, not analyze at.

### Value pillars

1. **Burn + runway, not just balance** — Credits tell you what’s left; Burnline tells you how long it lasts.
2. **Always-on visibility (Desk Monitor)** — Burn rate on the big screen.
3. **Privacy-first, on-device keys** — Keys in Keychain; Platform Pulse needs no key.
4. **Pocket companion to OpenRouter Activity** — Desk for deep analysis; Burnline for the glance.

### Naming

| Context | Use |
|---|---|
| Brand, site, social, in-app | **Burnline** |
| App Store title only | **Burnline Cockpit** |
| Features | Cockpit, Desk Monitor, Platform Pulse, Explore |

---

## 2. Audience

### Beachhead (Days 0–90): Solo Agent Builder

- **Who:** Indie hackers, freelance AI builders; OpenCode / Hermes / Claude Code via OpenRouter; $20–500/mo.
- **JTBD:** Know burn rate and runway while agents run; sleep without dread of a drained balance.
- **Triggers:** Overnight agent; $5–$50 vanish in a day; IDE tokens ≠ OpenRouter bill.
- **Hangouts:** r/openrouter, agent Discords, HN, X (#OpenRouter), Indie Hackers.
- **Resonate:** Burn/runway, Desk Monitor, on-device keys.
- **Alienate:** Enterprise FinOps jargon; “replace Activity”; dark-pattern upsell.

### Expansion segments

| Segment | When | Role |
|---|---|---|
| B · Multi-model prototyper | 90d | Pulse + model-spend top-of-funnel |
| C · Key fleet operator | 90–180d | Pro conversion engine |
| E · Desk ambient operator | Ongoing | Viral Desk Monitor niche |
| D · Small team lead | 180d+ | After shared views exist |

### Anti-personas

- SillyTavern / RP hobby chatters (volume ≠ WTP)
- Direct Anthropic/OpenAI-only enterprises
- Procurement / FinOps / SSO buyers
- Users who want Burnline as a hard kill-switch / proxy
- Android-first (until iOS PMF)

### Demand evidence (selected)

- [$3k unexpected OpenRouter charges](https://www.reddit.com/r/openrouter/comments/1ttk5c9/3k_of_unexpected_charges_to_my_openrouter_key/)
- [$214 weekend agent loop](https://dev.to/ulnit/my-ai-agent-burned-214-in-api-credits-over-one-weekend-the-fix-was-embarrassingly-simple-l6) — “Watch spend rate, not just errors”
- [IDE 70k vs OR ~4M tokens](https://www.reddit.com/r/openrouter/comments/1u2ue4m/why_did_openrouter_bill_4m_tokens_when_opencode/)
- Category validation: [Openrouter Tracker](https://apps.apple.com/ng/app/openrouter-tracker/id6762788059)
- Ecosystem: agents ≈ majority of OR tokens; OR at 8M+ developers / ~1.5Q tokens/yr run rate ([Menlo](https://menlovc.com/perspective/openrouter-now-processes-more-than-a-quadrillion-tokens-a-year/)); Stripe acquiring OpenRouter

---

## 3. Competitive landscape

### Layers

1. **Glance / personal** — Burnline’s home. Peer: Openrouter Tracker.
2. **First-party OR Activity** — Free, deep, web-only. Default substitute.
3. **Cloud observability** — Helicone / Langfuse / Portkey / LangSmith at $29–$799+/mo. Wrong category.

### Threat matrix

| Priority | Competitor | Response |
|---|---|---|
| P0 | OpenRouter Activity | Beat on glance, runway, Desk, Pulse — not chart depth |
| P0 | Openrouter Tracker | Free + runway + Desk + Pulse + brand; match privacy story |
| P1 | OpenUsage / Burnrate | Own away-from-keyboard + second screen |
| P2 | Helicone / Langfuse / Portkey | Explicit non-compete: not a proxy |
| P3 | DIY bots/scripts | Lower setup to paste key → widget |

### White space

- Runway-to-zero as hero metric
- Desk Monitor / second-screen (uncontested)
- Freemium App Store funnel at consumer Pro pricing
- Platform Pulse no-key discovery
- On-device keys as trust brand

**Do not** compete as observability. Mentally partner as “the cockpit after the gateway.”

---

## 4. Messaging playbook

### Hierarchy

```
PROMISE     Know your burn. Know your runway.
PRIMARY     Mobile cockpit for LLM API spend — live burn, runway-to-zero, model breakdown.
SECONDARY   Desk Monitor · on-device keys · Pulse · companion to OR Activity · Free/Pro
FEATURES    Evidence only — never lead
```

### Voice

Calm flight instruments. Developer-sharp. Zero hype. Specific nouns: burn, runway, velocity, Desk Monitor.

| Do | Don’t |
|---|---|
| Lead burn + runway | “Stop opening the dashboard” (Tracker) |
| Companion to OR Activity | “Replace your dashboard” |
| “OpenRouter today. More providers coming.” | “Supports all providers” |
| Desk Monitor as uncontested | Generic “AI cost analytics platform” |

### ASO

| Field | Recommendation |
|---|---|
| Name | **Burnline Cockpit** (keep) |
| Subtitle | **LLM Spend Burn & Runway** (test vs OpenRouter Burn Speedometer) |
| Keywords | `openrouter,llm,api,spend,burn,runway,credits,token,cost,usage,agent,monitor,widget,velocity` |

### Tagline tests

| ID | Candidate | Role |
|---|---|---|
| T0 | Know your burn. Know your runway. | Control |
| T1 | Burn rate. Days to zero. | ASO / PH |
| T2 | Your LLM spend speedometer. | X / screenshots |
| T3 | Credits left ≠ runway left. | Reddit / PH hook |

### Launch narrative (PH / X / Reddit)

Anxiety → Instrument → Ambient → Trust → Soft ask  
(Burn trend → tagline → Cockpit → Desk Monitor → on-device keys → companion stance → Free/Pro ask)

Ready posts: `docs/marketing/CONTENT_KIT.md` (A/B/C).

### Objection handling

| Objection | Reply |
|---|---|
| I use OR Activity | Companion for the glance; Activity for the desk |
| Why pay $3? | Free covers awareness; Pro for operators (alerts, fleet, depth) |
| Only OpenRouter? | Deepest instruments where you burn today; more providers coming |
| vs Tracker / widget | Balance is table stakes; Burnline is the speedometer |

---

## 5. Pricing

| Product | Current | Recommendation |
|---|---|---|
| Free | Burn + Pulse + basic runway | Keep burn + runway forever free (aha wedge) |
| Pro monthly | $2.99 | Test **$4.99** (new subs only; grandfather) |
| Pro annual | $29.99 | Test **~$39.99** (~33% off) |

**Hypothesis:** $2.99 anchors as “cheap widget,” not “cockpit.” Anxiety relief (alerts + Live Activity + Desk) supports $4.99–$6.99 indie utility band.

**Experiment:** 2 weeks baseline → 4 weeks $4.99 → keep if ARPU ↑ >20% and start-rate drop <35%.

**Later:** Team seats only when multi-user is real ($12–$29/mo range). Don’t stretch Pro into team.

---

## 6. 90-day GTM motion

### Days 0–30 — Trust + launch

1. ASC privacy/terms → burnline.dev; kill LimeBoard Pro IAP leftovers
2. Regen screenshots — zero Limeboard wordmarks
3. Free forever: burn + runway; onboarding checklist Connect → Runway → Desk
4. Ship CONTENT_KIT posts; configure @getburnline bio
5. ASO subtitle + runway-hero screenshots
6. Peer replies in OR Discord / r/openrouter (no cold spam)

### Days 31–60 — Retention

1. Live Activity (burn + runway)
2. Velocity anomaly local alerts
3. Widget v2: burn + days-to-zero
4. Soft Product Hunt + Indie Hackers launch (60s Desk demo)
5. Seed 5–10 creators with Pro

### Days 61–90 — Virality + monetization

1. Desk Monitor share clips + Pulse share cards
2. Pricing experiment to $4.99
3. OpenRouter showcase / collab ask
4. Case study: “saved me from zero mid-demo”

### Channel priority

| Priority | Channel | Impact ÷ effort |
|---|---|---|
| P0 | OpenRouter-native content + community | Highest |
| P0 | App Store SEO + screenshots | High |
| P1 | Widgets / Desk Monitor virality | Med–High |
| P1 | Product Hunt / Indie Hackers | High (one-shot) |
| P2 | Creator seeding | Med |
| Skip | Paid UA, enterprise outbound | After PMF |

### Success metrics (solo-realistic)

- 1k–5k installs
- 5–12% free → paywall engagement
- 10–30 paying Pros
- **North star:** % of weekly actives who saw burn during an agent session (Live Activity / Desk / widget)

---

## 7. Product & brand alignment

### P0 brand cleanup (ship gate)

- [x] ASC privacy URL → `https://burnline.dev/privacy` (on **1.0.1** editable app info)
- [x] ASC subtitle → `LLM Spend Burn & Runway` (on **1.0.1**)
- [x] Screenshots regenerated locally — zero Limeboard (`store/screenshots/*-overlaid*`)
- [ ] Upload BURNLINE overlays to ASC **1.0.1** 6.9" set (currently empty — needs approval)
- [ ] Archive LimeBoard Pro subscription group (declined in ASC confirm prompts)
- [x] X bio from CONTENT_KIT (`@getburnline`)
- [ ] Post CONTENT_KIT A/B/C (X API credits depleted — post manually)
- [ ] **Defer:** bundle ID rename (`app.limeboard.mobile`)

### P0 product for beachhead JTBD

| Gap | Fix | Status |
|---|---|---|
| Free underpowered messaging | Free burn/runway framing + paywall Free forever list | Done |
| Desk buried | Cockpit Desk CTA + checklist step | Done |
| Key path vague | Session vs Management copy on connect | Done |
| No “something’s wrong” | In-cockpit velocity anomaly alert | Done (local) |
| No glance while locked | Live Activity API stub (`lib/live-activity/`) | Spike only — needs native extension |
| Onboarding aha | Connect → runway → Desk checklist | Done |

### Onboarding aha path

```
Install → Auth → Platform Pulse (no key)
  → Connect key (on-device)
  → Burn gauge + runway (FREE aha)
  → Desk Monitor nudge
  → Widget / Live Activity
  → Soft Pro after spike or Explore
```

### Anti-roadmap (next 6 months)

Do **not** build: multi-provider, infra/cloud bill burn, watchOS, model arbitrage engine, team/org dashboards, Android parity push, custom key backend, lifetime unlock to “beat Tracker,” heavy Explore chart expansion.

**Filter:** If it doesn’t help a solo builder glance burn during an agent run, it waits.

---

## 8. Immediate next 5

1. Fix ASC privacy/terms URLs; kill LimeBoard Pro products  
2. Regen Burnline screenshots; update listing  
3. Entitlement: free forever burn + runway  
4. Connect → runway → Desk checklist onboarding  
5. Ship CONTENT_KIT + start Live Activity / anomaly alert spike  

---

## Related files

- `docs/marketing/CONTENT_KIT.md` — X/launch posts
- `docs/index.html` — burnline.dev landing
- `lib/config/legal.ts` — public URLs / support
- `store/screenshots/` — ASC assets
- App Store: https://apps.apple.com/app/id6805714980
