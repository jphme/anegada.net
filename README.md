# anegada.net

Static one-page website of Anegada UG (haftungsbeschränkt) — a home page with the
wordmark and a single sentence, plus an imprint / contact page (§ 5 DDG).
Plain HTML and CSS: no framework, no build step, no JavaScript, and no external
requests of any kind, so the privacy statement on the imprint page stays true.

Run it locally: `uv run python -m http.server 8765` and open <http://localhost:8765/>.
Deployment to GitHub Pages and the Cloudflare DNS records are documented in [DEPLOY.md](DEPLOY.md).
