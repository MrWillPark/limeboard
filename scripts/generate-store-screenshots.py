#!/usr/bin/env python3
"""Generate framed App Store screenshots — captions above device, full UI inside frame.

Burnline design system: ultra-dark cockpit, electric lime wordmark, DM Sans + JetBrains Mono.
Brand must always be BURNLINE (never LIMEBOARD).

Device captures are pasted intact (status bar, Dynamic Island room, nav titles).
No chrome stripping, no synthetic status bar.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
SRC_PHONE = ROOT / "store/screenshots/iphone-6.9-1290"
SRC_DESK = ROOT / "store/screenshots/desk-monitor/01-desk-monitor.png"
OUT_1290 = ROOT / "store/screenshots/iphone-6.9-1290-overlaid"
OUT_1320 = ROOT / "store/screenshots/iphone-6.9-overlaid"
OUT_SCRIM = ROOT / "store/screenshots/iphone-6.9-overlaid-wordmark-scrim"
OUT_DESK = ROOT / "store/screenshots/desk-monitor-overlaid"

FONT_WORDMARK = ROOT / "node_modules/@expo-google-fonts/jetbrains-mono/700Bold/JetBrainsMono_700Bold.ttf"
FONT_HEAD = ROOT / "node_modules/@expo-google-fonts/dm-sans/700Bold/DMSans_700Bold.ttf"
FONT_SUB = ROOT / "node_modules/@expo-google-fonts/dm-sans/400Regular/DMSans_400Regular.ttf"

BRAND = "BURNLINE"
assert BRAND == "BURNLINE"

# Canvas
CANVAS_W, CANVAS_H = 1290, 2796
BG = (8, 10, 9)
APP_BG = (11, 14, 13)

# Caption — marketing-scale type outside the device
CAPTION_ZONE_H = 820
GAP = 10
BOTTOM_MARGIN = 24
DEVICE_ZONE_TOP = CAPTION_ZONE_H + GAP
DEVICE_ZONE_H = CANVAS_H - DEVICE_ZONE_TOP - BOTTOM_MARGIN

CAPTION_X = 48
WORDMARK_Y = 36
WORDMARK_SIZE = 58
RULE_Y = 104
HEADLINE_Y = 128
HEADLINE_SIZE = 118
HEADLINE_LH = 126
SUB_GAP = 20
SUB_SIZE = 58
SUB_LH = 66

LIME = (57, 255, 20)
TEXT = (242, 247, 244)
SUB_COLOR = (168, 186, 176)
BORDER = (58, 78, 68)
BEZEL_FILL = (18, 22, 20)
BEZEL_HIGHLIGHT = (42, 54, 48)

# Phone frame (overridden in main to fit device zone)
PHONE_OUTER_W = 1040
PHONE_OUTER_H = int(PHONE_OUTER_W * 2796 / 1290)
PHONE_BEZEL = 18
PHONE_R_OUTER = 88
PHONE_R_INNER = 72

# Desk frame
DESK_OUTER_W = 1160
DESK_OUTER_H = int(DESK_OUTER_W * 1290 / 2796)
DESK_BEZEL = 18
DESK_R_OUTER = 32
DESK_R_INNER = 18

SHOTS = [
    (
        "01-cockpit-balance.png",
        "Know your burn before credits hit zero",
        "Balance, runway, and spend in one cockpit",
        "phone",
    ),
    (
        "02-cockpit-spend-models.png",
        "See what ate the budget",
        "Spend trend, token volume, and top models",
        "phone",
    ),
    (
        "03-platform-pulse.png",
        "Fleet burn + live platform pulse",
        "Key fleet rates — Pulse needs no API key",
        "phone",
    ),
    (
        "04-explore.png",
        "Explore spend by model",
        "30-day charts, filters, and share breakdown",
        "phone",
    ),
    (
        "05-keys.png",
        "Every key. Every dollar.",
        "Connected session, fleet totals, provisioned keys",
        "phone",
    ),
    (
        "06-desk-monitor.png",
        "Burn rate on the big screen",
        "Landscape Desk Monitor — live burn, balance, runway",
        "desk",
    ),
]


def font(path: Path, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(path), size=size)


def rounded_mask(size: tuple[int, int], radius: int) -> Image.Image:
    mask = Image.new("L", size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((0, 0, size[0] - 1, size[1] - 1), radius=radius, fill=255)
    return mask


def soft_shadow(
    width: int,
    height: int,
    radius: int,
    blur: int = 48,
    opacity: int = 110,
    offset_y: int = 24,
) -> tuple[Image.Image, tuple[int, int]]:
    pad = blur * 2 + abs(offset_y)
    layer = Image.new("RGBA", (width + pad * 2, height + pad * 2), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    draw.rounded_rectangle(
        (pad, pad + offset_y, pad + width - 1, pad + height - 1 + offset_y),
        radius=radius,
        fill=(0, 0, 0, opacity),
    )
    layer = layer.filter(ImageFilter.GaussianBlur(blur))
    return layer, (-pad, -pad)


def atmosphere(canvas: Image.Image) -> None:
    w, h = canvas.size
    grad = Image.new("RGB", (1, h))
    gp = grad.load()
    for y in range(h):
        t = y / max(h - 1, 1)
        if t < 0.22:
            u = t / 0.22
            r = int(11 + 2 * u)
            g = int(14 + 2 * u)
            b = int(13 + 1 * u)
        else:
            u = (t - 0.22) / 0.78
            r = int(13 - 6 * u)
            g = int(16 - 8 * u)
            b = int(14 - 7 * u)
        gp[0, y] = (max(0, r), max(0, g), max(0, b))
    canvas.paste(grad.resize((w, h), Image.Resampling.BILINEAR))

    vignette = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    cx, cy = w // 2, DEVICE_ZONE_TOP + DEVICE_ZONE_H // 2
    rx, ry = 520, 920
    px = vignette.load()
    for y in range(max(0, cy - ry), min(h, cy + ry)):
        for x in range(max(0, cx - rx), min(w, cx + rx)):
            nx = (x - cx) / rx
            ny = (y - cy) / ry
            d = nx * nx + ny * ny
            if d < 1.0:
                a = int(40 * (1.0 - d) ** 1.6)
                px[x, y] = (14, 20, 17, a)
    canvas.alpha_composite(vignette)


def wrap_text(text: str, font_obj: ImageFont.ImageFont, max_width: int) -> list[str]:
    words = text.split()
    if not words:
        return [""]
    lines: list[str] = []
    current = words[0]
    for word in words[1:]:
        trial = f"{current} {word}"
        if font_obj.getlength(trial) <= max_width:
            current = trial
        else:
            lines.append(current)
            current = word
    lines.append(current)
    return lines


def draw_caption(draw: ImageDraw.ImageDraw, headline: str, sub: str) -> int:
    wordmark = font(FONT_WORDMARK, WORDMARK_SIZE)
    head = font(FONT_HEAD, HEADLINE_SIZE)
    sub_f = font(FONT_SUB, SUB_SIZE)
    max_w = CANVAS_W - 2 * CAPTION_X

    x = CAPTION_X
    for ch in BRAND:
        draw.text((x, WORDMARK_Y), ch, font=wordmark, fill=LIME)
        x += wordmark.getlength(ch) + 4.0

    draw.rectangle((CAPTION_X, RULE_Y, CAPTION_X + 72, RULE_Y + 4), fill=(*LIME, 180))

    y = HEADLINE_Y
    for line in wrap_text(headline, head, max_w):
        draw.text((CAPTION_X, y), line, font=head, fill=TEXT)
        y += HEADLINE_LH

    y += SUB_GAP
    for line in wrap_text(sub, sub_f, max_w):
        draw.text((CAPTION_X, y), line, font=sub_f, fill=SUB_COLOR)
        y += SUB_LH

    assert y <= CAPTION_ZONE_H - 12, f"Caption overflow into device zone: {y} > {CAPTION_ZONE_H - 12}"
    return y


def fit_exact(img: Image.Image, box_w: int, box_h: int) -> Image.Image:
    """Resize full capture to fill the screen — no crop, no chrome rewrite."""
    return img.resize((box_w, box_h), Image.Resampling.LANCZOS)


def fit_cover(img: Image.Image, box_w: int, box_h: int) -> Image.Image:
    """Scale to cover box, center-crop (desk / landscape when aspect differs)."""
    scale = max(box_w / img.width, box_h / img.height)
    nw, nh = int(img.width * scale), int(img.height * scale)
    resized = img.resize((nw, nh), Image.Resampling.LANCZOS)
    left = (nw - box_w) // 2
    top = (nh - box_h) // 2
    return resized.crop((left, top, left + box_w, top + box_h))


def paste_device(
    canvas: Image.Image,
    ui: Image.Image,
    *,
    outer_w: int,
    outer_h: int,
    bezel: int,
    r_outer: int,
    r_inner: int,
    origin: tuple[int, int],
    phone: bool,
) -> None:
    ox, oy = origin
    screen_w = outer_w - 2 * bezel
    screen_h = outer_h - 2 * bezel

    # Full screenshot as-is inside the glass — status bar, titles, home indicator stay.
    if phone:
        screen_rgb = fit_exact(ui, screen_w, screen_h)
    else:
        # Desk sources already match landscape aspect; prefer exact when close.
        src_aspect = ui.width / ui.height
        box_aspect = screen_w / screen_h
        if abs(src_aspect - box_aspect) < 0.02:
            screen_rgb = fit_exact(ui, screen_w, screen_h)
        else:
            screen_rgb = fit_cover(ui, screen_w, screen_h)

    shadow, soff = soft_shadow(outer_w, outer_h, r_outer, blur=52, opacity=120, offset_y=28)
    canvas.alpha_composite(shadow, (ox + soff[0], oy + soff[1]))
    shadow2, soff2 = soft_shadow(outer_w, outer_h, r_outer, blur=14, opacity=70, offset_y=6)
    canvas.alpha_composite(shadow2, (ox + soff2[0], oy + soff2[1]))

    bezel_layer = Image.new("RGBA", (outer_w, outer_h), (0, 0, 0, 0))
    bd = ImageDraw.Draw(bezel_layer)
    bd.rounded_rectangle((0, 0, outer_w - 1, outer_h - 1), radius=r_outer, fill=(*BEZEL_FILL, 255))
    bd.rounded_rectangle(
        (0, 0, outer_w - 1, outer_h - 1),
        radius=r_outer,
        outline=(*BORDER, 255),
        width=2,
    )
    bd.arc(
        (3, 3, outer_w - 4, min(outer_h - 4, r_outer * 2 + 8)),
        start=200,
        end=340,
        fill=(*BEZEL_HIGHLIGHT, 180),
        width=2,
    )
    bd.rounded_rectangle(
        (bezel - 2, bezel - 2, outer_w - bezel + 1, outer_h - bezel + 1),
        radius=r_inner + 2,
        outline=(10, 12, 11, 255),
        width=2,
    )
    canvas.alpha_composite(bezel_layer, (ox, oy))

    screen = screen_rgb.convert("RGBA")
    screen.putalpha(rounded_mask((screen_w, screen_h), r_inner))
    canvas.alpha_composite(screen, (ox + bezel, oy + bezel))


def compose(headline: str, sub: str, ui: Image.Image, kind: str) -> Image.Image:
    canvas = Image.new("RGBA", (CANVAS_W, CANVAS_H), (*BG, 255))
    atmosphere(canvas)
    draw = ImageDraw.Draw(canvas, "RGBA")
    draw_caption(draw, headline, sub)

    if kind == "phone":
        assert ui.size == (1290, 2796), ui.size
        ox = (CANVAS_W - PHONE_OUTER_W) // 2
        oy = DEVICE_ZONE_TOP + max(0, (DEVICE_ZONE_H - PHONE_OUTER_H) // 2)
        if PHONE_OUTER_H > DEVICE_ZONE_H:
            oy = DEVICE_ZONE_TOP
        paste_device(
            canvas,
            ui,
            outer_w=PHONE_OUTER_W,
            outer_h=min(PHONE_OUTER_H, DEVICE_ZONE_H),
            bezel=PHONE_BEZEL,
            r_outer=PHONE_R_OUTER,
            r_inner=PHONE_R_INNER,
            origin=(ox, oy),
            phone=True,
        )
    else:
        ox = (CANVAS_W - DESK_OUTER_W) // 2
        oy = DEVICE_ZONE_TOP + (DEVICE_ZONE_H - DESK_OUTER_H) // 2
        paste_device(
            canvas,
            ui,
            outer_w=DESK_OUTER_W,
            outer_h=DESK_OUTER_H,
            bezel=DESK_BEZEL,
            r_outer=DESK_R_OUTER,
            r_inner=DESK_R_INNER,
            origin=(ox, oy),
            phone=False,
        )

    out = canvas.convert("RGB")
    assert out.size == (CANVAS_W, CANVAS_H)
    return out


def compose_desk_landscape(headline: str, sub: str, ui: Image.Image) -> Image.Image:
    W, H = 2796, 1290
    canvas = Image.new("RGBA", (W, H), (*BG, 255))
    grad = Image.new("RGB", (1, H))
    gp = grad.load()
    for y in range(H):
        t = y / max(H - 1, 1)
        gp[0, y] = (int(10 - 3 * t), int(13 - 4 * t), int(12 - 4 * t))
    canvas.paste(grad.resize((W, H), Image.Resampling.BILINEAR))

    draw = ImageDraw.Draw(canvas, "RGBA")
    wordmark = font(FONT_WORDMARK, 52)
    head = font(FONT_HEAD, 86)
    sub_f = font(FONT_SUB, 42)
    cx = 72
    x = cx
    for ch in BRAND:
        draw.text((x, 120), ch, font=wordmark, fill=LIME)
        x += wordmark.getlength(ch) + 3.5
    draw.rectangle((cx, 186, cx + 72, 190), fill=(*LIME, 180))
    y = 220
    max_w = 980
    for line in wrap_text(headline, head, max_w):
        draw.text((cx, y), line, font=head, fill=TEXT)
        y += 94
    y += 16
    for line in wrap_text(sub, sub_f, max_w):
        draw.text((cx, y), line, font=sub_f, fill=SUB_COLOR)
        y += 50

    outer_w = 1480
    outer_h = int(outer_w * ui.height / ui.width)
    bezel = 18
    ox = W - outer_w - 72
    oy = (H - outer_h) // 2
    paste_device(
        canvas,
        ui,
        outer_w=outer_w,
        outer_h=outer_h,
        bezel=bezel,
        r_outer=28,
        r_inner=16,
        origin=(ox, oy),
        phone=False,
    )
    return canvas.convert("RGB")


def main() -> None:
    OUT_1290.mkdir(parents=True, exist_ok=True)
    OUT_1320.mkdir(parents=True, exist_ok=True)
    OUT_SCRIM.mkdir(parents=True, exist_ok=True)
    OUT_DESK.mkdir(parents=True, exist_ok=True)

    for stale in ("02-cockpit-burn-trend.png", "05-desk-monitor.png"):
        for folder in (OUT_1290, OUT_1320, OUT_SCRIM):
            p = folder / stale
            if p.exists():
                p.unlink()

    global PHONE_OUTER_W, PHONE_OUTER_H
    aspect = 2796 / 1290
    PHONE_OUTER_H = DEVICE_ZONE_H
    PHONE_OUTER_W = int(PHONE_OUTER_H / aspect)
    PHONE_OUTER_W = min(PHONE_OUTER_W, CANVAS_W - 80)
    PHONE_OUTER_H = int(PHONE_OUTER_W * aspect)
    print(f"phone frame {PHONE_OUTER_W}x{PHONE_OUTER_H} · caption zone {CAPTION_ZONE_H}px")

    desk_ui = Image.open(SRC_DESK).convert("RGB")

    for name, headline, sub, kind in SHOTS:
        if kind == "phone":
            ui = Image.open(SRC_PHONE / name).convert("RGB")
        else:
            ui = desk_ui

        framed = compose(headline, sub, ui, kind)
        out_path = OUT_1290 / name
        framed.save(out_path, "PNG", optimize=True)
        print(f"wrote {out_path.relative_to(ROOT)}")

        if kind == "phone":
            scaled = framed.resize((1320, 2868), Image.Resampling.LANCZOS)
            scaled.save(OUT_1320 / name, "PNG", optimize=True)
            scaled.save(OUT_SCRIM / name, "PNG", optimize=True)
        else:
            landscape = compose_desk_landscape(headline, sub, ui)
            landscape.save(OUT_DESK / "01-desk-monitor.png", "PNG", optimize=True)
            print(f"wrote {OUT_DESK.relative_to(ROOT)}/01-desk-monitor.png")

    print("done")


if __name__ == "__main__":
    main()
