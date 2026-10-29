#!/usr/bin/env python3
"""
Measures *when* things are actually said in the lesson audio, so the UI can light up
exactly what the child hears. Writes rn_assets/data/voice_timing.json:

  {
    "L1U01_A_apple": {
      "intro": [[startMs, endMs], ...],          # every voiced burst in 00_sound_intro.mp3
      "chant": [                                  # 02_chant.mp3, one entry per sung line
        {"line": 0, "start": 430, "end": 2130, "chunks": [[430, 670], [980, 1220], [1520, 2130]]},
        ...                                       # chunks = "A" / "A" / "Apple", or null if unsure
        {"line": 2, "start": 11160, "end": 11520, "chunks": null, "word": true},
        ...                                       # sung rounds: one burst per word, word = last chunk
      ],
      "beats": [[startMs, endMs], ...]            # sung part's bursts — for dancing when lines are unclear
    }
  }

macOS only (decodes with the built-in `afconvert`). Re-run after changing lesson audio:
  python3 scripts/generate-voice-timing.py
"""
import json
import math
import os
import struct
import subprocess
import sys
import tempfile
import wave

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, 'rn_assets')
RATE = 16000
WIN_MS = 10


def envelope(mp3):
    """RMS loudness every 10 ms."""
    with tempfile.NamedTemporaryFile(suffix='.wav') as tmp:
        subprocess.run(['afconvert', '-f', 'WAVE', '-d', f'LEI16@{RATE}', '-c', '1', mp3, tmp.name], check=True)
        with wave.open(tmp.name) as w:
            n = w.getnframes()
            data = struct.unpack('<%dh' % n, w.readframes(n))
    win = RATE * WIN_MS // 1000
    return [math.sqrt(sum(x * x for x in data[i:i + win]) / win) for i in range(0, n - win, win)]


def voiced(rms, level=0.08, min_gap_ms=60, min_len_ms=80):
    """[start, end] ms of every stretch louder than `level` × peak."""
    if not rms:
        return []
    th = max(rms) * level
    gap = min_gap_ms // WIN_MS
    segs, start, quiet = [], None, 0
    for i, r in enumerate(rms):
        if r > th:
            if start is None:
                start = i
            quiet = 0
        elif start is not None:
            quiet += 1
            if quiet >= gap:
                segs.append([start, i - quiet + 1])
                start, quiet = None, 0
    if start is not None:
        segs.append([start, len(rms)])
    return [[a * WIN_MS, b * WIN_MS] for a, b in segs if (b - a) * WIN_MS >= min_len_ms]


def split_by_counts(segs, counts):
    """Exactly sum(counts) bursts → hand them out line by line."""
    out, i = [], 0
    for c in counts:
        out.append(segs[i:i + c])
        i += c
    return out


def split_by_gaps(segs, groups):
    """Cut at the (groups-1) widest pauses."""
    if groups <= 1 or len(segs) < groups:
        return [segs] if segs else []
    gaps = sorted(range(1, len(segs)), key=lambda i: segs[i][0] - segs[i - 1][1], reverse=True)[:groups - 1]
    cuts = sorted(gaps)
    out, prev = [], 0
    for c in cuts:
        out.append(segs[prev:c])
        prev = c
    out.append(segs[prev:])
    return out


