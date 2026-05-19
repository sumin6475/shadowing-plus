// One-shot SVG → PNG generator for PWA icons.
// Run with `npm run icons`. Outputs to web/public/icons/.
//
// To swap in a real logo: replace the SVG template below and re-run.

import { Resvg } from "@resvg/resvg-js";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "public", "icons");
mkdirSync(OUT_DIR, { recursive: true });

const BG = "#fbf9f4";      // warm cream
const ACCENT = "#3B6EE1";  // cobalt
const TEXT_DIM = "#7c6f5f";

// Build an SVG sized to `size` pixels. Maskable: keep the mark inside the safe
// inner circle (≈ 80% of the canvas) so Android adaptive cropping doesn't
// chop the "S+".
function svgTemplate(size, { rounded = true } = {}) {
  const radius = rounded ? size * 0.22 : 0;
  const sFontSize = size * 0.6;
  const sX = size * 0.5;
  const sY = size * 0.5 + sFontSize * 0.34;
  const plusSize = size * 0.22;
  const plusX = sX + sFontSize * 0.26;
  const plusY = sY - sFontSize * 0.45;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect x="0" y="0" width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="${BG}"/>
  <text x="${sX}" y="${sY}"
        font-family="Instrument Serif, Iowan Old Style, Baskerville, serif"
        font-size="${sFontSize}"
        font-style="italic"
        text-anchor="middle"
        fill="${TEXT_DIM}">S</text>
  <text x="${plusX}" y="${plusY}"
        font-family="ui-sans-serif, system-ui, sans-serif"
        font-size="${plusSize}"
        font-weight="600"
        text-anchor="start"
        fill="${ACCENT}">+</text>
</svg>`;
}

function render(svg, sizePx) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: sizePx },
    background: BG,
    font: {
      // Resvg falls back to its built-in font when system fonts are unresolved.
      // The placeholder text still renders; real logo file will replace this.
      loadSystemFonts: true,
      defaultFontFamily: "serif",
    },
  });
  return resvg.render().asPng();
}

const targets = [
  { name: "icon-192.png", size: 192, rounded: true },
  { name: "icon-512.png", size: 512, rounded: true },
  // apple-touch-icon: iOS does its own rounding, so render square.
  { name: "apple-touch-icon.png", size: 180, rounded: false },
];

for (const t of targets) {
  const svg = svgTemplate(t.size, { rounded: t.rounded });
  const png = render(svg, t.size);
  writeFileSync(join(OUT_DIR, t.name), png);
  console.log(`✓ ${t.name} (${t.size}×${t.size})`);
}
