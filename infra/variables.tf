variable "cloudflare_api_token" {
  description = "Cloudflare API token with Zone:DNS:Edit, Zone:WAF:Edit"
  type        = string
  sensitive   = true
}

variable "account_id" {
  description = "Cloudflare account ID"
  type        = string
}

variable "zone_id" {
  description = "Cloudflare zone ID for andrewlass.com"
  type        = string
}

variable "fly_hostname" {
  description = "Fly.io hostname for the WAF demo backend"
  type        = string
  default     = "lass-waf-demo.fly.dev"
}

variable "demo_hostname" {
  description = "Public hostname for the WAF-protected demo endpoint"
  type        = string
  default     = "waf-demo.andrewlass.com"
}

variable "worker_name" {
  description = "Cloudflare Worker service name for the portfolio"
  type        = string
  default     = "lass-resume-online"
}
