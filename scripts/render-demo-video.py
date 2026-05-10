#!/usr/bin/env python3
"""Render a short RepoBelt launch demo video.

Output: docs/assets/repobelt-demo.mp4

The video is intentionally deterministic and uses only synthetic findings. It does
not include real tokens, secrets, or repository content.
"""

from __future__ import annotations

import math
import shutil
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "assets" / "repobelt-demo.mp4"
WIDTH = 1280
HEIGHT = 720
FPS = 24
DURATION = 7.0
FRAMES = int(FPS * DURATION)

BG = (7, 17, 31)
CARD = (15, 23, 42)
HEADER = (8, 13, 26)
BORDER = (51, 65, 85)
TEXT = (229, 231, 235)
MUTED = (148, 163, 184)
GREEN = (52, 211, 153)
RED = (251, 113, 133)
YELLOW = (251, 191, 36)
CYAN = (56, 189, 248)
PURPLE = (192, 132, 252)


def load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    candidates = [
        "/System/Library/Fonts/Menlo.ttc",
        "/System/Library/Fonts/SFNSMono.ttf",
        "/Library/Fonts/Arial Unicode.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf",
    ]
    for path in candidates:
        if Path(path).exists():
            try:
                return ImageFont.truetype(path, size=size, index=1 if bold and path.endswith(".ttc") else 0)
            except Exception:
                continue
    return ImageFont.load_default()


FONT = load_font(23)
FONT_SMALL = load_font(19)
FONT_TITLE = load_font(28, bold=True)
FONT_BIG = load_font(34, bold=True)


def rounded_rect(draw: ImageDraw.ImageDraw, xy, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)


def type_text(full: str, t: float, start: float, duration: float) -> str:
    if t < start:
        return ""
    if t >= start + duration:
        return full
    count = int(len(full) * ((t - start) / duration))
    return full[: max(0, min(len(full), count))]


def fade_alpha(t: float, start: float, duration: float = 0.35) -> int:
    if t < start:
        return 0
    if t >= start + duration:
        return 255
    return int(255 * ((t - start) / duration))


def draw_text_fade(draw: ImageDraw.ImageDraw, xy, text, fill, font, alpha):
    if alpha <= 0 or not text:
        return
    color = (*fill[:3], alpha)
    draw.text(xy, text, font=font, fill=color)


def draw_badge(draw: ImageDraw.ImageDraw, x: int, y: int, text: str, fill, outline, alpha: int):
    if alpha <= 0:
        return
    overlay_color = (*fill[:3], alpha)
    outline_color = (*outline[:3], alpha)
    rounded_rect(draw, (x, y, x + 108, y + 40), 10, overlay_color, outline_color, 2)
    draw.text((x + 23, y + 9), text, font=FONT_SMALL, fill=(*outline[:3], alpha))


