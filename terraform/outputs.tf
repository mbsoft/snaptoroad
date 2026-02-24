output "service_url" {
  description = "URL of the deployed Cloud Run service"
  value       = google_cloud_run_v2_service.app.uri
}

output "custom_domain_url" {
  description = "Custom domain URL"
  value       = var.domain != "" ? "https://${var.domain}" : null
}
