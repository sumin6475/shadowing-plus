# Shadowing Plus — private founder phrase-capture extension

This is an unpacked, desktop-Chrome experiment for the founder's own learning workflow. It does not download media or support Netflix. It is **not** a public product feature, Chrome Web Store commitment, or dependency of the mobile MVP.

## Load it locally

1. In Chrome, open `chrome://extensions`, enable **Developer mode**, then choose **Load unpacked** and select this `extension/` folder.
2. Copy the extension ID shown by Chrome and set `EXTENSION_ALLOWED_ORIGIN=chrome-extension://<that-id>` in `web/.env.local` and the deployed app environment.
3. Start the web app, open the extension's **Details → Extension options**, enter the app URL, and choose **기존 계정 연결**. Sign in to Shadowing Plus in Chrome's protected authentication window.
4. Open a YouTube watch page, enable captions, and play the video. The panel reads the captions currently rendered by YouTube, translates them after the account connection, and saves selected sentences to the same Shadowing Plus bookmark queue.

The extension ID changes if you remove/reload an unpacked extension. A Chrome Web Store build must use a fixed ID/origin and update `EXTENSION_ALLOWED_ORIGIN` accordingly.
