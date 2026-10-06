#!/bin/sh
# Render the App Store creative assets to ../creative/ (JPG, no alpha).
#   header.jpg  3840 x 1646  product page header (21:9)
#   search.jpg  3840 x 2560  search result (3:2)
set -e
cd "$(dirname "$0")"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
OUT="../creative"
mkdir -p "$OUT" .png
shot() { # name width height
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
    --window-size="$2,$3" --virtual-time-budget=6000 --allow-file-access-from-files \
    --screenshot=".png/$1.png" "file://$PWD/creative/$1.html" >/dev/null 2>&1
  sips -s format jpeg -s formatOptions 92 ".png/$1.png" --out "$OUT/$1.jpg" >/dev/null
  echo "$1 $(sips -g pixelWidth -g pixelHeight "$OUT/$1.jpg" | awk 'NR>1{printf "%s ", $2}') $(du -h "$OUT/$1.jpg" | cut -f1)"
}
shot header 3840 1646
shot search 3840 2560
