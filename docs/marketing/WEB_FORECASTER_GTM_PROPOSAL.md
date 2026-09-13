# Web Forecaster GTM Proposal

**Status:** Motion · Sep 13, 2026 · **Phase 0 done · ship web GTM now**  
**App:** Burnline Cockpit · [burnline.dev](https://burnline.dev)  
**ASC:** 1.0.1 build 21 · `WAITING_FOR_REVIEW` · release `AFTER_APPROVAL`  
**Companion canvas:** open beside chat — [`burnline-web-forecaster-gtm-proposal.canvas.tsx`](/Users/willpark/.cursor/projects/Users-willpark-Documents-GitHub-limeboard/canvases/burnline-web-forecaster-gtm-proposal.canvas.tsx)

### Now / Next / Hold (Sep 13, 2026)

| Lane | Action |
|---|---|
| **Now** | Ship Pages forecast GTM — web can ship ahead of App Store release |
| **Next** | Community drafts on ASC approval |
| **Hold** | X / Product Hunt / outbound social until approve — do not post |
| **After ASC approve** | Live store refresh beat when 1.0.1 releases |

### Phase 0 status (landed)

| Item | Result |
|---|---|
| **CORS gate** | **PASS** — OpenRouter `/api/v1/key` + `/credits` return `access-control-allow-origin: *`; `Authorization` is in `access-control-allow-headers`. Live browser audit from `burnline.dev` is viable. Re-probe: `docs/forecast/cors-probe.sh`. |
| **Pages** | `/` marketing IA + App Store / forecaster CTAs; `/forecast/` local-only client forecaster; privacy wording for browser storage; nav wired across home / forecast / privacy / terms. |
| **Security** | No Burnline key proxy; session key in `sessionStorage` (optional `localStorage`); management-key discouraged in copy; CORS-failure UI points to CLI coming soon (`/#cli`). |
| **MVP posture** | Web primary / CLI conditional MVP+1 |
| **Not in Phase 0** | CLI package, Discord bot, X automation (unchanged — outbound/social **HOLD**). |

---

## Executive verdict

**GO** for GitHub Pages as the host for marketing + a free, **local-only** OpenRouter burn/runway forecaster. **Dual-path, web primary.**

| Decision | Choice |
|---|---|
| **Hosting** | GitHub Pages on `burnline.dev` (existing `docs/` pipeline) |
| **Category** | AI credit runway / LLM spend cockpit — **not** FinOps |
| **Beachhead** | Solo OpenRouter agent builders ($20–500/mo) |
| **Promise** | Know your burn. Know your runway. |
| **MVP** | Web `/forecast` (**primary** top-of-funnel) |
| **MVP+1** | `npx burnline audit` (**conditional** — trust + CORS fallback) |
| **Day-0 gate** | Confirm OpenRouter **browser CORS** from `burnline.dev` |

Static hosting forces the right security model: keys never hit a Burnline server. Custom domain + TLS already ship.

**If CORS fails:** keep marketing + demo UX on Pages; put the live audit in the CLI first. Do **not** add a Burnline key-proxy “just for CORS” — that breaks the privacy story.

### Insight: CLI forecaster value is **Conditional**

CLI is valuable for the **terminal-native / key-skeptical** beachhead slice — **not** the default first try for most users.

| Rule | Detail |
|---|---|
| **Worth trying only if** | One command → burn + days-to-zero from a real session key in **&lt;1 min**, **zero Burnline network** |
| **Kill modes** | Balance-only output · heavy `npx` friction · management-key pressure · FinOps vibes |
| **Lead with** | Web `/forecast` — shareable zero-install activation |
| **Ship CLI as** | **MVP+1** (trust twin + CORS fallback), **not** sole top-of-funnel |
| **Motion** | Dual-path, web primary — matches **Phase 0 web → Phase 1 CLI** |

---

## 1. Why GitHub Pages works

**Fits**

- Existing deploy: `docs/` → Actions → github-pages → burnline.dev
- Client-side SPA + `sessionStorage` / `localStorage` matches brand (keys on-device; same promise as iOS SecureStore)
- Legal surface already live (`/privacy`, `/terms`); App Store CTAs already point here
- Constraint = feature: you cannot accidentally stand up a key-proxy

**Cannot do on Pages**

- No server secrets, webhooks, or durable forecaster accounts
- SPA routing needs a simple path (`/forecast/` as its own `index.html`) or hash routes
- Live OpenRouter calls depend on browser CORS (native app already works)

---

## 2. Positioning (aligned with GTM playbook)

> For solo OpenRouter agent builders who need to know how fast credits are dying, Burnline is the **AI credit runway cockpit**. The free web forecaster is the zero-install aha: paste a **read-only session key** locally, see burn + runway in under a minute, then download the app for ambient **Desk Monitor** and proactive alerts. CLI is the high-trust secondary path for terminal-native builders — **not** the default first try.

| Pillar | Role |
|---|---|
| Burn + runway | Hero metric (not balance-only) |
| Local-only keys | Trust wedge for web + CLI |
| Desk Monitor | Differentiated post-aha ask |
| Companion to OR Activity | Don’t “replace the dashboard” |
| Web primary / CLI conditional | Shareable activation first; CLI for trust slice + CORS fallback |

**Anti-personas:** enterprise FinOps / SSO, RP hobby chatters, Android-first, hard kill-switch seekers.

---

## 3. Proposed site IA

| Path | Job | Primary CTA |
|---|---|---|
| `/` | Brand + promise + App Store + link to forecaster | Try free forecaster → Download |
| `/forecast/` (or `/audit/`) | Local-only burn/runway diagnostic (**MVP · primary**) | See runway → Get Desk Monitor (App Store) |
| `/privacy/` · `/terms/` | Legal (existing) | Support email |
| Home `#cli` section | Conditional CLI path for terminal-native / key-skeptical slice | `npx burnline audit` (**MVP+1**) |

**Home hero:** keep one composition — brand, tagline, one supporting line, CTA group. Forecaster is first-class, not a buried demo. CLI is a secondary trust section — not equal hero weight.

**`/forecast` copy spine:** anxiety → local-only trust → burn + runway result card → soft Desk Monitor / App Store ask → optional Pro only after spike language. Features never lead.

---

## 4. Messaging

| Surface | Lead | Avoid |
|---|---|---|
| Home | Know your burn. Know your runway. | Feature laundry list in hero |
| `/forecast` | Local burn check · session key (**primary activation**) | Management-key upsell as default |
| CLI README | Conditional high-trust local audit (**MVP+1**) | Balance-only · FinOps · management-key pressure · sole top-of-funnel |
| Discord | Ephemeral audit embed | Public key paste in channel |
| X / PH | Runway anxiety → instrument | Paid UA, enterprise outbound |

**Web hook:** “Credits left ≠ runway left. Check yours in the browser — key stays local.”

**Funnel lines (soft)**

- After aha: “Want this always-on? Desk Monitor puts the speedometer on a second display.”
- After spike: “Pro alerts when velocity breaks your baseline — on device, not another dashboard.”

Never: “Stop opening the dashboard,” “FinOps platform,” “paste your management key in chat.”

---

## 5. Channel stack (ranked)

Scored for beachhead fit × trust × build cost × distribution leverage (relative 1–5; Build = inverse cost). **Web leads top-of-funnel; CLI is conditional MVP+1.**

| Rank | Channel | Fit | Trust | Build | Leverage | Decision |
|---|---|---|---|---|---|---|
| 1 | Web forecaster on Pages | 5 | 4 | 3 | 5 | **SHIP (MVP · primary)** |
| 2 | `npx burnline audit` (CLI) | 4* | 5 | 3 | 4 | **SHIP (MVP+1 · conditional)** |
| 3 | Discord `/burnline audit` | 5 | 4* | 3 | 4 | **SHIP (phase 2)** |
| 4 | Telegram TWA | 2 | 3 | 4 | 2 | **DEFER** |
| 5 | X DM Quick-Reply Bot | 3 | 2 | 2 | 2 | **DEFER / hold** |
| 6 | Farcaster Frames v2 | 2 | 3 | 3 | 2 | **DEFER** |
| 7 | X `@BurnlineAudit` mentions | 2 | 1 | 2 | 2 | **KILL** |

\*CLI Fit is high only for the terminal-native / key-skeptical slice — not default first try for most users. Kill modes: balance-only, heavy `npx` friction, management-key pressure, FinOps vibes. Discord trust is high only if responses are **ephemeral** and copy forbids management keys / public paste.

### Ship order

1. **Phase 0 — Pages + forecaster (primary)** — `/forecast`, sessionStorage key, burn + runway card, App Store + Desk Monitor CTAs; privacy wording for browser storage. Shareable zero-install activation.
2. **Phase 1 — CLI (conditional MVP+1)** — `npx burnline audit`; same metrics; worth shipping only if one command → burn + days-to-zero from a real session key in &lt;1 min, zero Burnline network. Highest trust for terminal-native builders; CORS fallback — **not** sole top-of-funnel.
3. **Phase 2 — Discord** — slash + modal; ephemeral embed; session/read-only key copy; never log keys.

### Defer / kill rationale

| Channel | Call | Why |
|---|---|---|
| X DM Quick-Reply Bot | Defer | X API credits depleted; posting held. DM key paste has weak trust optics. Prefer linking to `/forecast`. |
| X automated mentions | **Kill** | Public timeline + API keys is brand-ending. Do not build `@BurnlineAudit`. |
| Telegram TWA | Defer | Low beachhead density vs Discord / HN / Reddit. |
| Farcaster Frames v2 | Defer | Cool distribution, wrong first mile; revisit after iOS PMF. |

---

## 6. Security & privacy constraints

### Must

- Prefer **session / limited** keys. UI: “Session key is enough for balance, burn, and runway.”
- Store only in `sessionStorage` (prefer) or `localStorage` with clear/disconnect; never upload to Burnline servers.
- Call OpenRouter from the browser or CLI process only.
- Discord: ephemeral responses; no persistence of pasted secrets; redact key-like strings from logs.
- Update privacy policy: web forecaster uses browser storage (not SecureStore).

### Must not

- Encourage pasting **management keys** into public channels, tweets, non-ephemeral Discord, or Frames.
- Stand up a Burnline proxy that accepts `Authorization` headers “to fix CORS.”
- Persist keys in analytics, error reporters, or URL query strings.
- Claim “we never see your key” while a bot holds keys server-side without a clear ephemeral threat model.

If a channel requires a server to hold the key even briefly, it loses to local web (primary) + CLI (conditional) for beachhead trust.

---

## 7. MVP scope

### In — web forecaster (**primary**)

- Masked session-key paste
- `GET /api/v1/key` + `/credits` → balance
- Burn estimate + days-to-zero
- Simple spike heuristic vs recent spend
- Disconnect / clear storage
- CTAs: App Store, Desk Monitor story
- No-key teaser: Platform Pulse blurb

### In — CLI (**MVP+1 · conditional**)

- `npx burnline audit`
- Prompt or `OR_API_KEY` env
- Same metrics as web card (burn + runway — not balance-only)
- Print App Store + `/forecast` URLs
- Zero network to Burnline
- Gate: &lt;1 min to aha or do not lead with it

### Out of MVP

- Accounts / Supabase on the site
- Management-key fleet charts
- Live Desk Monitor on Pages
- X bots / mention auditor
- Telegram / Farcaster
- Multi-provider, team, FinOps
- Server-side alerts
- CLI as sole top-of-funnel

---

## 8. Funnel to App Store · Desk Monitor · Pro

| Stage | Experience | Conversion ask |
|---|---|---|
| Discover | Discord / HN / Reddit → burnline.dev/forecast (CLI secondary) | Try free forecaster (no install) |
| Aha | Local key → burn + runway card in &lt;60s | Trust: keys stayed in browser |
| Upgrade ambient | Always-on speedometer on second display | Download Cockpit → Desk Monitor |
| Upgrade proactive | Spike language mirrors in-app anomaly | Soft Pro after real spike / Explore |
| Retain | Widget / Live Activity / Desk (app) | North star: saw burn during an agent session |

---

## 9. What NOT to do

- Dilute into FinOps or “AI cost analytics platform”
- Compete as OpenRouter Activity replacement
- Ship public-key social bots
- Add a key proxy
- Lead marketing with charts/features
- Treat CLI as the default first try for most users
- Block the static forecaster on App Store build status
- Spend cycles on X automation while publishing credits are empty — post `CONTENT_KIT` manually instead

---

## 10. Immediate next steps

1. CORS probe: `burnline.dev` origin → OpenRouter `/key` + `/credits` (gate for live web audit)
2. Ship `/forecast` MVP in `docs/` + privacy wording for browser storage (**primary** funnel)
3. Home IA: hero keeps tagline; secondary CTA → forecaster
4. Scaffold `npx burnline audit` (MVP+1) — only if &lt;1 min burn+runway, zero Burnline network (conditional trust / CORS fallback)
5. Discord bot design doc (ephemeral-only) — build after web + CLI
6. Hold all X automation; manual CONTENT_KIT only

---

## Related

- `docs/marketing/GTM_PLAYBOOK.md` — category, beachhead, 90-day motion
- `docs/marketing/CONTENT_KIT.md` — voice + launch posts (manual while X API held)
- `docs/index.html` — current burnline.dev landing
- `lib/config/legal.ts` — public URLs / support
