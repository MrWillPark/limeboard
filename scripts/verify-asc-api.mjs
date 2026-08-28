#!/usr/bin/env node
/**
 * Verify App Store Connect API credentials.
 *
 * Usage (env vars or .env.apple.local):
 *   node scripts/verify-asc-api.mjs
 *
 * Required:
 *   EXPO_ASC_API_KEY_PATH   path to AuthKey_*.p8
 *   EXPO_ASC_API_KEY_ID     10-char Key ID
 *   EXPO_ASC_API_KEY_ISSUER_ID  UUID Issuer ID from App Store Connect
 */

import { createPrivateKey, sign } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function loadDotEnv(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

loadDotEnv(resolve(root, '.env.apple.local'));

const keyPath = process.env.EXPO_ASC_API_KEY_PATH ?? './credentials/AuthKey_HD38GZM6FC.p8';
const keyId = process.env.EXPO_ASC_API_KEY_ID ?? 'HD38GZM6FC';
const issuerId = process.env.EXPO_ASC_API_KEY_ISSUER_ID;

if (!issuerId) {
  console.error(`
Missing EXPO_ASC_API_KEY_ISSUER_ID.

Find it in App Store Connect → Users and Access → Integrations → App Store Connect API
(top of page, UUID like xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx).

Add to .env.apple.local:
  EXPO_ASC_API_KEY_ISSUER_ID=your-issuer-id
`);
  process.exit(1);
}

const resolvedPath = resolve(root, keyPath);
if (!existsSync(resolvedPath)) {
  console.error(`Key file not found: ${resolvedPath}`);
  process.exit(1);
}

function makeJwt() {
  const privateKey = createPrivateKey(readFileSync(resolvedPath, 'utf8'));
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'ES256', kid: keyId, typ: 'JWT' };
  const payload = { iss: issuerId, iat: now, exp: now + 1200, aud: 'appstoreconnect-v1' };
  const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const signingInput = `${b64(header)}.${b64(payload)}`;
  const signature = sign('sha256', Buffer.from(signingInput), {
    key: privateKey,
    dsaEncoding: 'ieee-p1363',
  });
  return `${signingInput}.${signature.toString('base64url')}`;
}

const jwt = makeJwt();
const res = await fetch('https://api.appstoreconnect.apple.com/v1/apps/6805714980', {
  headers: { Authorization: `Bearer ${jwt}` },
});

if (!res.ok) {
  const body = await res.text();
  console.error(`ASC API error ${res.status}: ${body}`);
  process.exit(1);
}

const data = await res.json();
const attrs = data.data?.attributes ?? {};
console.log('App Store Connect API: OK');
console.log(`App: ${attrs.name ?? '(unknown)'}`);
console.log(`Bundle ID: ${attrs.bundleId ?? '(unknown)'}`);
console.log(`Key ID: ${keyId}`);
console.log(`Issuer ID: ${issuerId}`);
