# R2 state backend.
# Init with: tofu init -backend-config=backend.tfvars
# Keys go in backend.tfvars (gitignored) — see backend.tfvars.example
terraform {
  backend "s3" {
    bucket                      = "andrewlass-resume-tofu-state-20260605"
    key                         = "waf-demo/terraform.tfstate"
    region                      = "auto"
    endpoint                    = "https://a37f54ad5a974e6ff597fed01ba6e075.r2.cloudflarestorage.com"
    skip_credentials_validation = true
    skip_metadata_api_check     = true
    skip_region_validation      = true
    use_path_style              = true
  }
}
