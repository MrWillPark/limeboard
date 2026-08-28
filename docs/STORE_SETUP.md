# Store products, RevenueCat, legal, TestFlight

## Product IDs (must match everywhere)

| ID | Type |
|----|------|
| `limeboard_pro_monthly` | Auto-renewable subscription |
| `limeboard_pro_annual` | Auto-renewable subscription |
| Entitlement | `pro` |
| Offering | `default` (monthly + annual packages) |
| Bundle ID | `app.limeboard.mobile` |

---

## 1. App Store Connect

1. [Apps](https://appstoreconnect.apple.com/apps) → **+** → New App  
   - Bundle ID: `app.limeboard.mobile`  
   - SKU: `limeboard`  
2. **Subscriptions** → create subscription group **LimeBoard Pro**  
3. Add products:
   - Reference name / Product ID: `limeboard_pro_monthly` (1 month)
   - Reference name / Product ID: `limeboard_pro_annual` (1 year)
4. Set pricing, localization, review screenshot for each
5. App Privacy → Privacy Policy URL: `https://limeboard.app/privacy`  
   (host the in-app copy on that domain, or temporarily use a public GitHub Pages URL)
6. App Information → License Agreement: Apple Standard EULA is fine; also link Terms in app
7. **Apple ID** (App Store Connect app id) is set in `eas.json` → `submit.production.ios.ascAppId` (`6805714980`).

Paid Apps Agreement + banking/tax must be Active under Business.

---

## 2. RevenueCat

1. [app.revenuecat.com](https://app.revenuecat.com) → New project **LimeBoard**
2. Add iOS app → bundle `app.limeboard.mobile`
3. Upload App Store Connect API key (In-App Purchase key) for receipt validation
4. Import / create products with IDs above
5. Entitlement **`pro`** → attach both products
6. Offering **`default`** → add Monthly + Annual packages
7. Copy **Public app-specific API key** (starts with `appl_`) into `.env.local` for local dev **and** into EAS production env for cloud builds (see below).

```
EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_...
EXPO_PUBLIC_DEV_PRO=false
```

Android later: `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_...`

---

## 2b. EAS environment variables (required for TestFlight / App Store builds)

Local `.env.local` is **not** uploaded to EAS. Cloud builds need secrets in the **production** environment:

```bash
eas env:create --environment production --name EXPO_PUBLIC_SUPABASE_URL --value "https://<project>.supabase.co"
eas env:create --environment production --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "<anon-key>"
eas env:create --environment production --name EXPO_PUBLIC_REVENUECAT_IOS_KEY --value "appl_..."
eas env:create --environment production --name EXPO_PUBLIC_DEV_PRO --value "false"
```

Verify:

```bash
eas env:list --environment production
```

Without these, production builds skip the login gate and show “Store billing is not configured.”

`EXPO_PUBLIC_DEV_PRO` only works in `__DEV__` builds — it cannot unlock Pro in App Store binaries.

---

## 3. Dev Pro (UI only, no store)

Until RC keys work in a native build:

```
EXPO_PUBLIC_DEV_PRO=true
```

Restart Metro. Paywall / gates behave as Pro without purchases.

---

## 4. TestFlight

Requires a **native build** (not Expo Go):

```bash
# Development client (Apple Sign In + IAP sandbox)
eas build --profile development --platform ios

# Or production → TestFlight
eas build --profile production --platform ios
eas submit --platform ios --latest
# or: npx testflight
```

Set once:

```bash
export EXPO_APPLE_ID=you@email.com
export EXPO_APPLE_TEAM_ID=UZLYMT5D28
```

Internal TestFlight testers get the build immediately after processing.

### iOS Home Screen widgets

Balance and Desk Monitor widgets use `expo-widgets` + App Group `group.app.limeboard.mobile`.

1. First widget-enabled build: EAS registers the widget extension App ID (`app.limeboard.mobile.widgets`) and App Group entitlement.
2. Rebuild after any `expo-widgets` plugin change in `app.json`.
3. On device: long-press Home Screen → Add Widget → **LimeBoard Balance** or **Desk Monitor**.
4. Widget content updates when Cockpit refreshes OpenRouter data (open the app).

**If the build fails with “provisioning profile doesn't support the … App Group”:**

EAS sometimes creates the widget profile without the App Group linked. Fix:

1. [Apple Developer → Identifiers](https://developer.apple.com/account/resources/identifiers/list) → `app.limeboard.mobile.widgets` → enable **App Groups** → check `group.app.limeboard.mobile`.
2. Delete the stale widget profile: `eas credentials -p ios` → ExpoWidgetsTarget → remove provisioning profile.
3. Re-run `eas build --profile development --platform ios`.

`app.json` declares the extension entitlement under `extra.eas.build.experimental.ios.appExtensions` so EAS knows to include the group on regenerate.

watchOS is out of scope for v1 — see README for App Store complexity notes.

---

## 5. Host Privacy / Terms on HTTPS

App Store Connect needs public URLs. In-app screens live at `/privacy` and `/terms`.

Options:
- Point `limeboard.app/privacy` and `/terms` at static HTML (see `public/legal/`)
- Or deploy Expo web: `npx expo export -p web` + EAS Hosting

Until the domain is live, use any HTTPS host that serves the same text (GitHub Pages is fine for review).
