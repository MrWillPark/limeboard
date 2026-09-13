# Outbound draft queue (approval-only)

> **HOLD — do not publish until Will approves.**  
> These are drafts only. No posting to X, Reddit, Indie Hackers, HN, Discord, or email. User will approve later. Do not schedule, auto-post, or paste into live channels.

**Primary CTA:** https://burnline.dev/forecast  
**Secondary (soft):** App Store / Desk Monitor — never lead public posts with management-key asks.  
**Web primary · CLI conditional** — lead with the free local forecaster; CLI is not the default first try.

---

## Messaging alignment (all drafts)

| Do | Don’t |
|---|---|
| **Credits left ≠ runway left** | Balance-only pitches |
| Free forecaster trust: session key stays in the browser | Ask for management keys in public |
| Soft Desk Monitor as post-aha secondary | Feature laundry lists / FinOps jargon |
| Companion to OpenRouter Activity | “Replace your dashboard” / “Stop opening the dashboard” |
| OpenRouter today. More providers coming. | “Supports all providers” |

---

## Explicitly excluded / held

| Channel | Status | Why |
|---|---|---|
| Paid X API posts / X automation | **HOLD** | X API credits depleted; CONTENT_KIT is manual-only when approved. No bots. |
| Product Hunt | **HOLD** | Soft PH is Days 31–60 playbook — not this web-forecaster wave. |
| Discord bot spam / cold channel pitches | **HOLD** | Phase 2 is ephemeral slash audit only; never cold-spam or ask for keys in public channels. |
| X `@BurnlineAudit` mentions | **KILL** | Public timeline + keys is brand-ending. |
| Email outbound | **HOLD** | Out of scope for this queue. |

---

## Pre-publish checklist

Before **any** draft below goes live, all of the following must be true:

### Required for every channel

- [ ] Will has explicitly approved the specific draft (title + body)
- [ ] **Forecast is live** on https://burnline.dev/forecast (CORS + burn/runway card works from browser)
- [ ] Privacy wording covers browser storage for the forecaster
- [ ] CTA resolves to `/forecast` (not a broken path)
- [ ] Copy does **not** ask for management keys or public key paste
- [ ] Desk Monitor / App Store is soft secondary only (optional one-liner max)

### App Store / 1.0.1 by channel

| Channel | App Store / 1.0.1 | Rule |
|---|---|---|
| Reddit r/openrouter | **Optional** | Forecaster link is enough; App Store OK as soft footer if listing is clean |
| Indie Hackers | **Optional** | Same — web aha first; App Store if screenshots/listing are Burnline-clean |
| Show HN | **Optional / prefer omit** | Product is the free local forecaster; App Store can feel pitchy — link only if asked |
| Soft replies | **Optional** | Match the thread; forecaster link primary |

**1.0.1 required only if** the draft leans on App Store screenshots, subtitle, or privacy URL claims. If listing still has Limeboard residue or empty overlay set, omit App Store CTAs and ship forecast-only.

---

## Drafts

### Draft 1 — Reddit r/openrouter (variant A · burn/runway hook)

| Field | Value |
|---|---|
| **Channel** | Reddit · r/openrouter |
| **Title** | Credits left ≠ runway left — free local OpenRouter burn check |
| **CTA URL** | https://burnline.dev/forecast |
| **Risk notes** | Self-promo rules: disclose you’re the builder; keep it one tool share, not a feature dump. Avoid “management key.” Don’t spam multiple subs the same day. |

**Body:**

```
I kept checking balance and still getting surprised by how fast credits died overnight with agents running.

Credits left ≠ runway left. So I shipped a free, browser-only forecaster: paste a read-only session key locally, see burn + days-to-zero. Key stays in your browser — nothing hits a Burnline server.

https://burnline.dev/forecast

(If you want it always-on on a second display, there’s an iOS Desk Monitor in the app — optional.)

Happy to take feedback / roast the UX.
```

---

### Draft 2 — Reddit r/openrouter (variant B · agent-spend anxiety)

| Field | Value |
|---|---|
| **Channel** | Reddit · r/openrouter |
| **Title** | Free local burn + runway check for OpenRouter (no install) |
| **CTA URL** | https://burnline.dev/forecast |
| **Risk notes** | Same self-promo disclosure. Don’t name rival apps. Don’t claim to replace OpenRouter Activity. Pick A or B — not both unless Will approves a spaced follow-up. |

**Body:**

