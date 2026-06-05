# Local state (default). To migrate to R2:
# 1. Create R2 bucket and R2 S3 API token in the CF dashboard
# 2. Uncomment the backend block below
# 3. Run: tofu init -migrate-state
#
# terraform {
#   backend "s3" {
#     bucket                      = "lass-tofu-state"
#     key                         = "waf-demo/terraform.tfstate"
#     region                      = "auto"
#     endpoint                    = "https://<ACCOUNT_ID>.r2.cloudflarestorage.com"
#     access_key                  = "YOUR_R2_ACCESS_KEY"
#     secret_key                  = "YOUR_R2_SECRET_KEY"
#     skip_credentials_validation = true
#     skip_metadata_api_check     = true
#     skip_region_validation      = true
#     force_path_style            = true
#   }
# }
