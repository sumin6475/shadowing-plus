// Resize the selected Saylo ribbon mark into the web/PWA icon set.

import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, "..", "public");
const SOURCE = join(PUBLIC_DIR, "brand", "saylo-mark.png");
const OUT_DIR = join(PUBLIC_DIR, "icons");
mkdirSync(OUT_DIR, { recursive: true });

const targets = [
  { name: "icon-192.png", size: 192 },
  { name: "icon-512.png", size: 512 },
  { name: "apple-touch-icon.png", size: 180 },
];

for (const target of targets) {
  await sharp(SOURCE)
    .resize(target.size, target.size, { fit: "cover" })
    .png()
    .toFile(join(OUT_DIR, target.name));
  console.log(`✓ ${target.name} (${target.size}×${target.size})`);
}
