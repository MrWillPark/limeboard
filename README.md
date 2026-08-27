# LimeBoard

Mobile OpenRouter usage analytics — electric lime on an ultra-dark developer cockpit.

Track credit balance, daily burn, runway-to-zero, model spend breakdown, and (with a Management API key) your provisioned key fleet. Keys live in the device keychain; V1 talks to OpenRouter directly with no LimeBoard backend.

## Stack

- Expo SDK 57 + Expo Router (iOS / Android / web)
- SecureStore for API keys
- TanStack Query for OpenRouter fetches
- DM Sans + JetBrains Mono, palette centered on `#39FF14`

## OpenRouter endpoints used

| Endpoint | Purpose |
| --- | --- |
| `GET /api/v1/key` | Current key usage + limits |
| `GET /api/v1/credits` | Account credits vs lifetime usage |
| `GET /api/v1/activity` | ~30d spend by model (management key) |
| `GET /api/v1/keys` | Provisioned key fleet (management key) |

Create a **Management API key** in the [OpenRouter dashboard](https://openrouter.ai/settings/management-keys) for full analytics.

## Run

```bash
npm install
npx expo start
```

Then open in Expo Go (iOS/Android) or press `i` / `a` / `w`.

## MVP screens

1. **Cockpit** — balance, burn sparkline, runway estimate  
2. **Explore** — metric / group-by / rollup charts (Activity explorer-style)  
3. **Keys** — session + fleet breakdown  
4. **Settings** — connect / replace / disconnect key  

## Roadmap

- Velocity anomaly alerts  
- Model cost arbitrage suggestions  
- Live Activities (burn spike / runway alerts)  
- Stretch: startup infrastructure burn tracker  
- Stretch: watchOS companion (separate native target; see notes below)

## iOS Home Screen widgets

LimeBoard ships two iOS widgets via [`expo-widgets`](https://docs.expo.dev/versions/v57.0.0/sdk/widgets/) (SDK 57):

| Widget | What it shows |
| --- | --- |
| **Balance** | Account balance, period spend, avg/day, runway |
| **Desk Monitor** | Live token burn or spend velocity, peak/avg, 30m history strip |

- Requires a **development or production native build** (not Expo Go).
- Config lives in `app.json` under the `expo-widgets` plugin (App Group `group.app.limeboard.mobile`, extension `app.limeboard.mobile.widgets`).
- Widget UI: `widgets/BalanceWidget.tsx`, `widgets/DeskMonitorWidget.tsx`. Cockpit pushes snapshots via `lib/widgets/sync-*.ts`.
- **Desk Monitor** supports `systemExtraLarge` for iPad desk setups and Mac desktop widgets.
- After changing the plugin config, rebuild the iOS binary (`eas build` / prebuild).

### Desk Monitor (in-app)

Settings → **Open Desk Monitor** launches a fullscreen landscape view for a second monitor (web or tablet). It shows a large speedometer-style burn gauge plus balance, spend, and runway on the side.

- **Orientation:** locked to landscape on native; rotate your device or widen the browser window on web.
- **Refresh rate:** burn data polls every **20 seconds** while the screen is open (`BURN_RATE_POLL_MS` in `hooks/use-burn-rate.ts`). Management keys use OpenRouter Analytics minute buckets (often 1–3 min behind); session keys poll `/key` usage deltas.

### watchOS — complexity note

An Apple Watch app or watchOS widget is **not** included in `expo-widgets`. It needs a separate watchOS target (typically SwiftUI via `@bacons/apple-targets` or a custom config plugin), App Groups for shared data, and EAS multi-target credentials.

**App Store submission impact is modest, not a second app review:**

| Concern | iOS widget (`expo-widgets`) | watchOS app / widget |
| --- | --- | --- |
| Bundle / review | Same LimeBoard listing; extension embeds in the iPhone IPA | Same listing; Watch app embeds in the iPhone IPA |
| Extra App Store product | No | No (companion Watch app, not a separate SKU) |
| Signing / EAS | Extra App ID + App Group; plugin declares `appExtensions` | Extra Watch App ID(s) + App Group; more credentials on first build |
| Implementation | TypeScript + Expo UI | Mostly native SwiftUI (Expo does not run RN on watchOS) |
| Screenshots / metadata | Optional widget gallery shots | Watch screenshots if you promote Watch features |
| Review risk | Low — extension of existing app | Slightly higher surface (Watch UX, privacy, entitlements) but still one submission |

**Bottom line:** iOS home-screen widgets add a little signing/build complexity and are well-supported in Expo SDK 57. watchOS is a **larger product/engineering cost** (native UI + sync design) but **not a dramatically heavier App Store process** — still one IPA, one listing, one review. Skip watchOS until the iPhone widget proves useful.
