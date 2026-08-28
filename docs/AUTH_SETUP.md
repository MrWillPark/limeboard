# Auth setup (Supabase)

## Redirect URLs

Supabase → Authentication → URL configuration:

- **Site URL:** `limeboard://`
- **Redirect URLs:**
  - `limeboard://auth/callback`
  - `limeboard://**`
  - Expo Go tunnel URI (dev only)

Password reset emails use the same `limeboard://auth/callback` redirect.

## Apple Sign In (native iOS)

1. Supabase → Auth → Providers → **Apple** → Enable
2. **Client IDs** (comma-separated — Services ID **first**):
   ```
   app.limeboard.mobile.auth, app.limeboard.mobile
   ```
3. **Secret Key** — JWT from Sign in with Apple key (not App Store Connect API key):
   ```bash
   APPLE_TEAM_ID=UZLYMT5D28 APPLE_KEY_ID=22P645F247 \
     node scripts/generate-apple-secret.mjs credentials/AuthKey_22P645F247.p8
   ```
4. Paste JWT into Supabase Apple provider → Secret Key (rotate every ~6 months)

Native `signInWithIdToken` requires the **bundle ID** in Client IDs. Without it, Apple sign-in fails with an audience error.

**User tip:** Choose **Share My Email** on the Apple sheet. Hide My Email creates a separate LimeBoard account.

## Google

Google Cloud OAuth client → redirect: `https://<project-ref>.supabase.co/auth/v1/callback`

## Email / password

- Sign-up creates an email identity with password
- Accounts that only used Google have **no password** — use Google or **Forgot password** to set one
- Reset flow: sign-in → Forgot password → email link → in-app **Choose a new password**

## OpenRouter keys

API keys are stored **per LimeBoard user** on the device. Switching accounts does not leak keys between users. A legacy device-global key migrates to the first account that signs in after updating.

## Owner admin unlock

`will@safetytat.co` is configured as an owner account in `lib/auth/admin-account.ts` — Pro and management features unlock without a store subscription.
