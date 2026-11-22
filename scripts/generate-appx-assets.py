import os
import struct
import zlib

os.makedirs("build/appx", exist_ok=True)
os.makedirs("resources/icons", exist_ok=True)


def write_png(path: str, width: int, height: int, rgba_bytes: bytes) -> None:
    def chunk(tag: bytes, data: bytes) -> bytes:
        return (
            struct.pack(">I", len(data))
            + tag
            + data
            + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
        )

    raw = bytearray()
    stride = width * 4
    for y in range(height):
        raw.append(0)
        raw.extend(rgba_bytes[y * stride : (y + 1) * stride])

    ihdr = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)
    idat = zlib.compress(bytes(raw), 9)
    png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", idat) + chunk(b"IEND", b"")
    with open(path, "wb") as f:
        f.write(png)


def write_ico_from_png(ico_path: str, png_path: str, size: int = 256) -> None:
    with open(png_path, "rb") as f:
        png_data = f.read()
    dim = 0 if size >= 256 else size
    header = struct.pack("<HHH", 0, 1, 1)
    entry = struct.pack("<BBBBHHII", dim, dim, 0, 0, 1, 32, len(png_data), 6 + 16)
    with open(ico_path, "wb") as f:
        f.write(header + entry + png_data)


def render_editin_logo(width: int, height: int, bg_rgba=(12, 13, 18, 255)) -> bytes:
    buf = bytearray(width * height * 4)
    br, bg, bb, ba = bg_rgba
    for i in range(0, len(buf), 4):
        buf[i] = br
        buf[i + 1] = bg
        buf[i + 2] = bb
        buf[i + 3] = ba

    s = min(width, height)
    cx = width / 2.0
    cy = height / 2.0
    icon_s = s * 0.56

    def blend(px: int, py: int, r: int, g: int, b: int, a: float) -> None:
        if px < 0 or py < 0 or px >= width or py >= height or a <= 0:
            return
        idx = (py * width + px) * 4
        inv = 1.0 - a
        buf[idx] = int(buf[idx] * inv + r * a)
        buf[idx + 1] = int(buf[idx + 1] * inv + g * a)
        buf[idx + 2] = int(buf[idx + 2] * inv + b * a)
        buf[idx + 3] = max(buf[idx + 3], int(255 * a))

    # Draw rounded-rect document + indigo-violet gradient accent
    doc_w = icon_s * 0.68
    doc_h = icon_s * 0.88
    left = cx - doc_w / 2.0
    top = cy - doc_h / 2.0
    radius = icon_s * 0.14

    x0 = max(0, int(left - 2))
    x1 = min(width, int(left + doc_w + 3))
    y0 = max(0, int(top - 2))
    y1 = min(height, int(top + doc_h + 3))

    for py in range(y0, y1):
        for px in range(x0, x1):
            dx = max(left + radius - px, 0.0, px - (left + doc_w - radius))
            dy = max(top + radius - py, 0.0, py - (top + doc_h - radius))
            dist = (dx * dx + dy * dy) ** 0.5 - radius
            if dist <= 0.5:
                t = ((px - left) / max(1.0, doc_w) + (py - top) / max(1.0, doc_h)) * 0.5
                r = int(99 * (1 - t) + 139 * t)
                g = int(102 * (1 - t) + 92 * t)
                b = int(241 * (1 - t) + 246 * t)
                alpha = min(1.0, max(0.0, 0.5 - dist))
                # Inner fill subtle, border bright
                if dist > -max(1.8, icon_s * 0.08):
                    blend(px, py, r, g, b, alpha)
                else:
                    blend(px, py, r, g, b, alpha * 0.22)

    # Draw 2 text lines inside document
    line_h = max(1.5, icon_s * 0.065)
    for idx_line, frac in enumerate([0.62, 0.42]):
        ly = top + doc_h * (0.34 + idx_line * 0.18)
        lx0 = left + doc_w * 0.22
        lx1 = left + doc_w * (0.22 + frac * 0.65)
        for py in range(max(0, int(ly - line_h)), min(height, int(ly + line_h + 1))):
            for px in range(max(0, int(lx0)), min(width, int(lx1))):
                blend(px, py, 224, 231, 255, 0.92)

    return bytes(buf)


targets = [
    ("build/appx/StoreLogo.png", 50, 50, (12, 13, 18, 255)),
    ("build/appx/Square44x44Logo.png", 44, 44, (12, 13, 18, 255)),
    ("build/appx/Square44x44Logo.targetsize-44_altform-unplated.png", 44, 44, (0, 0, 0, 0)),
    ("build/appx/Square150x150Logo.png", 150, 150, (12, 13, 18, 255)),
    ("build/appx/Square310x310Logo.png", 310, 310, (12, 13, 18, 255)),
    ("build/appx/Wide310x150Logo.png", 310, 150, (12, 13, 18, 255)),
    ("build/appx/SplashScreen.png", 620, 300, (12, 13, 18, 255)),
    ("resources/icons/icon.png", 256, 256, (12, 13, 18, 255)),
]

for path, w, h, bg in targets:
    write_png(path, w, h, render_editin_logo(w, h, bg))

write_ico_from_png("resources/icons/icon.ico", "resources/icons/icon.png", 256)
print("Generated all APPX & ICO assets successfully.")
