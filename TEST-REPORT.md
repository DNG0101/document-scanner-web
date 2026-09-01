# Verification report — 2026-09-01

## Automated checks

`npm test`: **80 passed, 0 failed**.

- Sequential and overlapping edits, batch OCR persistence, failed-save rollback, queue recovery, flush error reporting and review invalidation.
- Stable page IDs, duplicate independence, merge/extraction behavior, reordering bounds and last-page protection.
- Page ranges, crop geometry, CSV escaping/formula safety and backup validation.
- Real PDF generation across paper/orientation/numbering combinations; AES-256 encryption, Unicode searchable layers, ID layouts, cancellation and failures.
- Lossless page-copy organizer ordering/rotation/overlays, encrypted-input rejection, 200-page bounds, PPTX package relationships, region geometry and metadata-safe backup restore.
- Undo/redo ordering, failed-save retry, bounded history, OCR invalidation and rotation-aware signature coordinates.

`npm run build`: passed. Produces a content-hashed application bundle and versioned service worker; GitHub Pages worker paths are relative to the deployed bundle.

## Real-browser integration

`tests/integration.html`: **38 passed, 0 failed** in the Codex Chromium browser.

- 24 paper × orientation × searchable × password combinations rendered and text-extracted.
- Wrong-password retry, password cancellation, Unicode text, ID front/back, organizer preservation and actual-PDF printing.
- Image geometry, crop rejection, pixel-changing ink/watermarks, PDF round trip and IndexedDB persistence.

## UI checks

The editor was exercised with synthetic pages only. Review stayed disabled after page one, enabled after every PDF page rendered, saved, then invalidated after changing ID layout. A password-protected ID preview rendered as one A4 page. Region OCR read the selected rectangle. GitHub CI now reruns the 38 checks plus review flow at 1280 px and 390 px and uploads screenshots.

`npm audit` and `npm audit --omit=dev`: **0 known vulnerabilities**. The vulnerable slide dependency was removed and replaced with the repository's own minimal image-slide Open XML writer.

No real user documents were used for testing. Existing account repositories and the supplied APK were read; the APK was not executed.

## Limitations

Passing the defined suite is not proof of every possible input/device. Physical cameras, native share sheets, arbitrary malformed/vendor PDFs, complex OCR layouts, Office interoperability, offline model availability and non-Chromium browsers remain acceptance items. See `FEATURE-COVERAGE.md` for explicit boundaries.
