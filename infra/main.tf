# WAF custom ruleset — three blocking rules scoped to waf-demo.andrewlass.com
resource "cloudflare_ruleset" "waf_demo" {
  zone_id     = var.zone_id
  name        = "WAF Demo Custom Rules"
  description = "Block XSS, SQLi, and path-traversal attacks for the WAF demo"
  kind        = "zone"
  phase       = "http_request_firewall_custom"

  rules = [
    {
      description = "Block XSS attempts"
      enabled     = true
      action      = "block"
      expression  = "(http.host eq \"waf-demo.andrewlass.com\") and (url_decode(http.request.uri.query) contains \"<script\" or url_decode(http.request.uri.query) contains \"javascript:\" or url_decode(http.request.uri.query) contains \"onerror=\" or url_decode(http.request.uri.query) contains \"onload=\")"
    },
    {
      description = "Block SQL injection attempts"
      enabled     = true
      action      = "block"
      expression  = "(http.host eq \"waf-demo.andrewlass.com\") and (lower(url_decode(http.request.uri.query)) contains \"' or '\" or lower(url_decode(http.request.uri.query)) contains \"union select\" or lower(url_decode(http.request.uri.query)) contains \"or '1'='1\")"
    },
    {
      description = "Block path traversal attempts"
      enabled     = true
      action      = "block"
      expression  = "(http.host eq \"waf-demo.andrewlass.com\") and (url_decode(http.request.uri.query) contains \"../\" or http.request.uri.query contains \"..%2f\" or http.request.uri.query contains \"..%2F\")"
    }
  ]
}

# DNS: proxied CNAME for the demo subdomain → Fly.io backend
resource "cloudflare_dns_record" "waf_demo" {
  zone_id = var.zone_id
  name    = "waf-demo"
  type    = "CNAME"
  content = var.fly_hostname
  proxied = true
  ttl     = 1
  comment = "WAF demo backend — proxied through CF WAF"
}

# Origin Rule: override SNI to lass-waf-demo.fly.dev so the TLS handshake
# succeeds (Fly's cert is *.fly.dev, not waf-demo.andrewlass.com).
resource "cloudflare_ruleset" "origin_sni_override" {
  zone_id = var.zone_id
  name    = "WAF Demo Origin Rules"
  kind    = "zone"
  phase   = "http_request_origin"

  rules = [
    {
      description = "Use Fly hostname as SNI for waf-demo origin"
      enabled     = true
      action      = "route"
      action_parameters = {
        origin = {
          host = var.fly_hostname
          port = 443
        }
        sni = {
          value = var.fly_hostname
        }
      }
      expression = "http.host eq \"waf-demo.andrewlass.com\""
    }
  ]
}

# Zone settings — apply to all of andrewlass.com
resource "cloudflare_zone_setting" "always_use_https" {
  zone_id    = var.zone_id
  setting_id = "always_use_https"
  value      = "on"
}

# Worker custom domains (andrewlass.com + www) are managed by wrangler.toml,
# not tofu — they are attached automatically on `npm run deploy`.