def draw_frame(i: int) -> Image.Image:
    t = i / FPS
    img = Image.new("RGBA", (WIDTH, HEIGHT), (*BG, 255))
    draw = ImageDraw.Draw(img, "RGBA")

    # Soft moving background glows.
    for idx, (cx, cy, color) in enumerate([
        (1040, 110, (37, 99, 235)),
        (160, 610, (34, 197, 94)),
        (1140, 640, (168, 85, 247)),
    ]):
        pulse = 0.5 + 0.5 * math.sin(t * 1.4 + idx)
        r = int(190 + 20 * pulse)
        alpha = int(18 + 10 * pulse)
        draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(*color, alpha))

    # Terminal card.
    shadow_offset = 18
    rounded_rect(draw, (68 + shadow_offset, 62 + shadow_offset, 1212 + shadow_offset, 654 + shadow_offset), 24, (0, 0, 0, 55))
    rounded_rect(draw, (68, 62, 1212, 654), 24, (*CARD, 255), (*BORDER, 255), 2)
    rounded_rect(draw, (68, 62, 1212, 128), 24, (*HEADER, 255), None)

    for x, color in [(110, RED), (142, YELLOW), (174, GREEN)]:
        draw.ellipse((x - 8, 94 - 8, x + 8, 94 + 8), fill=(*color, 255))
    draw.text((WIDTH // 2 - 190, 82), "RepoBelt — AI PR safety check", font=FONT_SMALL, fill=(*MUTED, 255))

    cmd = "npx repobelt check --base HEAD --head worktree --format markdown"
    typed = type_text(cmd, t, 0.35, 1.25)
    draw.text((105, 178), "$", font=FONT, fill=(*GREEN, 255))
    draw.text((138, 178), typed, font=FONT, fill=(*TEXT, 255))
    if t < 1.65 and int(t * 3) % 2 == 0:
        cursor_x = 138 + int(draw.textlength(typed, font=FONT)) + 4
        draw.rectangle((cursor_x, 180, cursor_x + 10, 205), fill=(*TEXT, 210))

    alpha_report = fade_alpha(t, 1.75)
    draw_text_fade(draw, (105, 250), "# RepoBelt Report", CYAN, FONT_TITLE, alpha_report)
    draw_text_fade(draw, (105, 303), "Status:", TEXT, FONT, alpha_report)
    draw_badge(draw, 205, 293, "FAIL", (127, 29, 29), RED, alpha_report)
    draw_text_fade(draw, (105, 360), "Changed files: 3", MUTED, FONT_SMALL, alpha_report)

    alpha_blocked = fade_alpha(t, 2.45)
    draw_text_fade(draw, (105, 428), "Blocked files", RED, FONT, alpha_blocked)
    draw_text_fade(draw, (135, 470), "• .env matched .env", TEXT, FONT_SMALL, alpha_blocked)

    alpha_risky = fade_alpha(t, 3.1)
    draw_text_fade(draw, (105, 526), "Risky files", YELLOW, FONT, alpha_risky)
    draw_text_fade(draw, (135, 568), "• auth/login.ts matched auth/**", TEXT, FONT_SMALL, alpha_risky)

    alpha_secret = fade_alpha(t, 3.75)
    draw_text_fade(draw, (690, 428), "Secret findings", PURPLE, FONT, alpha_secret)
    draw_text_fade(draw, (720, 470), "• .env:1 high entropy env assignment", TEXT, FONT_SMALL, alpha_secret)
    draw_text_fade(draw, (720, 512), "• src/config.ts:1 GitHub token pattern", TEXT, FONT_SMALL, alpha_secret)

    alpha_action = fade_alpha(t, 4.75)
    if alpha_action:
        rounded_rect(draw, (105, 600, 1174, 632), 9, (17, 24, 39, alpha_action), (*BORDER, alpha_action), 1)
        draw_text_fade(draw, (125, 605), "Reviewer action:", TEXT, FONT_SMALL, alpha_action)
        draw_text_fade(draw, (312, 605), "Do not merge", RED, FONT_SMALL, alpha_action)
        draw_text_fade(draw, (470, 605), "until blocked findings are resolved.", MUTED, FONT_SMALL, alpha_action)

    # End card overlay.
    if t > 5.75:
        a = min(220, int(220 * ((t - 5.75) / 0.55)))
        draw.rectangle((0, 0, WIDTH, HEIGHT), fill=(7, 17, 31, a))
        title_a = min(255, int(255 * ((t - 5.95) / 0.45)))
        draw_text_fade(draw, (360, 270), "RepoBelt", CYAN, FONT_BIG, title_a)
        draw_text_fade(draw, (360, 325), "A seatbelt for AI-generated pull requests", TEXT, FONT, title_a)
        draw_text_fade(draw, (360, 372), "github.com/realvaleh/repobelt", MUTED, FONT_SMALL, title_a)

    return img.convert("RGB")


def main() -> None:
    if shutil.which("ffmpeg") is None:
        raise SystemExit("ffmpeg is required to render docs/assets/repobelt-demo.mp4")

    OUT.parent.mkdir(parents=True, exist_ok=True)
    cmd = [
        "ffmpeg",
        "-y",
        "-f",
        "rawvideo",
        "-pix_fmt",
        "rgb24",
        "-s",
        f"{WIDTH}x{HEIGHT}",
        "-r",
        str(FPS),
        "-i",
        "-",
        "-an",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-preset",
        "medium",
        "-crf",
        "23",
        "-movflags",
        "+faststart",
        str(OUT),
    ]

    log_path = OUT.with_suffix(".ffmpeg.log")
    with log_path.open("wb") as log:
        proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stderr=log)
        assert proc.stdin is not None
        for idx in range(FRAMES):
            proc.stdin.write(draw_frame(idx).tobytes())
        proc.stdin.close()
        status = proc.wait()
    if status != 0:
        raise SystemExit(f"ffmpeg failed with status {status}. See {log_path}")
    log_path.unlink(missing_ok=True)
    print(f"Rendered {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
