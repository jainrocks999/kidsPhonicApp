#!/usr/bin/env python3
"""
Koi bhi awaaz (male ya female) -> kisi bhi male / female / bachche ki awaaz. Speed same rehti hai.

Script khud detect karta hai ki input male hai ya female, aur usi hisaab se
formant (gale ka size) adjust karta hai. Pitch absolute Hz mein set hota hai,
isliye kisi bhi input par result ek jaisa aata hai.

Setup (ek baar):
    brew install ffmpeg
    pip3 install praat-parselmouth

Examples:
    python3 voice_converter.py --list
    python3 voice_converter.py --voice man
    python3 voice_converter.py --voice deep_man
    python3 voice_converter.py --voice girl
    python3 voice_converter.py --all                  # saari voices ek saath
    python3 voice_converter.py --all --gender male    # sirf male voices
    python3 voice_converter.py -i other.mp3 --voice woman -o out.mp3

Kisi doosri file ki awaaz jaisa banao:
    python3 voice_converter.py -i vp_pick_level.mp3 --like banana.mp3

Custom voice:
    python3 voice_converter.py --gender male --hz 105 --formant 0.97 --bass 3
    (--hz: target pitch, male ~85-160, female ~170-280, child ~250-350
     --formant: 1.0 = us gender ka normal gala, >1 chhota gala, <1 bada gala
     --range: pitch ka utaar-chadhaav, 1.0 = same, <1 flat, >1 zyada expressive)
"""

import argparse
import subprocess
import sys
import tempfile
from pathlib import Path

DEFAULT_INPUT = "/Users/forebear/Desktop/babyflashapp/vp_pick_level.mp3"

# Source gender -> target gender ka base formant ratio
BASE_FORMANT = {
    ("female", "female"): 1.00, ("female", "male"): 0.84, ("female", "child"): 1.12,
    ("male", "female"): 1.18,   ("male", "male"): 1.00,   ("male", "child"): 1.30,
}

# name: (gender, target_hz, formant_tweak, pitch_range, bass_dB, treble_dB, description[, extra_ffmpeg_fx])
PRESETS = {
    # --- Male ---
    "man":          ("male",   125, 1.00, 1.0, 1, 0,  "Normal mard ki awaaz"),
    "deep_man":     ("male",    82, 0.88, 0.8, 6, -3, "Bahut gehri, bhaari mard ki awaaz"),
    "giant":        ("male",    68, 0.80, 0.6, 8, -5, "Pahalwaan / dev jaisi bahut bhaari awaaz"),
    "young_man":    ("male",   155, 1.08, 1.3, 0, 2,  "Jawaan ladka (college boy)"),
    "teen_boy":     ("male",   175, 1.13, 1.4, -1, 3, "Teenager ladka, awaaz abhi bhi thodi patli"),
    "narrator":     ("male",   100, 0.95, 1.3, 4, 3,  "Announcer / narrator, clear aur dramatic"),
    "old_man":      ("male",   118, 0.92, 0.5, 0, -4, "Buzurg aadmi, kaanpti awaaz", "vibrato=f=5.5:d=0.25"),
    "soft_man":     ("male",   135, 1.03, 0.7, 2, -6, "Naram, dheemi, shaant mard"),
    # --- Female ---
    "woman":        ("female", 210, 1.00, 1.0, 0, 0,  "Normal aurat ki awaaz"),
    "girl":         ("female", 255, 1.07, 1.2, 0, 2,  "Young ladki, patli fresh awaaz"),
    "teen_girl":    ("female", 235, 1.04, 1.1, 0, 1,  "Teenager ladki"),
    "anchor":       ("female", 215, 1.03, 1.0, -1, 3, "Clear news-anchor jaisi"),
    "soft_woman":   ("female", 200, 1.00, 0.9, 2, -3, "Naram, shaant aurat"),
    "mature_woman": ("female", 180, 0.96, 0.9, 2, -1, "Badi umar ki aurat"),
    "husky_woman":  ("female", 165, 0.92, 0.9, 3, -2, "Husky, gehri female awaaz"),
    # --- Child ---
    "kid":          ("child",  300, 1.00, 1.2, 0, 2,  "Chhota bachcha"),
    "boy":          ("child",  270, 0.97, 1.1, 1, 1,  "Chhota ladka"),
    "baby_girl":    ("child",  340, 1.05, 1.3, 0, 3,  "Chhoti bachchi, cute awaaz"),
}


