#!/usr/bin/env python3
"""
Female voice -> doosri female voice (character change), speed same.

Setup (ek baar):
    brew install ffmpeg
    pip3 install praat-parselmouth

Examples:
    python3 female_to_female.py --list
    python3 female_to_female.py --voice girl
    python3 female_to_female.py --voice mature
    python3 female_to_female.py --voice husky
    python3 female_to_female.py --all            # saari voices ek saath bana do

Custom (chhote badlav se natural lagta hai):
    python3 female_to_female.py --pitch 1.1 --formant 1.05 --bass 2 --treble -1
"""

import argparse
import subprocess
import sys
import tempfile
from pathlib import Path

DEFAULT_INPUT = "/Users/forebear/Desktop/babyflashapp/vp_pick_level.mp3"

# name: (formant_ratio, pitch_ratio, bass_dB, treble_dB, description)
PRESETS = {
    "girl":    (1.10, 1.25, 0, 2,  "Young ladki, patli aur fresh awaaz"),
    "cute":    (1.15, 1.40, 0, 3,  "Cute / bachchi jaisi meethi awaaz"),
    "teen":    (1.06, 1.12, 0, 1,  "Teenager jaisi awaaz"),
    "bright":  (1.05, 1.05, -1, 4, "Clear, chamakdaar awaaz (anchor jaisi)"),
    "soft":    (1.00, 0.97, 2, -3, "Naram, shaant awaaz"),
    "warm":    (0.97, 0.92, 4, -1, "Garam, bhari hui awaaz"),
    "mature":  (0.95, 0.88, 2, -1, "Badi umar ki, samajhdaar awaaz"),
    "husky":   (0.90, 0.78, 3, -2, "Gehri, husky awaaz"),
}


def run(cmd):
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def praat_change(wav_in, wav_out, formant, pitch):
    try:
        import parselmouth
        from parselmouth.praat import call
    except ImportError:
        sys.exit("parselmouth install nahi hai. Chalao: pip3 install praat-parselmouth")

    sound = parselmouth.Sound(wav_in)
    # Female voice ke liye pitch range 100-600 Hz
    pitch_obj = sound.to_pitch(pitch_floor=100, pitch_ceiling=600)
    median = call(pitch_obj, "Get quantile", 0, 0, 0.5, "Hertz")
    if median != median or median <= 0:
        median = 220.0
    result = call(sound, "Change gender", 100, 600, formant, median * pitch, 1.0, 1.0)
    result.save(wav_out, "WAV")


def convert(inp: Path, out: Path, formant, pitch, bass, treble):
    with tempfile.TemporaryDirectory() as tmp:
        wav_in = str(Path(tmp) / "in.wav")
        wav_out = str(Path(tmp) / "out.wav")

        run(["ffmpeg", "-y", "-i", str(inp), "-ac", "1", wav_in])
        praat_change(wav_in, wav_out, formant, pitch)

        eq = []
        if bass:
            eq.append(f"bass=g={bass}")
        if treble:
            eq.append(f"treble=g={treble}")
        cmd = ["ffmpeg", "-y", "-i", wav_out]
        if eq:
            cmd += ["-filter:a", ",".join(eq)]
        cmd += ["-codec:a", "libmp3lame", "-q:a", "2", str(out)]
        run(cmd)
    print(f"Done! -> {out}")


def main():
    p = argparse.ArgumentParser(description="Female -> another female voice")
    p.add_argument("-i", "--input", default=DEFAULT_INPUT)
    p.add_argument("-o", "--output")
    p.add_argument("--voice", choices=PRESETS.keys())
    p.add_argument("--all", action="store_true", help="saari voices ek saath")
    p.add_argument("--list", action="store_true")
    p.add_argument("--pitch", type=float, help="pitch ratio (1.0 = same)")
    p.add_argument("--formant", type=float, help="formant ratio (1.0 = same)")
    p.add_argument("--bass", type=float, help="bass dB")
    p.add_argument("--treble", type=float, help="treble dB")
    args = p.parse_args()

    if args.list:
        for n, v in PRESETS.items():
            print(f"  {n:8} - {v[4]}")
        return

    inp = Path(args.input)
    if not inp.exists():
        sys.exit(f"File nahi mili: {inp}")

    if args.all:
        for n, (f, pt, b, t, _) in PRESETS.items():
            convert(inp, inp.with_name(f"{inp.stem}_{n}.mp3"), f, pt, b, t)
        return

    if not args.voice and all(v is None for v in (args.pitch, args.formant, args.bass, args.treble)):
        sys.exit("Voice chuno, e.g. --voice girl  (saari voices: --list)")

    f, pt, b, t = 1.0, 1.0, 0, 0
    tag = "custom"
    if args.voice:
        f, pt, b, t, _ = PRESETS[args.voice]
        tag = args.voice
    f = args.formant if args.formant is not None else f
    pt = args.pitch if args.pitch is not None else pt
    b = args.bass if args.bass is not None else b
    t = args.treble if args.treble is not None else t

    out = Path(args.output) if args.output else inp.with_name(f"{inp.stem}_{tag}.mp3")
    convert(inp, out, f, pt, b, t)


if __name__ == "__main__":
    main()