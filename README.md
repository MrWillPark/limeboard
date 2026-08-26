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
- Home Screen widgets / Live Activities  
- Stretch: startup infrastructure burn tracker  