def run(cmd):
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def load():
    try:
        import parselmouth
        from parselmouth.praat import call
    except ImportError:
        sys.exit("parselmouth install nahi hai. Chalao: pip3 install praat-parselmouth")
    return parselmouth, call


def detect_gender(sound, call):
    """Median pitch dekh kar batao input male hai ya female."""
    pitch = sound.to_pitch(pitch_floor=60, pitch_ceiling=600)
    median = call(pitch, "Get quantile", 0, 0, 0.5, "Hertz")
    if median != median or median <= 0:
        return "female", 0.0
    return ("male" if median < 165 else "female"), median


def measure(sound, call):
    """Awaaz ki pehchaan: median pitch, pitch ka utaar-chadhaav, formants (F3-F4), volume.
    F1/F2 bole gaye shabdon par depend karte hain, isliye gale ke size ke liye F3/F4 lete hain."""
    import numpy as np
    pitch = sound.to_pitch(pitch_floor=60, pitch_ceiling=600)
    f0 = pitch.selected_array["frequency"]
    times = pitch.xs()[f0 > 0]
    f0 = f0[f0 > 0]
    if len(f0) < 5:
        sys.exit("Is file mein awaaz (voiced speech) kam mili, measure nahi ho paya.")
    formant = sound.to_formant_burg(time_step=0.01, max_number_of_formants=5, maximum_formant=5500)
    fmts = []
    for n in (3, 4):
        vals = np.array([formant.get_value_at_time(n, t) for t in times])
        fmts.append(np.nanmedian(vals))
    return {
        "hz": float(np.median(f0)),
        "spread": float(np.std(np.log2(f0))),
        "formants": np.array(fmts),
        "db": call(sound, "Get intensity (dB)"),
    }


def convert_like(inp: Path, ref: Path, out: Path, formant_override=None, range_override=None):
    """Input ki awaaz ko reference file ki awaaz jaisa banao."""
    import numpy as np
    parselmouth, call = load()
    with tempfile.TemporaryDirectory() as tmp:
        wav_in, wav_ref, wav_out = (str(Path(tmp) / n) for n in ("in.wav", "ref.wav", "out.wav"))
        run(["ffmpeg", "-y", "-i", str(inp), "-ac", "1", wav_in])
        run(["ffmpeg", "-y", "-i", str(ref), "-ac", "1", wav_ref])

        sound = parselmouth.Sound(wav_in)
        src = measure(sound, call)
        tgt = measure(parselmouth.Sound(wav_ref), call)

        formant = float(np.exp(np.mean(np.log(tgt["formants"] / src["formants"]))))
        # Same gender mein gale ka size zyada alag nahi hota; short clips ka naap shaky hota hai
        same_gender = (src["hz"] < 165) == (tgt["hz"] < 165)
        lo, hi = (0.88, 1.15) if same_gender else (0.75, 1.30)
        formant = min(max(formant, lo), hi)
        if formant_override is not None:
            formant = formant_override
        prange = min(max(tgt["spread"] / src["spread"], 0.3), 3.0) if src["spread"] > 0 else 1.0
        if range_override is not None:
            prange = range_override
        floor, ceil = (60, 300) if src["hz"] < 165 else (100, 600)

        result = call(sound, "Change gender", floor, ceil, formant, tgt["hz"], prange, 1.0)
        call(result, "Scale intensity", tgt["db"])
        call(result, "Scale peak", 0.99) if call(result, "Get absolute extremum", 0, 0, "None") > 0.99 else None
        result.save(wav_out, "WAV")
        run(["ffmpeg", "-y", "-i", wav_out, "-codec:a", "libmp3lame", "-q:a", "2", str(out)])

    print(f"input  : {src['hz']:.0f}Hz, formants {src['formants'].round().astype(int).tolist()}")
    print(f"target : {tgt['hz']:.0f}Hz, formants {tgt['formants'].round().astype(int).tolist()}")
    print(f"applied: pitch -> {tgt['hz']:.0f}Hz, formant x{formant:.2f}, range x{prange:.2f}")
    print(f"Done! -> {out}")


