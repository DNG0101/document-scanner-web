# Verification report — 2026-08-31

## Automated checks

`npm test`: **34 passed, 0 failed**.

- Sequential and overlapping edits, batch OCR persistence, failed-save rollback, queue recovery, flush error reporting and review invalidation.
- Stable page IDs, duplicate independence, merge/extraction behavior, reordering bounds and last-page protection.
- Page ranges, crop geometry, CSV escaping/formula safety and backup validation.
- PDF page count, byte-accurate xref offsets, image placement and empty-document rejection.

`npm run build`: passed. Produces a content-hashed application bundle and versioned service worker; GitHub Pages worker paths are relative to the deployed bundle.

## Real-browser integration

`tests/integration.html`: **8 passed, 0 failed** in the Codex Chromium browser.

1. Full-image rendered dimensions.
2. Rotation swaps dimensions.
3. Perspective crop dimensions.
4. Invalid crop rejection.
5. Watermark changes actual output pixels.
6. Ink changes actual output pixels.
7. Two-page PDF export and re-import through the actual PDF worker.
8. IndexedDB persistence through a separate database connection.

## UI checks

Synthetic test image imported into the existing interface. PDF preview rendered visually with no renderer errors. Page duplication, collage creation and book splitting succeeded. Batch OCR recognized “SCANNER TEST / Invoice 12345”; text remained after reload. Word and slide export actions completed successfully. The generated Office files were not opened in Microsoft Office, so Office interoperability is not claimed. Crop slider overflow was identified through DOM geometry and corrected. The preview supports the same crop, ink, watermark, paper size and orientation as export because it renders the exported PDF itself.

No real user documents were used for testing. Existing account repositories and the supplied APK were read; the APK was not executed.

## Limitations

This report is not a claim that every possible test passes. Physical camera/device permissions, native sharing, arbitrary PDFs, encrypted PDFs, complex OCR layouts, every export in external viewers, offline model availability and all browser/device combinations remain acceptance-test items. Phone viewport emulation did not take effect in the available browser; mobile testing remains outstanding. See FEATURE-COVERAGE.md for intentionally unimplemented modules.
