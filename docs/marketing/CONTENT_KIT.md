# Burnline content kit

Draft-only. Do not post until Composio Twitter auth is connected and each post is approved.

## X connection setup (one-time)

Composio does not provide managed Twitter credentials — you need your own X Developer app:

1. Go to [console.x.com](https://console.x.com/) (logged in as `@getburnline`)
2. Create an app → enable **OAuth 2.0** (Web App type)
3. Set redirect URI: `https://backend.composio.dev/api/v1/auth-apps/add`
4. Copy Client ID, Client Secret, and Bearer Token
5. In Composio: [Set up Twitter auth](https://dashboard.composio.dev/~/org/connect/apps/twitter?open=true) → toggle **Use your own developer credentials** → paste credentials → Create
6. Tell me when done — I'll run the OAuth link to connect `@getburnline`

Guide: [Composio Twitter auth docs](https://composio.dev/auth/twitter)

## Alignment check (competitive research)

| Insight | Current marketing | Status |
|---|---|---|
| Lead with burn + runway, not dashboard convenience | Hero: "Know your burn. Know your runway." | Aligned |
| Avoid Tracker's "Stop opening the dashboard" | Not used as lead | Aligned |
| Desk Monitor is uncontested | Bullet 2 + Desk Monitor posts | Aligned |
| Platform Pulse = no-key wedge | Bullet 3 | Aligned |
| Hold "all providers" until #2 ships | "OpenRouter today. More providers coming." | Aligned |
| Complement OR Activity, don't replace | Pocket/glance framing in posts | Aligned |

ASC store name: **Burnline Cockpit** (plain "Burnline" taken). Brand on site/in-app: **Burnline**.

---

## X / Twitter status

**Connected:** `@getburnline` via Composio (account active)

- Profile not yet configured via API; drafts below are ready
- **Before posting:** approve each post

---

## Profile copy (when account is ready)

| Field | Copy |
|---|---|
| **Display name** | Burnline |
| **Handle** | `@getburnline` |
| **Bio** | Know your burn. Know your runway. Mobile LLM spend cockpit — OpenRouter today. |
| **Location** | — |
| **Website** | https://burnline.dev |
| **Pinned** | Launch post A (burn/runway) |

---

## Launch week posts (3)

Attach matching screenshot from `store/screenshots/iphone-6.9-1290-overlaid/` or desk-monitor set.

### Post A — Burn / runway (primary hook)

**Asset:** `02-cockpit-burn-trend.png`

```
Know your burn. Know your runway.

Live token velocity + days-to-zero for your OpenRouter spend — on your phone, not buried in a web dashboard.

https://burnline.dev
```

### Post B — Desk Monitor (uncontested)

**Asset:** `store/screenshots/desk-monitor-overlaid/01-desk-monitor.png`

```
Burn rate on the big screen.

Desk Monitor puts live token burn, balance, and runway on a second display — for when agents are cooking and you need ambient visibility.

https://burnline.dev
```

### Post C — Platform Pulse (no-key wedge)

**Asset:** `03-platform-pulse.png`

```
Platform Pulse — no API key required.

Browse OpenRouter ecosystem throughput and model share before you connect anything.

Then drop in a key when you want personal burn + runway.

https://burnline.dev
```

---

## Week 2–3 rotation (optional)

### Post D — Model spend

**Asset:** `04-explore.png`

```
See which models eat the budget.

Explore filters and spend-by-model views so you catch the expensive path before the invoice does.

OpenRouter today. More providers coming.
```

### Post E — Contrast (vs Tracker framing, without naming them)

```
Credits on a widget are table stakes.

Burnline is the speedometer: live burn, runway-to-zero, and a desk monitor for always-on spend awareness.
```

### Post F — OR Activity companion

```
OpenRouter Activity is for deep analysis at a desk.

Burnline is for the glance between agent runs — balance, burn, runway, lock screen widgets.
```

---

## Community one-liners (Discord / Reddit / replies)

Use when someone asks about OpenRouter spend on mobile:

> Burnline — mobile cockpit for OpenRouter burn + runway. Keys stay on-device. Platform Pulse works with no key. burnline.dev

Pitch (copy-paste):

> Burnline is a mobile cockpit for LLM API spend — live burn, runway, and model breakdowns. Starts with OpenRouter. Free to start; Pro unlocks charts, fleet keys, and extended timeframes.

---

## Cadence (once live)

- 3 posts/week max for launch month
- Rotate: burn anxiety → Desk Monitor → Platform Pulse → model spend
- Reply in OpenRouter Discord / relevant threads; don't cold-spam
- Kill what doesn't get saves/shares; double what does
