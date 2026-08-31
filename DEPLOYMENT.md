# GitHub Pages Deployment

This repository includes both editable source and a built static app. The workflow tests and rebuilds before deploying from **main**. Feature branches and pull requests do not deploy to the live site.

## Recommended deployment

1. Review and merge the implementation branch when ready.
2. In GitHub: **Settings → Pages → Build and deployment → Source → GitHub Actions**.
3. The included `.github/workflows/deploy-pages.yml` runs Node tests, builds, and publishes the static app. You can also start it manually from Actions after merging.
4. Open `https://DNG0101.github.io/document-scanner-web/` and perform device acceptance tests, especially camera permissions and downloads.

The workflow packages only the static app; it does not publish source, tests, the APK or backups. This follows the [official GitHub Pages workflow guidance](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

The site supports project URLs such as `https://USERNAME.github.io/REPOSITORY/` without hard-coding the repository name.

## Important

- `index.html` must be at repository root.
- Keep the `assets/` folder next to `index.html`; do not upload `node_modules`.
- Do not rename hashed files inside `assets/`.
- `404.html` is required for refresh/direct navigation to routes such as `/scan`, `/settings`, and `/edit/...`.
- Documents are browser-local. Moving to a new domain/browser does not transfer them: export a backup first, then restore it on the new origin.
- OCR initially downloads code/models from CDNs. Do not describe it as guaranteed fully offline.
