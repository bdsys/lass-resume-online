output "demo_hostname" {
  description = "Hostname for the WAF-protected demo backend"
  value       = var.demo_hostname
}

output "waf_ruleset_id" {
  description = "ID of the WAF custom ruleset"
  value       = cloudflare_ruleset.waf_demo.id
}
