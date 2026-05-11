#!/usr/bin/env python3
"""Add synthetic attention-grabbing sound effects to the RepoBelt demo video.

Output:
- docs/assets/repobelt-demo-sfx.mp4

All sounds are generated locally with Python. No external audio assets are used.
"""

from __future__ import annotations

import math
import random
import shutil
import subprocess
import tempfile
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VIDEO_IN = ROOT / "docs" / "assets" / "repobelt-demo.mp4"
VIDEO_OUT = ROOT / "docs" / "assets" / "repobelt-demo-sfx.mp4"

SAMPLE_RATE = 48_000
DURATION = 10.5
SAMPLES = int(SAMPLE_RATE * DURATION)


def clamp(x: float) -> float:
    return max(-1.0, min(1.0, x))


def add_sample(buf: list[float], index: int, value: float) -> None:
    if 0 <= index < len(buf):
        buf[index] = clamp(buf[index] + value)


def add_beep(buf: list[float], t: float, *, freq: float, dur: float, amp: float, kind: str = "sine") -> None:
    start = int(t * SAMPLE_RATE)
    length = int(dur * SAMPLE_RATE)
    for n in range(length):
        x = n / max(1, length - 1)
        env = math.sin(math.pi * x) ** 0.7
        if kind == "square":
            tone = 1.0 if math.sin(2 * math.pi * freq * n / SAMPLE_RATE) >= 0 else -1.0
        else:
            tone = math.sin(2 * math.pi * freq * n / SAMPLE_RATE)
        add_sample(buf, start + n, amp * env * tone)



def add_soft_riser(buf: list[float], t: float, *, dur: float = 1.2, amp: float = 0.045) -> None:
    start = int(t * SAMPLE_RATE)
    length = int(dur * SAMPLE_RATE)
    for n in range(length):
        x = n / max(1, length - 1)
        env = math.sin(math.pi * x)
        freq = 180 + 260 * x
        tone = math.sin(2 * math.pi * freq * n / SAMPLE_RATE)
        overtone = math.sin(2 * math.pi * (freq * 2.01) * n / SAMPLE_RATE) * 0.35
        add_sample(buf, start + n, amp * env * (tone + overtone))


def add_fail_sting(buf: list[float], t: float) -> None:
    """A short fail/error sting: punch + descending alarm tones."""
    start = int(t * SAMPLE_RATE)
    dur = 0.48
    length = int(dur * SAMPLE_RATE)
    rng = random.Random(404)
    for n in range(length):
        x = n / length
        env = math.exp(-x * 5.0)
        sweep_freq = 190 - 95 * x
        tone = math.sin(2 * math.pi * sweep_freq * n / SAMPLE_RATE)
        grit = rng.uniform(-1, 1) * math.exp(-x * 14.0)
        add_sample(buf, start + n, 0.34 * env * tone + 0.12 * grit)
    add_beep(buf, t + 0.02, freq=780, dur=0.095, amp=0.17, kind="square")
    add_beep(buf, t + 0.15, freq=520, dur=0.12, amp=0.15, kind="square")


def add_pop(buf: list[float], t: float, *, freq: float = 880, amp: float = 0.16) -> None:
    start = int(t * SAMPLE_RATE)
    length = int(0.14 * SAMPLE_RATE)
    for n in range(length):
        x = n / length
        env = math.exp(-x * 9.0)
        tone = math.sin(2 * math.pi * freq * n / SAMPLE_RATE)
        add_sample(buf, start + n, amp * env * tone)


def add_whoosh(buf: list[float], t: float, *, dur: float = 0.32, amp: float = 0.11) -> None:
    start = int(t * SAMPLE_RATE)
    length = int(dur * SAMPLE_RATE)
    rng = random.Random(int(t * 1000))
    last = 0.0
    for n in range(length):
        x = n / length
        env = math.sin(math.pi * x)
        # High-passed-ish filtered noise for a UI reveal sweep.
        noise = rng.uniform(-1, 1)
        hp = noise - last * 0.72
        last = noise
        pitch = math.sin(2 * math.pi * (600 + 1200 * x) * n / SAMPLE_RATE) * 0.15
        add_sample(buf, start + n, amp * env * (hp + pitch))


def add_shimmer(buf: list[float], t: float) -> None:
    for offset, freq in [(0.00, 660), (0.08, 880), (0.16, 1320), (0.24, 1760)]:
        add_beep(buf, t + offset, freq=freq, dur=0.34, amp=0.08)


def apply_limiter(buf: list[float]) -> list[float]:
    peak = max(abs(x) for x in buf) or 1.0
    gain = min(0.92 / peak, 1.0)
    return [math.tanh(x * gain * 1.08) * 0.92 for x in buf]


def write_wav(buf: list[float], path: Path) -> None:
    with wave.open(str(path), "wb") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(SAMPLE_RATE)
        for sample in buf:
            val = int(clamp(sample) * 32767)
            packed = val.to_bytes(2, "little", signed=True)
            wf.writeframesraw(packed + packed)


def main() -> None:
    if not VIDEO_IN.exists():
        raise SystemExit(f"Missing input video: {VIDEO_IN}")
    if shutil.which("ffmpeg") is None:
        raise SystemExit("ffmpeg is required")

    buf = [0.0] * SAMPLES

    # No keyboard typing sounds: use subtle UI motion and alert cues instead.
    add_soft_riser(buf, 0.35, dur=1.25, amp=0.035)

    # Report/UI reveals.
    add_fail_sting(buf, 1.76)
    add_whoosh(buf, 2.42, dur=0.26, amp=0.08)
    add_pop(buf, 2.48, freq=620, amp=0.11)
    add_whoosh(buf, 3.08, dur=0.28, amp=0.08)
    add_pop(buf, 3.14, freq=760, amp=0.10)
    add_whoosh(buf, 3.72, dur=0.32, amp=0.09)
    add_pop(buf, 3.80, freq=980, amp=0.12)
    add_beep(buf, 4.75, freq=410, dur=0.22, amp=0.12, kind="square")
    add_pop(buf, 4.88, freq=520, amp=0.09)
    add_shimmer(buf, 6.95)
    add_soft_riser(buf, 7.15, dur=2.5, amp=0.025)

    buf = apply_limiter(buf)

    with tempfile.TemporaryDirectory(prefix="repobelt-demo-sfx-") as tmp:
        wav_out = Path(tmp) / "repobelt-demo-sfx.wav"
        write_wav(buf, wav_out)

        cmd = [
            "ffmpeg",
            "-y",
            "-i",
            str(VIDEO_IN),
            "-i",
            str(wav_out),
            "-map",
            "0:v:0",
            "-map",
            "1:a:0",
            "-c:v",
            "copy",
            "-c:a",
            "aac",
            "-b:a",
            "160k",
            "-shortest",
            "-movflags",
            "+faststart",
            str(VIDEO_OUT),
        ]
        subprocess.run(cmd, check=True)
    print(f"Wrote {VIDEO_OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
