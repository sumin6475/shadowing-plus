#!/bin/sh
# Render the App Store creative assets to ../creative/ (PNG without alpha, plus a JPG copy).
#   header.png  3840 x 1646  product page header (21:9)
#   search.png  3840 x 2560  search result (3:2)
set -e
cd "$(dirname "$0")"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
OUT="../creative"
mkdir -p "$OUT" .png
shot() { # name width height
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
    --window-size="$2,$3" --virtual-time-budget=6000 --allow-file-access-from-files \
    --screenshot=".png/$1.png" "file://$PWD/creative/$1.html" >/dev/null 2>&1
  # App Store Connect refused header.jpg ("invalid file extension") on 2026-10-06
  # although the spec lists .jpg, so the PNG is the file to upload. It must
  # have no alpha channel, which Chrome's screenshot does: flatten to RGB.
  python3 -c "
from PIL import Image
im = Image.open('.png/$1.png').convert('RGB')
im.save('$OUT/$1.png', optimize=True)
im.save('$OUT/$1.jpg', quality=92)
"
  echo "$1 $(sips -g pixelWidth -g pixelHeight -g hasAlpha "$OUT/$1.png" | awk 'NR>1{printf "%s ", $2}') png $(du -h "$OUT/$1.png" | cut -f1) / jpg $(du -h "$OUT/$1.jpg" | cut -f1)"
}
shot header 3840 1646
shot search 3840 2560
