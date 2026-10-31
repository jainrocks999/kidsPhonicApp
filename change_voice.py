#!/usr/bin/env python3
"""
Voice Changer: awaaz hi badal do (speed same rehti hai).

Setup (ek baar):
    brew install ffmpeg
    pip3 install praat-parselmouth

Examples:
    python3 change_voice.py --voice female
    python3 change_voice.py --voice male
    python3 change_voice.py --voice child
    python3 change_voice.py --voice monster
    python3 change_voice.py --voice alien
    python3 change_voice.py --voice robot
    python3 change_voice.py --list

Custom:
    python3 change_voice.py --pitch 1.4 --formant 1.15
    (pitch: 1.0 = same, >1 patli, <1 bhaari | formant: >1 chhota gala, <1 bada gala)

Doosri file:
    python3 change_voice.py -i my.mp3 -o out.mp3 --voice female
"""

import argparse
import subprocess
import sys
import tempfile
from pathlib import Path

DEFAULT_INPUT = "/Users/forebear/Desktop/babyflashapp/vp_pick_level.mp3"

# name: (formant_ratio, pitch_ratio, description)
PRESETS = {
    "female":  (1.18, 1.60, "Mard ki awaaz -> aurat jaisi"),
    "male":    (0.85, 0.65, "Aurat ki awaaz -> mard jaisi"),
    "child":   (1.30, 1.90, "Bachche jaisi awaaz"),
    "monster": (0.70, 0.50, "Bhaari, darawni awaaz"),
    "alien":   (0.80, 1.70, "Alien jaisi ajeeb awaaz"),
    "old":     (0.92, 0.85, "Buzurg jaisi awaaz"),
    "robot":   None,  # ffmpeg effect
}


def run(cmd):
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def change_voice_praat(wav_in: str, wav_out: str, formant: float, pitch: float):
    try:
        import parselmouth
        from parselmouth.praat import call
    except ImportError:
        sys.exit("parselmouth install nahi hai. Chalao: pip3 install praat-parselmouth")

    sound = parselmouth.Sound(wav_in)

    # Original median pitch nikalo, phir usse ratio se multiply karo
    pitch_obj = sound.to_pitch()
    median = call(pitch_obj, "Get quantile", 0, 0, 0.5, "Hertz")
    if median != median or median <= 0:  # NaN / unvoiced
        median = 150.0
    new_median = median * pitch

    # Change gender: min pitch, max pitch, formant ratio, new median, range factor, duration factor
    result = call(sound, "Change gender", 75, 600, formant, new_median, 1.0, 1.0)
    result.save(wav_out, "WAV")


def robot_effect(inp: str, out: str):
    af = ("afftfilt=real='hypot(re,im)*sin(0)':imag='hypot(re,im)*cos(0)'"
          ":win_size=512:overlap=0.75")
    run(["ffmpeg", "-y", "-i", inp, "-filter:a", af,
         "-codec:a", "libmp3lame", "-q:a", "2", out])


def main():
    p = argparse.ArgumentParser(description="Voice changer (speed same)")
    p.add_argument("-i", "--input", default=DEFAULT_INPUT, help="input audio file")
    p.add_argument("-o", "--output", help="output file (default: <name>_<voice>.mp3)")
    p.add_argument("--voice", choices=PRESETS.keys(), help="preset voice")
    p.add_argument("--pitch", type=float, help="custom pitch ratio (1.0 = same)")
    p.add_argument("--formant", type=float, help="custom formant ratio (1.0 = same)")
    p.add_argument("--list", action="store_true", help="saari voices dikhao")
    args = p.parse_args()

    if args.list:
        for name, v in PRESETS.items():
            print(f"  {name:8} - {v[2] if v else 'Robot jaisi metallic awaaz'}")
        return

    if not args.voice and args.pitch is None and args.formant is None:
        sys.exit("Koi voice chuno, e.g. --voice female  (saari voices: --list)")

    inp = Path(args.input)
    if not inp.exists():
        sys.exit(f"File nahi mili: {inp}")

    tag = args.voice or "custom"
    out = Path(args.output) if args.output else inp.with_name(f"{inp.stem}_{tag}.mp3")

    # Robot = ffmpeg effect
    if args.voice == "robot":
        robot_effect(str(inp), str(out))
        print(f"Done! Output: {out}")
        return

    # Praat based voice change
    if args.voice:
        formant, pitch, _ = PRESETS[args.voice]
    else:
        formant, pitch = 1.0, 1.0
    if args.formant is not None:
        formant = args.formant
    if args.pitch is not None:
        pitch = args.pitch

    with tempfile.TemporaryDirectory() as tmp:
        wav_in = str(Path(tmp) / "in.wav")
        wav_out = str(Path(tmp) / "out.wav")

        # mp3 -> mono wav
        run(["ffmpeg", "-y", "-i", str(inp), "-ac", "1", wav_in])
        change_voice_praat(wav_in, wav_out, formant, pitch)
        # wav -> mp3
        run(["ffmpeg", "-y", "-i", wav_out, "-codec:a", "libmp3lame", "-q:a", "2", str(out)])

    print(f"Done! Output: {out}")


if __name__ == "__main__":
    main()