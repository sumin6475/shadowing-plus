#!/usr/bin/env python3
"""Put a frame's screen next to a reference screenshot.

  ./compare.py 01-phrases ../raw/01-phrases.png [out.jpg]

Renders frames/<name>.html?bare (the screen alone, 1206 x 2622) and writes a
side-by-side image: reference left, redraw right, both 603 px wide.
"""
import subprocess, sys, os
from PIL import Image

here = os.path.dirname(os.path.abspath(__file__))
name, ref = sys.argv[1], sys.argv[2]
out = sys.argv[3] if len(sys.argv) > 3 else os.path.join(here, ".png", f"{name}-compare.jpg")
os.makedirs(os.path.join(here, ".png"), exist_ok=True)
bare = os.path.join(here, ".png", f"{name}-bare.png")
subprocess.run([
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "--headless=new", "--disable-gpu",
    "--hide-scrollbars", "--force-device-scale-factor=1", "--window-size=1206,2622",
    "--virtual-time-budget=4000", "--allow-file-access-from-files", f"--screenshot={bare}",
    f"file://{here}/frames/{name}.html?bare",
], check=True, capture_output=True)
a = Image.open(ref).convert("RGB").resize((603, 1311))
b = Image.open(bare).convert("RGB").resize((603, 1311))
canvas = Image.new("RGB", (603 * 2 + 12, 1311), (255, 0, 120))
canvas.paste(a, (0, 0)); canvas.paste(b, (615, 0))
canvas.save(out, quality=88)
print(out)