def split_sung(segs):
    """Sung part: a line ends on a clearly longer burst (the word) or a clearly longer pause."""
    if len(segs) < 2:
        return [segs] if segs else []
    lens = sorted(b - a for a, b in segs)
    med_len = lens[len(lens) // 2]
    gaps = sorted(segs[i][0] - segs[i - 1][1] for i in range(1, len(segs)))
    med_gap = gaps[len(gaps) // 2]
    long_word = max(lens) >= 1.4 * med_len
    out, cur = [], []
    for i, s in enumerate(segs):
        cur.append(s)
        nxt_gap = segs[i + 1][0] - s[1] if i + 1 < len(segs) else 0
        ends_on_word = long_word and (s[1] - s[0]) >= 0.85 * max(lens)
        if i + 1 < len(segs) and (ends_on_word or nxt_gap > max(450, 1.6 * med_gap)):
            out.append(cur)
            cur = []
    if cur:
        out.append(cur)
    return out


def merge_to(group, n):
    """Too many bursts in a round (a word broke in two) → glue the closest neighbours back."""
    g = [list(x) for x in group]
    while len(g) > n:
        i = min(range(1, len(g)), key=lambda k: g[k][0] - g[k - 1][1])
        g[i - 1:i + 1] = [[g[i - 1][0], g[i][1]]]
    return g


def chant_lines(segs, lesson, start_ms):
    texts = [lesson['chantTexts'][i] for i in lesson['chantOrder']]
    counts = [len([p for p in t.split('-') if p]) for t in texts]
    n = len(texts)
    total = sum(counts)
    # The spoken part comes first: its bursts are exactly the chunks ("A","A","Apple" × lines).
    # start_ms is only roughly where singing begins, so trust the count when it lines up.
    if len(segs) >= total and segs[total - 1][0] < start_ms + 1500:
        intro, sung = segs[:total], segs[total:]
    else:
        intro = [s for s in segs if s[0] < start_ms - 100]
        sung = [s for s in segs if s[0] >= start_ms - 100]

    lines = []

    def add(groups):
        for g in groups:
            if not g:
                continue
            line = len(lines) % n
            lines.append({
                'line': line,
                'start': g[0][0],
                'end': g[-1][1],
                'chunks': g if len(g) == counts[line] else None,
            })

    # spoken part: one line after another, each "A-A-Apple" = 3 bursts
    add(split_by_counts(intro, counts) if len(intro) == total else split_by_gaps(intro, n))
    # sung part: every round says all the words once — "Apple, Ax, Ant, Alligator" — so each burst
    # is one card. Rounds end on the long last word (or a long pause).
    rounds = []
    for g in split_sung(sung):
        # no audible round boundary (even beat, no long last word): cut every n words
        rounds += [g[i:i + n] for i in range(0, len(g), n)] if len(g) >= 2 * n else [g]
    for r, g in enumerate(rounds):
        if len(g) > n:
            g = merge_to(g, n)
        if len(g) < n and r < len(rounds) - 1:
            continue  # unclear round in the middle — the UI just dances to the beats there
        for k, (a, b) in enumerate(g):
            lines.append({'line': k, 'start': a, 'end': b, 'chunks': None, 'word': True})
    return lines, sung


def main():
    curriculum = json.load(open(os.path.join(ASSETS, 'data', 'curriculum.json')))
    chant_meta = {}
    for lv in range(1, 6):
        path = os.path.join(ASSETS, 'data', 'chant_meta', f'level_{lv}.json')
        if os.path.exists(path):
            for m in json.load(open(path)):
                chant_meta[m['lesson_id']] = m

    out = {}
    for level in curriculum['levels']:
        for unit in level['units']:
            for lesson in unit['lessons']:
                word = lesson['words'][0]['word'].lower().replace(' ', '_').replace('-', '_')
                key = f"{level['id']}U{unit['number']:02d}_{lesson['letter']}_{word}"
                folder = os.path.join(ASSETS, 'audio', f"level_{level['number']}", f"unit_{unit['number']:02d}", key)
                entry = {}
                intro = os.path.join(folder, '00_sound_intro.mp3')
                if os.path.exists(intro):
                    entry['intro'] = voiced(envelope(intro))
                chant = os.path.join(folder, '02_chant.mp3')
                if os.path.exists(chant):
                    meta = chant_meta.get(key, {})
                    # 180 ms: "A…pple" stays one word, "A, A" stay two
                    entry['chant'], entry['beats'] = chant_lines(voiced(envelope(chant), min_gap_ms=180), lesson, meta.get('start_ms', 10**9))
                if entry:
                    out[key] = entry
                    sys.stdout.write('.')
                    sys.stdout.flush()

    dest = os.path.join(ASSETS, 'data', 'voice_timing.json')
    with open(dest, 'w') as f:
        json.dump(out, f, separators=(',', ':'))
    print(f"\nwrote {len(out)} lessons → {os.path.relpath(dest, ROOT)}")


if __name__ == '__main__':
    main()
