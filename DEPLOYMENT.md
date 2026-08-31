# GitHub Pages Deployment

This package is already built and GitHub-Pages-safe. Push the contents of this folder to the **root of the `main` branch**.

## Recommended deployment

1. Create or open your GitHub repository.
2. Put these files directly at repository root (do not wrap them in another folder).
3. Push to `main`.
4. In GitHub: **Settings → Pages → Build and deployment → Source → GitHub Actions**.
5. The included `.github/workflows/deploy-pages.yml` publishes the static app.

The site supports project URLs such as `https://USERNAME.github.io/REPOSITORY/` without hard-coding the repository name.

## Important

- `index.html` must be at repository root.
- Keep the `assets/` folder next to `index.html`.
- Do not rename hashed files inside `assets/`.
- `404.html` is required for refresh/direct navigation to routes such as `/scan`, `/settings`, and `/edit/...`.
