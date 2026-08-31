# APK-to-web feature coverage

Reference: user-provided `base (3).apk`, 92,002,511 bytes. Compared by inspecting APK archive entries/resource names and the existing website code. The APK was not installed or executed; resource names establish likely modules, not a complete behavioral specification. No APK code, proprietary visual assets, credentials or documents were copied into the web application.

## Implemented or retained locally

| APK module / task | Web behavior |
| --- | --- |
| Scan / gallery | Existing camera capture and JPEG/PNG/WebP imports retained; corrupt images rejected; PDFs expanded into images; mixed-file order preserved. |
| Crop and enhancement | Perspective crop, edge detection, rotation, brightness, contrast and scan finishes. Invalid/crossed crops rejected. Full-image reset and apply finish to all pages added. |
| Review / preview | Corrected page preview and actual exported PDF preview, page navigation, zoom, fit, download and persisted review status. Document edits invalidate review. |
| Document organization | Existing folders, tags, search, favorites, archive, trash, duplicate and merge retained. |
| Page operations | Duplicate/delete/reorder, extract selected ranges as a new document, split facing book pages. Originals retained for extraction/splitting. |
| Collage / long image | Compose selected corrected pages into a new collage or vertical image. Guards reject overlarge compositions instead of clipping pages. |
| ID sheet | Collage can combine ID front/back images. It does not certify official ID/passport photo dimensions or compliance. |
| Signature | Existing signature extraction and drawing retained; drawing now uses corrected coordinates and redraws on resize. Not a digital signing certificate. |
| Annotation | Add a text strip to the page, preserving an unchanged page copy. Existing freehand ink and watermark retained. |
| OCR | Local single-page/batch OCR, recognition of corrected image, persistent editable text and library text search. Sequential storage prevents earlier results being overwritten. |
| PDF / compression | Image-based PDF export; A4/Letter/Legal, orientation and JPEG quality settings. Images are centered on paper. Image-only PDF import/export does not preserve original vector objects, forms or text layers. |
| Image / ZIP | Existing single-page JPEG export plus selected-page JPEG ZIP export. |
| Word | Real DOCX file containing editable OCR paragraphs. Does not reconstruct complex original layout. |
| Spreadsheet | CSV from OCR text, inferring columns from tabs/multiple spaces; protects against spreadsheet formula injection. Does not reconstruct arbitrary table structure or formulas. |
| Presentation | Real PPTX with a corrected image on each slide. Original slide elements are not independently editable. |
| QR | Native BarcodeDetector retained; bundled QR-only fallback added where native detection is unavailable. Other barcode formats depend on native support. |
| Backup | Download/restore validated JSON backups; restore creates copies and preserves existing documents. |
| Offline / installation | Versioned app shell, local PDF worker, relative project routes and manifest. OCR may require a network connection for models/runtime. PWA installation depends on browser support. |

## Not equivalent / remaining work

- PDF password encryption/decryption UI, searchable text-layer PDFs, true PDF text/object editing and full document-layout reconstruction are **not implemented**. Some are technically feasible in a browser but require additional focused implementation and security/interoperability testing.
- Automatic translation, cloud sync, multi-user collaboration, public share links, fax, subscriptions and cloud AI services are **not implemented**. They require a service or separately provisioned local models and, where appropriate, user accounts/credentials. GitHub Pages alone does not supply those services.
- Capture modes such as translation, evidence, certificate, presentation, spreadsheet and restoration may provide capture guidance/basic processing inherited from the old app; the mode label itself does not imply semantic extraction, AI restoration, certified evidence, translation or cloud functionality.
- No claim of complete APK parity, perfect OCR, universal test coverage or guaranteed behavior on every device. Handwriting, skewed/blurred images and complex layouts need human review.
- Physical camera permissions/switching, native device sharing/printing, Safari/iOS/Firefox behavior and installed/offline PWA behavior still need device acceptance testing. The browser viewport override did not produce a real phone viewport in this environment, so mobile validation is not claimed.

## Processing boundaries

Images: up to 25 MB each and 50 megapixels on import. PDF: up to 200 pages. Rendering: longest input dimension reduced to 1800 pixels, perspective output capped at 2400 pixels. Long-image composition: limited to 16,000 pixels tall, with an additional area bound for new composition tools. Backup import: 150 MB, 500 documents, 500 pages per document. These are resource protections, not performance guarantees for every device.
