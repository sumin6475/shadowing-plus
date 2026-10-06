#!/bin/sh
# Render every frame in frames/ to ../1206x2622/<name>.jpg (1206 x 2622, no alpha).
#   ./render.sh            all frames
#   ./render.sh 01-phrases one frame
# Needs Google Chrome. Output is a JPG because App Store Connect rejects alpha.
set -e
cd "$(dirname "$0")"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
OUT="../1206x2622"
mkdir -p "$OUT" .png
for f in frames/${1:-*}.html; do
  n=$(basename "$f" .html)
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
    --window-size=1206,2622 --virtual-time-budget=4000 --allow-file-access-from-files \
    --screenshot=".png/$n.png" "file://$PWD/$f" >/dev/null 2>&1
  sips -s format jpeg -s formatOptions 92 ".png/$n.png" --out "$OUT/$n.jpg" >/dev/null
  echo "$n $(sips -g pixelWidth -g pixelHeight "$OUT/$n.jpg" | awk 'NR>1{printf "%s ", $2}')"
done
