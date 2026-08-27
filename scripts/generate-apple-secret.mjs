#!/usr/bin/env node
/**
 * Generate Apple OAuth client secret (JWT) for Supabase Apple provider.
 *
 * Usage:
 *   APPLE_TEAM_ID=AB12CD34EF \
 *   APPLE_KEY_ID=XXXXXXXXXX \
 *   APPLE_SERVICES_ID=app.limeboard.mobile.auth \
 *   node scripts/generate-apple-secret.mjs /path/to/AuthKey_XXXXXXXXXX.p8
 *
 * Paste the printed JWT into Supabase → Auth → Apple → Secret Key (for OAuth).
 * Apple requires rotating this every ~6 months.
 */

import { createPrivateKey, sign } from 'node:crypto';
import { readFileSync } from 'node:fs';

const teamId = process.env.APPLE_TEAM_ID;
const keyId = process.env.APPLE_KEY_ID;
const clientId = process.env.APPLE_SERVICES_ID ?? 'app.limeboard.mobile.auth';
const keyPath = process.argv[2];

if (!teamId || !keyId || !keyPath) {
  console.error(`
Generate Apple client secret JWT for Supabase.

Required env vars:
  APPLE_TEAM_ID       10-char Team ID (Membership details)
  APPLE_KEY_ID        10-char Key ID from Apple Developer → Keys
  APPLE_SERVICES_ID   Services ID (default: app.limeboard.mobile.auth)

Usage:
  APPLE_TEAM_ID=... APPLE_KEY_ID=... node scripts/generate-apple-secret.mjs ./AuthKey_XXX.p8
`);
  process.exit(1);
}

const privateKeyPem = readFileSync(keyPath, 'utf8');
const now = Math.floor(Date.now() / 1000);
const exp = now + 86400 * 180; // max 6 months

const header = { alg: 'ES256', kid: keyId };
const payload = {
  iss: teamId,
  iat: now,
  exp,
  aud: 'https://appleid.apple.com',
  sub: clientId,
};

function b64url(value) {
  return Buffer.from(value).toString('base64url');
}

const encodedHeader = b64url(JSON.stringify(header));
const encodedPayload = b64url(JSON.stringify(payload));
const signingInput = `${encodedHeader}.${encodedPayload}`;

const key = createPrivateKey(privateKeyPem);
const signature = sign('sha256', Buffer.from(signingInput), {
  key,
  dsaEncoding: 'ieee-p1363',
});

const jwt = `${signingInput}.${signature.toString('base64url')}`;
console.log(jwt);
