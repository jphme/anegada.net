#!/usr/bin/env bash
# One-click deployment of anegada.net to GitHub Pages.
# Creates the public repo jphme/anegada.net from this folder, pushes main,
# enables Pages from branch main / root, sets the custom domain and turns on
# HTTPS enforcement (retrying until GitHub has issued the certificate).
#
# Requires: gh (authenticated: `gh auth status`), git.
# Run from inside the site folder:  ./deploy.sh

set -euo pipefail

REPO="jphme/anegada.net"
DOMAIN="anegada.net"

cd "$(dirname "$0")"

command -v gh >/dev/null || { echo "gh is not installed. brew install gh"; exit 1; }
gh auth status >/dev/null || { echo "gh is not authenticated. Run: gh auth login"; exit 1; }

# --- 1. repo + push ---------------------------------------------------------
if gh repo view "$REPO" >/dev/null 2>&1; then
  echo "==> $REPO already exists, pushing main"
  git remote get-url origin >/dev/null 2>&1 || git remote add origin "https://github.com/$REPO.git"
  git push -u origin main
else
  echo "==> Creating $REPO and pushing main"
  gh repo create "$REPO" --public --source=. --remote=origin --push
fi

# --- 2. enable GitHub Pages from branch main, root --------------------------
echo "==> Enabling GitHub Pages (branch main, path /)"
gh api -X POST "repos/$REPO/pages" \
  -f build_type=legacy \
  -f "source[branch]=main" \
  -f "source[path]=/" \
  || echo "   (Pages already enabled — continuing)"

# --- 3. custom domain -------------------------------------------------------
echo "==> Setting custom domain $DOMAIN"
gh api -X PUT "repos/$REPO/pages" -f cname="$DOMAIN"

# --- 4. HTTPS enforcement ---------------------------------------------------
# GitHub can only enforce HTTPS once the Let's Encrypt certificate for the
# custom domain has been issued. That needs the DNS records from DEPLOY.md to
# resolve first and usually takes a few minutes, occasionally up to 24 hours.
echo "==> Waiting for the TLS certificate, then enforcing HTTPS"
for attempt in $(seq 1 20); do
  if gh api -X PUT "repos/$REPO/pages" -F https_enforced=true >/dev/null 2>&1; then
    echo "    HTTPS enforcement is on."
    exit 0
  fi
  echo "    attempt $attempt/20: certificate not ready yet, retrying in 60s ..."
  sleep 60
done

cat <<EOF

    Could not enable HTTPS enforcement yet — the certificate is still pending.
    This is normal while DNS is propagating. Re-run just this step later:

      gh api -X PUT repos/$REPO/pages -F https_enforced=true

    or tick "Enforce HTTPS" under
    https://github.com/$REPO/settings/pages
EOF
