# Myne site

Static marketing + legal site for the Myne iPhone app: `/`, `/support`, `/privacy`, `/terms`. Plain HTML and one stylesheet; no build step and no third-party requests. Fonts are the app's own (Instrument Serif, Pretendard), subset to Latin in `assets/fonts/`. The design rules (color, type, radius, depth) are written at the top of `styles.css`.

Deploys as its own Vercel project (`myne`), separate from the web app in `web/`. Not connected to git, so pushing to main does not deploy it:

    cd apps/myne-site && npx vercel --prod

The iPhone app links here (`apps/mobile/src/lib/legal.ts`), and the App Store listing uses these URLs. When the app changes what data it handles, update `privacy/index.html` and its date.
