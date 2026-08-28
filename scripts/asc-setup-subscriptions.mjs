#!/usr/bin/env node
/**
 * Create subscription localizations + upload review screenshots via ASC API.
 *
 * Usage:
 *   set -a && source asc-api.local && set +a
 *   node scripts/asc-setup-subscriptions.mjs
 */

import { createHash, createPrivateKey, sign } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { basename, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const APP_ID = '6805714980';
const REVIEW_SCREENSHOT = resolve(
  root,
  'store/screenshots/iphone-6.9-1290-overlaid/01-cockpit-balance.png'
);

const SUBSCRIPTION_COPY = {
  monthly: {
    productId: 'limeboard_pro_monthly',
    name: 'LimeBoard Pro Monthly',
  },
  annual: {
    productId: 'limeboard_pro_annual',
    name: 'LimeBoard Pro Annual',
  },
};

/** ASC subscription localization description max length. */
const DESCRIPTION = 'Spend trends, Explore filters, fleet keys, charts.';

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

loadDotEnv(resolve(root, 'asc-api.local'));

function makeJwt() {
  const keyPath = resolve(root, process.env.EXPO_ASC_API_KEY_PATH ?? './credentials/AuthKey_HD38GZM6FC.p8');
  const keyId = process.env.EXPO_ASC_API_KEY_ID ?? 'HD38GZM6FC';
  const issuerId = process.env.EXPO_ASC_API_KEY_ISSUER_ID;
  if (!issuerId) throw new Error('Missing EXPO_ASC_API_KEY_ISSUER_ID in asc-api.local');

  const privateKey = createPrivateKey(readFileSync(keyPath, 'utf8'));
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
const jsonHeaders = {
  Authorization: `Bearer ${jwt}`,
  'Content-Type': 'application/json',
};

async function api(method, path, body) {
  const res = await fetch(`https://api.appstoreconnect.apple.com/v1${path}`, {
    method,
    headers: jsonHeaders,
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    const detail = json.errors?.[0]?.detail ?? text.slice(0, 400);
    throw new Error(`${method} ${path} → ${res.status}: ${detail}`);
  }
  return json;
}

async function ensureLocalization(subscriptionId, name) {
  const existing = await api('GET', `/subscriptions/${subscriptionId}/subscriptionLocalizations`);
  const en = existing.data?.find((l) => l.attributes.locale === 'en-US');
  if (en) {
    console.log(`  localization en-US already exists (${en.id})`);
    return en.id;
  }

  const created = await api('POST', '/subscriptionLocalizations', {
    data: {
      type: 'subscriptionLocalizations',
      attributes: { locale: 'en-US', name, description: DESCRIPTION },
      relationships: {
        subscription: { data: { type: 'subscriptions', id: subscriptionId } },
      },
    },
  });
  console.log(`  created localization ${created.data.id}`);
  return created.data.id;
}

async function ensureAvailability(subscriptionId) {
  try {
    const existing = await api('GET', `/subscriptions/${subscriptionId}/subscriptionAvailability`);
    if (existing.data?.id) {
      console.log(`  availability already set (${existing.data.id})`);
      return existing.data.id;
    }
  } catch {
    // not created yet
  }

  const created = await api('POST', '/subscriptionAvailabilities', {
    data: {
      type: 'subscriptionAvailabilities',
      attributes: { availableInNewTerritories: true },
      relationships: {
        subscription: { data: { type: 'subscriptions', id: subscriptionId } },
        availableTerritories: { data: [{ type: 'territories', id: 'USA' }] },
      },
    },
  });
  console.log(`  created availability (${created.data.id})`);
  return created.data.id;
}

async function uploadReviewScreenshot(subscriptionId, filePath) {
  const file = readFileSync(filePath);
  const fileName = basename(filePath);
  const fileSize = file.length;
  const checksum = createHash('md5').update(file).digest('hex');

  const existing = await api(
    'GET',
    `/subscriptions/${subscriptionId}/appStoreReviewScreenshot`
  ).catch(() => ({ data: null }));

  if (existing.data?.attributes?.assetDeliveryState?.state === 'COMPLETE') {
    console.log(`  review screenshot already uploaded (${existing.data.id})`);
    return existing.data.id;
  }

  if (existing.data?.id) {
    await api('DELETE', `/subscriptionAppStoreReviewScreenshots/${existing.data.id}`).catch(() => {});
  }

  const reservation = await api('POST', '/subscriptionAppStoreReviewScreenshots', {
    data: {
      type: 'subscriptionAppStoreReviewScreenshots',
      attributes: { fileName, fileSize },
      relationships: {
        subscription: { data: { type: 'subscriptions', id: subscriptionId } },
      },
    },
  });

  const screenshotId = reservation.data.id;
  const ops = reservation.data.attributes.uploadOperations ?? [];
  if (!ops.length) throw new Error('No upload operations returned');

  for (const op of ops) {
    const chunk = file.subarray(op.offset ?? 0, (op.offset ?? 0) + (op.length ?? fileSize));
    const headers = {};
    for (const h of op.requestHeaders ?? []) headers[h.name] = h.value;
    const put = await fetch(op.url, { method: op.method ?? 'PUT', headers, body: chunk });
    if (!put.ok) {
      throw new Error(`Upload failed ${put.status}: ${await put.text()}`);
    }
  }

  await api('PATCH', `/subscriptionAppStoreReviewScreenshots/${screenshotId}`, {
    data: {
      type: 'subscriptionAppStoreReviewScreenshots',
      id: screenshotId,
      attributes: {
        sourceFileChecksum: checksum,
        uploaded: true,
      },
    },
  });

  console.log(`  uploaded review screenshot ${screenshotId}`);
  return screenshotId;
}

async function main() {
  if (!existsSync(REVIEW_SCREENSHOT)) {
    throw new Error(`Review screenshot not found: ${REVIEW_SCREENSHOT}`);
  }

  const groups = await api('GET', `/apps/${APP_ID}/subscriptionGroups`);
  const groupId = groups.data[0]?.id;
  if (!groupId) throw new Error('No subscription group found');

  const subs = await api('GET', `/subscriptionGroups/${groupId}/subscriptions`);
  const byProduct = Object.fromEntries(subs.data.map((s) => [s.attributes.productId, s]));

  for (const copy of Object.values(SUBSCRIPTION_COPY)) {
    const sub = byProduct[copy.productId];
    if (!sub) throw new Error(`Subscription not found: ${copy.productId}`);

    console.log(`\n${copy.productId} (${sub.id}) — state: ${sub.attributes.state}`);
    await ensureLocalization(sub.id, copy.name);
    await uploadReviewScreenshot(sub.id, REVIEW_SCREENSHOT);
    await ensureAvailability(sub.id);
  }

  const refreshed = await api('GET', `/subscriptionGroups/${groupId}/subscriptions`);
  console.log('\nFinal states:');
  for (const s of refreshed.data) {
    console.log(`  ${s.attributes.productId}: ${s.attributes.state}`);
  }
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