```
Built a small local tool after too many “why did the balance crater” mornings.

It’s a free forecaster on the site: session key in the browser → live burn velocity + runway-to-zero. No account. No key upload to us.

https://burnline.dev/forecast

Meant as a glance companion to OpenRouter Activity, not a replacement. Feedback welcome.
```

---

### Draft 3 — Indie Hackers (short post)

| Field | Value |
|---|---|
| **Channel** | Indie Hackers |
| **Title** | Shipped a free OpenRouter burn/runway forecaster (local-only) |
| **CTA URL** | https://burnline.dev/forecast |
| **Risk notes** | Keep short; IH rewards builder honesty over launch hype. Soft App Store OK. Don’t pitch Pro. |

**Body:**

```
Beachhead: solo builders running agents on OpenRouter who know their credit balance but not how many days they have left.

Shipped: a free web forecaster — paste a session key locally, get burn + days-to-zero in under a minute. Keys stay in the browser.

https://burnline.dev/forecast

Next: ambient Desk Monitor on iOS for always-on visibility. Curious if “credits ≠ runway” resonates for anyone else shipping agent stuff.
```

---

### Draft 4 — Hacker News (Show HN · optional, careful)

| Field | Value |
|---|---|
| **Channel** | Hacker News · Show HN |
| **Title** | Show HN: Burnline – local OpenRouter burn and runway forecaster |
| **CTA URL** | https://burnline.dev/forecast |
| **Risk notes** | Easy to read as spam if it sounds like marketing. Lead with the local/no-server model and the metric insight. Expect tough privacy/CORS questions — answer calmly. Prefer **no** App Store in the first comment unless asked. Don’t Show HN until forecast is rock-solid. Skip if timing overlaps a big HN thread day. |

**Body:**

```
Show HN: Burnline – local OpenRouter burn and runway forecaster

I got tired of treating credit balance as the whole story. Balance is what’s left; runway is how long it lasts at current burn.

Burnline’s free forecaster runs entirely in the browser against OpenRouter’s API. You paste a session/read-only key into sessionStorage, see burn velocity and days-to-zero, then clear it. No Burnline backend holds the key.

https://burnline.dev/forecast

Happy to discuss the local-only model, CORS constraints, and why we discourage management keys for this path.
```

---

### Draft 5 — Soft reply template (bill-surprise thread)

| Field | Value |
|---|---|
| **Channel** | Soft reply · Reddit / Discord / HN comments (when someone reports unexpected OpenRouter spend) |
| **Title** | _(no title — reply only)_ |
| **CTA URL** | https://burnline.dev/forecast |
| **Risk notes** | **Reply only** when the thread is about surprise spend / agent loops / token mismatch — never cold-drop. One link max. Disclose affiliation if asked. Never request keys in-thread. |

**Body:**

```
Sorry that happened — overnight agent burn is brutal.

One thing that helped me: watching burn rate and days-to-zero, not just balance. Credits left ≠ runway left.

There’s a free local check (session key stays in the browser): https://burnline.dev/forecast

(I’m the builder — ignore if unwelcome.)
```

---

### Draft 6 — Soft reply template (IDE tokens ≠ OpenRouter bill)

| Field | Value |
|---|---|
| **Channel** | Soft reply · threads about IDE token counts vs OpenRouter billing |
| **Title** | _(no title — reply only)_ |
| **CTA URL** | https://burnline.dev/forecast |
| **Risk notes** | Empathy first; don’t dunk on the IDE. Don’t oversell. Same affiliation honesty. |

**Body:**

```
Yeah — IDE counters and OpenRouter billing often don’t match 1:1, so balance alone is a late signal.

If you want a quick sanity check on burn + runway from a session key (local in the browser): https://burnline.dev/forecast

Full disclosure: I built it. Happy to delete if this isn’t useful here.
```

---

## Draft count

| # | Channel | Status |
|---|---|---|
| 1 | Reddit r/openrouter (variant A) | HOLD |
| 2 | Reddit r/openrouter (variant B) | HOLD |
| 3 | Indie Hackers | HOLD |
| 4 | Show HN (optional) | HOLD |
| 5 | Soft reply · bill surprise | HOLD |
| 6 | Soft reply · token mismatch | HOLD |

**Total drafts: 6** (all approval-gated; none scheduled).

---

## Related

- `docs/marketing/CONTENT_KIT.md` — voice + X drafts (manual / held)
- `docs/marketing/GTM_PLAYBOOK.md` — category, beachhead, channel priority
- `docs/marketing/WEB_FORECASTER_GTM_PROPOSAL.md` — web primary, CLI conditional
