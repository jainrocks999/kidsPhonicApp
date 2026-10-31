#!/usr/bin/env python3
"""
Audio ka pitch aur tone change karo, speed same rahegi.

Requirement: ffmpeg install hona chahiye
    Mac:  brew install ffmpeg

Examples:
    python3 change_pitch_tone.py --pitch 3              # 3 semitone upar (patli awaaz)
    python3 change_pitch_tone.py --pitch -4             # 4 semitone neeche (bhaari awaaz)
    python3 change_pitch_tone.py --pitch 2 --bass 5 --treble -3
    python3 change_pitch_tone.py -i other.mp3 -o out.mp3 --pitch 1
"""

import argparse
import subprocess
import sys
from pathlib import Path

DEFAULT_INPUT = "/Users/forebear/Desktop/babyflashapp/vp_pick_level.mp3"


def get_sample_rate(path: str) -> int:
    out = subprocess.check_output([
        "ffprobe", "-v", "error", "-select_streams", "a:0",
        "-show_entries", "stream=sample_rate",
        "-of", "default=noprint_wrappers=1:nokey=1", path,
    ])
    return int(out.decode().strip())


def build_filter(sr: int, semitones: float, bass: float, treble: float) -> str:
    # pitch ratio: har semitone = 2^(1/12)
    ratio = 2 ** (semitones / 12)
    filters = []

    if semitones != 0:
        # asetrate pitch badalta hai (speed bhi badalti hai),
        # atempo usse wapas original speed par la deta hai.
        filters.append(f"asetrate={sr * ratio:.2f}")
        filters.append(f"aresample={sr}")
        # atempo ki range 0.5-2.0 hai, isliye chain me todte hain
        tempo = 1 / ratio
        while tempo < 0.5:
            filters.append("atempo=0.5")
            tempo /= 0.5
        while tempo > 2.0:
            filters.append("atempo=2.0")
            tempo /= 2.0
        filters.append(f"atempo={tempo:.6f}")

    # Tone control
    if bass != 0:
        filters.append(f"bass=g={bass}")
    if treble != 0:
        filters.append(f"treble=g={treble}")

    return ",".join(filters) if filters else "anull"


def main():
    p = argparse.ArgumentParser(description="Pitch & tone changer (speed same)")
    p.add_argument("-i", "--input", default=DEFAULT_INPUT, help="input mp3 file")
    p.add_argument("-o", "--output", help="output file (default: <name>_changed.mp3)")
    p.add_argument("--pitch", type=float, default=0,
                   help="semitones me pitch change (+ patli/high, - bhaari/low), e.g. 3 ya -2.5")
    p.add_argument("--bass", type=float, default=0,
                   help="bass dB me (+ zyada, - kam), e.g. 6 ya -4")
    p.add_argument("--treble", type=float, default=0,
                   help="treble dB me (+ zyada, - kam), e.g. 5 ya -3")
    args = p.parse_args()

    inp = Path(args.input)
    if not inp.exists():
        sys.exit(f"File nahi mili: {inp}")

    out = Path(args.output) if args.output else inp.with_name(inp.stem + "_changed.mp3")

    sr = get_sample_rate(str(inp))
    af = build_filter(sr, args.pitch, args.bass, args.treble)

    cmd = ["ffmpeg", "-y", "-i", str(inp), "-filter:a", af,
           "-codec:a", "libmp3lame", "-q:a", "2", str(out)]
    print("Running:", " ".join(cmd))
    subprocess.run(cmd, check=True)
    print(f"\nDone! Output: {out}")


if __name__ == "__main__":
    main()