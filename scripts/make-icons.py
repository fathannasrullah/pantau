#!/usr/bin/env python3
"""Generate the PWA icon set. Run: python3 scripts/make-icons.py"""
import math
import os
import struct
import zlib

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public", "icons")

BG = (13, 17, 23)
MOUNTAIN = (251, 146, 60)
PEAK = (248, 113, 113)
ASH = (154, 165, 179)


def blend(dst, src, a):
    return tuple(round(d + (s - d) * a) for d, s in zip(dst, src))


def render(size, scale):
    """scale < 1 shrinks artwork toward the centre, leaving a maskable safe margin."""
    px = [[BG for _ in range(size)] for _ in range(size)]
    ss = 3  # supersampling factor for antialiasing

    def art_coords(x, y):
        return (x - 0.5) / scale + 0.5, (y - 0.5) / scale + 0.5

    def coverage(cx, cy, inside):
        hits = 0
        for sy in range(ss):
            for sx in range(ss):
                x = (cx + (sx + 0.5) / ss) / size
                y = (cy + (sy + 0.5) / ss) / size
                if inside(*art_coords(x, y)):
                    hits += 1
        return hits / (ss * ss)

    def in_triangle(ax, ay, bx, by, cx2, cy2):
        def sign(px1, py1, px2, py2, px3, py3):
            return (px1 - px3) * (py2 - py3) - (px2 - px3) * (py1 - py3)

        def f(x, y):
            d1 = sign(x, y, ax, ay, bx, by)
            d2 = sign(x, y, bx, by, cx2, cy2)
            d3 = sign(x, y, cx2, cy2, ax, ay)
            neg = (d1 < 0) or (d2 < 0) or (d3 < 0)
            pos = (d1 > 0) or (d2 > 0) or (d3 > 0)
            return not (neg and pos)

        return f

    def in_disc(cx, cy, r):
        return lambda x, y: (x - cx) ** 2 + (y - cy) ** 2 <= r * r

    def in_ring(cx, cy, r_in, r_out):
        def f(x, y):
            d = math.hypot(x - cx, y - cy)
            return r_in <= d <= r_out and y <= cy + 0.02

        return f

    layers = [
        (in_ring(0.5, 0.30, 0.20, 0.235), blend(BG, ASH, 0.30)),
        (in_triangle(0.10, 0.86, 0.50, 0.40, 0.90, 0.86), MOUNTAIN),
        (in_disc(0.50, 0.29, 0.085), PEAK),
    ]

    for y in range(size):
        for x in range(size):
            for inside, color in layers:
                a = coverage(x, y, inside)
                if a > 0:
                    px[y][x] = blend(px[y][x], color, a)
    return px


def write_png(path, px):
    size = len(px)
    raw = b"".join(
        b"\x00" + b"".join(struct.pack("3B", *px[y][x]) for x in range(size))
        for y in range(size)
    )

    def chunk(tag, data):
        body = tag + data
        return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body))

    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(raw, 9))
    png += chunk(b"IEND", b"")
    with open(path, "wb") as fh:
        fh.write(png)


def main():
    os.makedirs(OUT, exist_ok=True)
    for name, size, scale in [
        ("icon-192.png", 192, 1.0),
        ("icon-512.png", 512, 1.0),
        ("icon-maskable-512.png", 512, 0.72),
        ("apple-touch-icon.png", 180, 1.0),
        ("favicon-32.png", 32, 1.0),
    ]:
        write_png(os.path.join(OUT, name), render(size, scale))
        print("wrote", name)


if __name__ == "__main__":
    main()
