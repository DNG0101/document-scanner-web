# Papertrail document scanner

A private, static document scanner for GitHub Pages. Images, edits and OCR results are stored in this browser's IndexedDB. No application server or account is required.

## Develop and verify

Use Node.js 22 or newer:

```sh
npm ci
npm test
npm run build
npx playwright install chromium
npm run test:browser
npm start
```

Open `http://localhost:4173/document-scanner-web/`. To run the real-browser rendering/storage checks, open `/document-scanner-web/tests/integration.html` and click **Run checks**. These checks create and remove only their own temporary document.

`src/legacy-app.js` was recovered by formatting the original published JavaScript bundle, because the repository did not contain the original React source. New behavior is maintained in the separate store, document, PDF, print, advanced UI, and enhancement modules under `src/`. Rollup rebuilds the browser bundle. Do not edit generated `assets/app-*.js` files directly.

## Tools

Camera capture; drop/paste and password-protected image/PDF import; automatic/manual perspective crop; filters; rotation-aware signatures; page duplication, ordering, extraction and book splitting; collage, long images and true-size ID sheets; local full-page and region OCR; searchable/AES-256 PDF, image, ZIP, TXT, CSV, DOCX and PPTX export; PDF merge/extract/reorder/rotate without rasterization; print, export-accurate preview and page-by-page review; undo/redo; redacted copies; library organization; backup/restore; versioned offline shell.

Use **Preview edits** to see corrected page geometry in the editor, or **Preview & review PDF** to inspect the actual exported PDF. Any document mutation invalidates its reviewed status. Drawing is performed on corrected page coordinates. Raw image crop controls are separate from the corrected preview.

See [FEATURE-COVERAGE.md](FEATURE-COVERAGE.md) for APK comparison and limitations, [TEST-REPORT.md](TEST-REPORT.md) for verification, and [DEPLOYMENT.md](DEPLOYMENT.md) for GitHub Pages setup.

## Privacy and limits

Documents remain local unless you explicitly export/share them. OCR code and selected language models may download from third-party CDNs on first use; OCR runs locally. Browser storage can be cleared or evicted: download backups regularly and keep them private. Backups are not encrypted. A signature is a drawn image, not a cryptographic digital signature.
