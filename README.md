# Vocabulary Builder

An installable, local-first vocabulary trainer built with Expo Router and React Native Web. It runs as a Progressive Web App, so an iPhone can keep it on the Home Screen without an Apple Developer subscription or weekly re-signing.

## Features

- 7,360 built-in English vocabulary records across CEFR B1-C2
- Category and vocabulary-item management
- JSON import, preview, backup, and restore
- Library search and filters
- Source-to-translation and translation-to-source practice
- Optional examples, synonyms, and images
- Local browser storage with no account or backend
- Offline app shell and bundled lessons after the first successful load
- Prompted updates, so a new deployment does not replace the open app unexpectedly

## Local development

Requirements: Node.js 22 and npm.

```bash
npm install
npm run web
```

Run all checks:

```bash
npm run ci:check
```

Build and preview the production PWA:

```bash
npm run build:web
python3 -m http.server 4173 -d dist
```

Open `http://localhost:4173`. Localhost is treated as a secure context for service-worker testing.

## Install on iPhone

1. Open the deployed HTTPS URL in Safari.
2. Tap Share, then **Add to Home Screen**.
3. Enable **Open as Web App** if iOS shows the option, then tap **Add**.
4. Launch Vocabulary Builder from its Home Screen icon.

Open the app online once before relying on offline mode. The app shell, built-in seed, and attribution files are cached during service-worker installation. Remote image URLs require a network connection unless the browser happens to retain them in its normal HTTP cache.

## Data and updates

Vocabulary and settings stay in IndexedDB on the current browser profile. Browser storage is not a backup: export JSON periodically, especially before clearing Safari website data or moving to another phone.

When a deployment installs in the background, the current app keeps running and asks before reloading into the new version. Updating the app does not clear IndexedDB.

## Deploy to Vercel

No backend, environment variables, static IP, or VPN is required.

1. Import this repository into Vercel.
2. Keep the build settings from `vercel.json`: `npm run build:web` and output directory `dist`.
3. Deploy, then open the HTTPS production URL in Safari and follow the installation steps above.

`vercel.json` prevents browsers from pinning an old service worker. Expo Router exports static HTML, so no SPA rewrite is needed.

## Dataset and licensing

The deployable seed lives in `public/data/seed/all.json`. Its source and media provenance are kept under [`public/data/seed/attribution`](public/data/seed/attribution). The large research caches and downloaded media corpus are intentionally excluded.

## Project structure

```text
app/                 Expo Router routes and root HTML
components/          Shared UI primitives
features/            Admin, library, home, and practice screens
lib/                 IndexedDB, storage, domain, and utility code
public/              PWA manifest, icons, seed, and attribution
workbox-config.cjs   Offline precache policy
vercel.json          Static deployment and response headers
```