def convert(inp: Path, out: Path, gender, hz, tweak, prange, bass, treble, src_gender=None, fx=None):
    parselmouth, call = load()
    with tempfile.TemporaryDirectory() as tmp:
        wav_in = str(Path(tmp) / "in.wav")
        wav_out = str(Path(tmp) / "out.wav")
        run(["ffmpeg", "-y", "-i", str(inp), "-ac", "1", wav_in])

        sound = parselmouth.Sound(wav_in)
        detected, median = detect_gender(sound, call)
        src = src_gender or detected
        floor, ceil = (60, 300) if src == "male" else (100, 600)
        formant = BASE_FORMANT[(src, gender)] * tweak

        result = call(sound, "Change gender", floor, ceil, formant, hz, prange, 1.0)
        result.save(wav_out, "WAV")

        eq = [fx] if fx else []
        if bass:
            eq.append(f"bass=g={bass}")
        if treble:
            eq.append(f"treble=g={treble}")
        cmd = ["ffmpeg", "-y", "-i", wav_out]
        if eq:
            cmd += ["-filter:a", ",".join(eq)]
        cmd += ["-codec:a", "libmp3lame", "-q:a", "2", str(out)]
        run(cmd)

    print(f"[{src} {median:.0f}Hz -> {gender} {hz:.0f}Hz, formant {formant:.2f}] {out}")


def main():
    p = argparse.ArgumentParser(description="Any voice -> any male/female/child voice")
    p.add_argument("-i", "--input", default=DEFAULT_INPUT)
    p.add_argument("-o", "--output")
    p.add_argument("--voice", choices=PRESETS.keys())
    p.add_argument("--all", action="store_true", help="saari voices ek saath")
    p.add_argument("--list", action="store_true")
    p.add_argument("--like", help="reference audio: input ko is file ki awaaz jaisa banao")
    p.add_argument("--source", choices=["male", "female"], help="input ka gender (default: auto-detect)")
    p.add_argument("--gender", choices=["male", "female", "child"], help="target gender (custom / --all filter)")
    p.add_argument("--hz", type=float, help="target pitch median in Hz")
    p.add_argument("--formant", type=float, help="formant tweak (1.0 = normal)")
    p.add_argument("--range", type=float, dest="prange", help="pitch range factor (1.0 = same)")
    p.add_argument("--bass", type=float, help="bass dB")
    p.add_argument("--treble", type=float, help="treble dB")
    args = p.parse_args()

    if args.list:
        for n, v in PRESETS.items():
            print(f"  {n:13} [{v[0]:6}] {v[1]:>3}Hz  - {v[6]}")
        return

    inp = Path(args.input)
    if not inp.exists():
        sys.exit(f"File nahi mili: {inp}")

    if args.like:
        ref = Path(args.like)
        if not ref.exists():
            sys.exit(f"Reference file nahi mili: {ref}")
        out = Path(args.output) if args.output else inp.with_name(f"{inp.stem}_like_{ref.stem}.mp3")
        convert_like(inp, ref, out, args.formant, args.prange)
        return

    if args.all:
        for n, (g, hz, tw, pr, b, t, _, *fx) in PRESETS.items():
            if args.gender and g != args.gender:
                continue
            convert(inp, inp.with_name(f"{inp.stem}_{n}.mp3"), g, hz, tw, pr, b, t, args.source, *fx)
        return

    custom = (args.gender, args.hz, args.formant, args.prange, args.bass, args.treble)
    if not args.voice and all(v is None for v in custom):
        sys.exit("Voice chuno, e.g. --voice man  (saari voices: --list)")

    g, hz, tw, pr, b, t, tag, fx = "female", 210, 1.0, 1.0, 0, 0, "custom", []
    if args.voice:
        g, hz, tw, pr, b, t, _, *fx = PRESETS[args.voice]
        tag = args.voice
    elif args.gender:
        g = args.gender
        hz = {"male": 120, "female": 210, "child": 300}[g]
    g = args.gender or g
    hz = args.hz if args.hz is not None else hz
    tw = args.formant if args.formant is not None else tw
    pr = args.prange if args.prange is not None else pr
    b = args.bass if args.bass is not None else b
    t = args.treble if args.treble is not None else t

    out = Path(args.output) if args.output else inp.with_name(f"{inp.stem}_{tag}.mp3")
    convert(inp, out, g, hz, tw, pr, b, t, args.source, *fx)


if __name__ == "__main__":
    main()
