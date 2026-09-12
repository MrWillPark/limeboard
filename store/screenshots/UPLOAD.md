# App Store Connect screenshot upload

## iPhone (required)

Upload to **App Store Connect → your version → Previews and Screenshots → iPhone → 6.9" Display**.

Do **not** upload into the **6.5" Display** slot — that rejects 1320×2868 and 1290×2796 files.

### Use these files (recommended)

**Framed marketing set (BURNLINE):** `iphone-6.9-1290-overlaid/`

Captions sit in a top band above a device frame — UI is never covered. Phone frames reserve a status-bar / Dynamic Island safe area so app chrome never collides with the cutout.

| File | Size | Shot |
|------|------|------|
| `01-cockpit-balance.png` | **1290 × 2796** | Burn + runway hero |
| `02-cockpit-spend-models.png` | **1290 × 2796** | Spend trend / models (scrolled) |
| `03-platform-pulse.png` | **1290 × 2796** | Key fleet + Platform Pulse |
| `04-explore.png` | **1290 × 2796** | Model spend explore |
| `05-keys.png` | **1290 × 2796** | Keys / fleet totals |
| `06-desk-monitor.png` | **1290 × 2796** | Desk Monitor (framed landscape) |

Plain UI sources (no frame): `iphone-6.9-1290/`

Alternate sizes:
- `iphone-6.9-overlaid/` — 1320 × 2868 (scaled from framed set)
- `iphone-6.9-overlaid-wordmark-scrim/` — same as above (kept for legacy paths)
- `desk-monitor-overlaid/` — landscape social asset (caption left, device right)

## Regenerate

```bash
.venv-img/bin/python scripts/generate-store-screenshots.py
```

Requires Pillow in `.venv-img` and Expo Google fonts under `node_modules/@expo-google-fonts/`.

Design rules (locked):
- Brand wordmark **BURNLINE** only (never LIMEBOARD)
- Caption zone above device — no scrim over UI
- Ultra-dark canvas `#080A09`, lime `#39FF14`, DM Sans + JetBrains Mono
- Full native captures inside the device frame (status bar, screen titles, home indicator intact — no chrome stripping)

## iPad (required — app supports tablet)

Burnline has `supportsTablet: true`. You also need **13" Display** iPad screenshots:

- **2064 × 2752** or **2048 × 2732** (portrait)

## If you still see "dimensions are incorrect"

1. Confirm the slot says **6.9" Display**, not 6.5".
2. Use `iphone-6.9-1290-overlaid/` (exact native pixels).
3. Ensure files are `.png` or `.jpg` with **no transparency**.
4. Don't upload via Preview "Export" resize — use these files as-is.

## ASC version note

Upload into **1.0.1** (or the current prepare-for-submission version). Live 1.0 listing fields were locked.
