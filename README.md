# Papertrail document scanner

A private, static document scanner for GitHub Pages. Images, edits and OCR results are stored in this browser's IndexedDB. No application server or account is required.

## Develop and verify

Use Node.js 22 or newer:

```sh
npm ci
npm test
npm run build
npm start
```

Open `http://localhost:4173/document-scanner-web/`. To run the real-browser rendering/storage checks, open `/document-scanner-web/tests/integration.html` and click **Run checks**. These checks create and remove only their own temporary document.

`src/legacy-app.js` was recovered by formatting the original published JavaScript bundle, because the repository did not contain the original React source. It still includes third-party library code. New modules are maintained separately in `src/store.js`, `src/document-tools.js`, and `src/enhancements.js`. Rollup rebuilds the browser bundle. Do not edit generated `assets/app-*.js` files directly.

## Tools

Camera capture; image/PDF import; automatic and manual perspective crop; filters; rotation; signatures; page duplication, ordering, extraction and book splitting; collage and long images; local single-page and batch OCR; PDF/image/ZIP/TXT/CSV/DOCX/PPTX export; export-accurate PDF preview, zoom and review status; library search, folders, tags, favorites, archive and trash; backup/restore; versioned offline shell.

Use **Preview edits** to see corrected page geometry in the editor, or **Preview & review PDF** to inspect the actual exported PDF. Any document mutation invalidates its reviewed status. Drawing is performed on corrected page coordinates. Raw image crop controls are separate from the corrected preview.

See [FEATURE-COVERAGE.md](FEATURE-COVERAGE.md) for APK comparison and limitations, [TEST-REPORT.md](TEST-REPORT.md) for verification, and [DEPLOYMENT.md](DEPLOYMENT.md) for GitHub Pages setup.

## Privacy and limits

Documents remain local unless you explicitly export/share them. OCR code and selected language models may download from third-party CDNs on first use; OCR runs locally. Browser storage can be cleared or evicted: download backups regularly and keep them private. Backups are not encrypted. A signature is a drawn image, not a cryptographic digital signature.
