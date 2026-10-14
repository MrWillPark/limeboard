# Burnline

Mobile LLM API spend cockpit — live burn, runway, and model breakdown on an ultra-dark developer UI.

Track credit balance, burn velocity, runway-to-zero, and model spend. Starts with OpenRouter; more providers coming. Session keys live in the device keychain. Pro users may opt in to an encrypted monitor key for remote burn-spike push when the app is closed.

## Stack

- Expo SDK 57 + Expo Router (iOS / Android / web)
- SecureStore for API keys
- TanStack Query for provider API fetches
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

## Site

Marketing and legal pages live in `docs/` and deploy to [burnline.dev](https://burnline.dev) via GitHub Pages.

## Widgets

Burnline ships two iOS widgets via [`expo-widgets`](https://docs.expo.dev/versions/v57.0.0/sdk/widgets/) (SDK 57):

- **Balance** — credits, spend, runway
- **Desk Monitor** — live token burn for a second screen

Config lives in `app.json` under the `expo-widgets` plugin (App Group `group.app.limeboard.mobile`, extension `app.limeboard.mobile.widgets`).

Settings → **Open Desk Monitor** launches a fullscreen landscape view for a second monitor (web or tablet). It shows a large speedometer-style burn gauge plus balance, spend, and runway on the side.

## Burn spike alerts

- **Local (free):** in-cockpit banner + OS notifications while the app is open/backgrounded
- **Remote (Pro):** Settings → Burn spike alerts → dedicated monitor key; GitHub Actions cron invokes `monitor-burn-spikes` every 5 minutes

## Roadmap

- Model cost arbitrage suggestions
- Live Activities
- Additional LLM providers (Anthropic, OpenAI, …) via official APIs
- Stretch: infrastructure burn tracker, watchOS companion
