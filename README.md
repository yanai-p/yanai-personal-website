# Yanai Personnel

Multilingual static landing page for Yanai Personnel.

- Publish directory: `yanai-site/dist`
- No build step is required to serve the committed site.
- Local preview: `docker compose up -d --wait`, then http://localhost:4173/
- Tests: `cd yanai-site`, `npm ci`, `npm test`
- Rebuild translations after editing: `npm run build:locales`
- Handoff documentation: [yanai-site/README.md](yanai-site/README.md)

The contact form prepares a WhatsApp message; the visitor sends it in WhatsApp. No email backend or secrets are required.

## CI, releases and hosting

[`.github/workflows/pipeline.yml`](.github/workflows/pipeline.yml) runs only on this repository's self-hosted runner on the work PC (WSL `ci-runner`, labels `self-hosted, Linux, work-pc`). There is no GitHub-hosted fallback: while the PC is off, jobs wait in the queue.

- Pull request: `npm ci`, `npm test`, and a check that `dist/locales.js` matches `translations/`.
- Push to `main`: the same tests, then `yanai-site/dist` is deployed to GitHub Pages, the live site is checked, and a GitHub release `vX.Y.Z` is published with the site as a zip.
- Version bump, from commit messages since the last tag: `feat:` → minor, `type!:` or `BREAKING CHANGE` → major, anything else → patch.
- The live site reports its release at `/version.json`.
- The runner was added with `ci-add-runner m-eylon/yanai-personal-website 1` inside WSL `ci-runner`, like the other repositories on the PC.
