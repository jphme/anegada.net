# Deploying anegada.net

Target: GitHub Pages in the repository `jphme/anegada.net`, custom domain `anegada.net`,
with `anegada.eu` redirecting to it via Cloudflare.

All GitHub IP addresses and REST API fields below were checked against the current
GitHub documentation on **20 September 2026**
([DNS records](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site),
[Pages REST API](https://docs.github.com/en/rest/pages/pages),
[domain verification](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/verifying-your-custom-domain-for-github-pages)).

---

## 1. One-click path

`deploy.sh` in this folder does everything on the GitHub side. From inside the site folder:

```bash
gh auth status          # must be logged in as jphme
./deploy.sh
```

It runs these steps, which you can also issue by hand:

```bash
# create the public repo from this folder and push main
gh repo create jphme/anegada.net --public --source=. --remote=origin --push

# enable Pages: build from branch main, root folder
gh api -X POST repos/jphme/anegada.net/pages \
  -f build_type=legacy \
  -f "source[branch]=main" \
  -f "source[path]=/"

# set the custom domain
gh api -X PUT repos/jphme/anegada.net/pages -f cname=anegada.net

# enforce HTTPS — only works once the certificate has been issued
gh api -X PUT repos/jphme/anegada.net/pages -F https_enforced=true
```

**Note on HTTPS:** GitHub can only switch on "Enforce HTTPS" after Let's Encrypt has
issued the certificate for the custom domain, which requires the DNS records in step 2
to resolve. That usually takes a few minutes and occasionally up to 24 hours. Until then
the last call returns an error. `deploy.sh` retries it every 60 seconds for 20 minutes and,
if it still fails, prints the single command to re-run later.

The repository already contains `CNAME` (`anegada.net`) and `.nojekyll`, so the domain
survives re-deployments and the files are served verbatim without Jekyll processing.

---

## 2. Cloudflare DNS for anegada.net

Create these in the Cloudflare dashboard under **DNS → Records** for the zone `anegada.net`.

### A records (apex, `@`)

| Type | Name | Content | Proxy |
|---|---|---|---|
| A | `@` | `185.199.108.153` | DNS only |
| A | `@` | `185.199.109.153` | DNS only |
| A | `@` | `185.199.110.153` | DNS only |
| A | `@` | `185.199.111.153` | DNS only |

### AAAA records (apex, `@`)

| Type | Name | Content | Proxy |
|---|---|---|---|
| AAAA | `@` | `2606:50c0:8000::153` | DNS only |
| AAAA | `@` | `2606:50c0:8001::153` | DNS only |
| AAAA | `@` | `2606:50c0:8002::153` | DNS only |
| AAAA | `@` | `2606:50c0:8003::153` | DNS only |

### www

| Type | Name | Content | Proxy |
|---|---|---|---|
| CNAME | `www` | `jphme.github.io` | DNS only |

Note the target is `jphme.github.io` — the account, **without** the repository name.

**Keep the grey cloud ("DNS only") until GitHub has issued the certificate.** A proxied
(orange cloud) record hides the origin from Let's Encrypt and the certificate stays
pending. Afterwards, proxying is optional; if you turn it on, set **SSL/TLS → Overview →
encryption mode** to **Full** (not "Flexible", which would cause a redirect loop).

### Domain verification (recommended)

Verifying the domain stops anyone else from ever attaching `anegada.net` to their
repository. In GitHub under **Settings → Pages → verified domains** (account settings),
add `anegada.net`; GitHub then shows a TXT record:

| Type | Name | Content |
|---|---|---|
| TXT | `_github-pages-challenge-jphme` | *(the token GitHub displays — copy it from that page)* |

The value is generated per domain and account; it must be copied from GitHub, it cannot
be guessed. In Cloudflare enter the name without the domain suffix
(`_github-pages-challenge-jphme`); Cloudflare appends `.anegada.net` itself.

---

## 3. Redirecting anegada.eu → anegada.net

> **Status 23.09.2026:** anegada.eu already sends a Cloudflare redirect (302) to the old Notion page
> `https://jph1.notion.site/Anegada-47404ba8279641e0804f6cf35ce46eac`, and the zone already has proxied
> A/AAAA records for `@` and `www`. So you do **not** need the placeholder records below: find the existing
> rule (Rules → Overview in the anegada.eu zone; it may be a Redirect Rule, a Page Rule or a Bulk Redirect)
> and change its target to anegada.net as described. Mail for jan@anegada.eu runs through Cloudflare Email
> Routing (MX `route1-3.mx.cloudflare.net`, SPF TXT); leave those records alone. anegada.net itself has
> Google Workspace mail records (MX `smtp.google.com`, SPF and google-site-verification TXT); leave those too.

Cloudflare can only run a Redirect Rule on a hostname that resolves through its proxy, so
the zone `anegada.eu` needs proxied placeholder records first. The addresses are reserved
documentation addresses that are never actually contacted — the proxy answers before that.

### Placeholder records in the zone `anegada.eu`

| Type | Name | Content | Proxy |
|---|---|---|---|
| A | `@` | `192.0.2.1` | **Proxied** (orange cloud) |
| AAAA | `@` | `100::` | **Proxied** (orange cloud) |
| CNAME | `www` | `anegada.eu` | **Proxied** (orange cloud) |

> ⚠️ **Do not touch the MX and TXT records of `anegada.eu`.** The address
> `jan@anegada.eu` receives mail through that zone; removing or re-pointing the MX
> records (or the SPF/DKIM/DMARC TXT records) would silently break incoming mail.
> Only add the three records above.

### Redirect Rule

**Rules → Redirect Rules → Create rule** in the `anegada.eu` zone:

- **Name:** `anegada.eu → anegada.net`
- **When incoming requests match:** Custom filter expression

  ```
  (http.host eq "anegada.eu") or (http.host eq "www.anegada.eu")
  ```

- **Then:** Dynamic redirect
- **Expression:**

  ```
  concat("https://anegada.net", http.request.uri.path)
  ```

- **Status code:** `301` (Permanent Redirect)
- **Preserve query string:** ✅ on

(The free plan includes one Bulk Redirect list as an alternative, but a single Redirect
Rule is simpler and keeps the path.)

---

## 4. Verifying

```bash
# DNS
dig +short anegada.net A
dig +short anegada.net AAAA
dig +short www.anegada.net CNAME
dig +short TXT _github-pages-challenge-jphme.anegada.net

# the site itself
curl -I https://anegada.net/
curl -I https://anegada.net/imprint.html
curl -sI http://anegada.net/ | head -1        # expect 301 to https

# www and the .eu redirect
curl -sI https://www.anegada.net/ | grep -i '^location'
curl -sI https://anegada.eu/ | grep -iE '^(HTTP|location)'
curl -sI https://anegada.eu/imprint.html | grep -i '^location'   # path must be preserved

# 404 page
curl -sI https://anegada.net/nope | head -1   # expect 404
```

Expected: `https://anegada.net/` returns `200`, `https://anegada.eu/` returns `301` with
`location: https://anegada.net/`.

### Typical timings

| Step | Usual | Worst case |
|---|---|---|
| Cloudflare DNS record live | under 1 minute (Cloudflare's TTL is short) | 5 minutes |
| GitHub Pages first build | 1–2 minutes | 10 minutes |
| Let's Encrypt certificate for the custom domain | 5–15 minutes | 24 hours |
| "Enforce HTTPS" becomes settable | right after the certificate | 24 hours |
| Redirect Rule active | immediately | 1 minute |

If the certificate seems stuck, open **Settings → Pages**, remove the custom domain, save,
re-enter `anegada.net` and save again — that re-triggers the certificate request.
