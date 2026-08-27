# App Store Connect screenshot upload

## iPhone (required)

Upload to **App Store Connect → your version → Previews and Screenshots → iPhone → 6.9" Display**.

Do **not** upload into the **6.5" Display** slot — that rejects 1320×2868 and 1290×2796 files.

### Use these files (recommended)

**With marketing overlays:** `iphone-6.9-1290-overlaid/`

| File | Size |
|------|------|
| `01-cockpit-balance.png` | **1290 × 2796** |
| `02-cockpit-burn-trend.png` | **1290 × 2796** |
| `03-platform-pulse.png` | **1290 × 2796** |
| `04-explore.png` | **1290 × 2796** |

Plain (no text): `iphone-6.9-1290/`

Alternate sizes (also valid for 6.9"):
- `iphone-6.9-overlaid/` — 1320 × 2868
- `iphone-6.9-overlaid-wordmark-scrim/` — 1320 × 2868 + wordmark plate

## iPad (required — app supports tablet)

LimeBoard has `supportsTablet: true`. You also need **13" Display** iPad screenshots:

- **2064 × 2752** or **2048 × 2732** (portrait)

Capture on iPad simulator or device, or ASC may accept scaled iPhone shots only for iPhone slots — iPad is a separate upload section.

## If you still see "dimensions are incorrect"

1. Confirm the slot says **6.9" Display**, not 6.5".
2. Use `iphone-6.9-1290-overlaid/` (exact native pixels).
3. Ensure files are `.png` or `.jpg` with **no transparency**.
4. Don't upload via Preview "Export" resize — use these files as-is.
