# infra/

OpenTofu configuration for the WAF demo infrastructure on Cloudflare.

Manages:
- WAF custom ruleset on the `andrewlass.com` zone (XSS, SQLi, path-traversal rules scoped to `waf-demo.andrewlass.com`)
- DNS CNAME for `waf-demo.andrewlass.com` → Fly.io backend (proxied through Cloudflare WAF)
- Worker custom domains for `andrewlass.com` and `www.andrewlass.com`

## Prerequisites

### OpenTofu

```bash
# macOS
brew install opentofu

# Linux
curl -fsSL https://get.opentofu.org/install-opentofu.sh | sh
```

### Cloudflare API token

Create a token at **dash.cloudflare.com → My Profile → API Tokens → Create Token** with these permissions:

| Resource | Permission |
|---|---|
| Zone — DNS | Edit |
| Zone — Firewall Services (WAF) | Edit |
| Zone — Workers Routes | Edit |
| Account — Workers Scripts | Edit |

Scope the token to the `andrewlass.com` zone.

### Account ID and Zone ID

Both appear in the right-hand sidebar of any zone overview page in the Cloudflare dashboard:

- **Account ID** — listed under your account name
- **Zone ID** — listed under the domain name

## Usage

```bash
cd infra

# 1. Create your tfvars file (gitignored — never commit it)
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars and fill in real values

# 2. Initialize
tofu init

# 3. Preview changes
tofu plan

# 4. Apply
tofu apply
```

> **Warning:** `terraform.tfvars` is gitignored. Never commit it — it contains your API token.

## Verification

After `tofu apply`, confirm the WAF rules are live:

```bash
# Should return HTTP 200 (clean request)
curl -si https://waf-demo.andrewlass.com/health | head -1

# Should return HTTP 403 (WAF blocks XSS)
curl -si "https://waf-demo.andrewlass.com/search?q=<script>alert(1)</script>" | head -1

# Should return HTTP 403 (WAF blocks SQLi)
curl -si "https://waf-demo.andrewlass.com/search?q=' OR '1'='1" | head -1

# Should return HTTP 403 (WAF blocks path traversal)
curl -si "https://waf-demo.andrewlass.com/search?q=../../etc/passwd" | head -1
```

## State backend

State is stored locally by default (`terraform.tfstate`). To migrate to Cloudflare R2:

1. Create an R2 bucket named `lass-tofu-state` in the CF dashboard
2. Create an R2 S3 API token (Account → R2 → Manage R2 API Tokens)
3. Uncomment the `backend "s3"` block in `backend.tf` and fill in your account ID and R2 credentials
4. Run `tofu init -migrate-state`

See `backend.tf` for the full commented-out configuration.
