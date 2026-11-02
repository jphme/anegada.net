# anegada.net

Static one-page website of Anegada UG (haftungsbeschränkt) — a home page with the
wordmark and a single sentence, plus an imprint / contact page (§ 5 DDG).
Plain HTML and CSS: no framework, no build step and no external requests of any
kind. The only script is `assets/logo-particles.js`, a small canvas intro that
builds the wordmark from coloured dots (skipped with "reduce motion"; without it
the SVG logo shows as before), so the privacy statement on the imprint page stays true.

Run it locally: `uv run python -m http.server 8765` and open <http://localhost:8765/>.
Deployment to GitHub Pages and the Cloudflare DNS records are documented in [DEPLOY.md](DEPLOY.md).
