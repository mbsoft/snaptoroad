variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "GCP region for Cloud Run deployment"
  type        = string
  default     = "us-central1"
}

variable "service_name" {
  description = "Name of the Cloud Run service"
  type        = string
  default     = "snaptoroad"
}

variable "image" {
  description = "Full container image URI (e.g. us-central1-docker.pkg.dev/myproject/myrepo/snaptoroad:latest)"
  type        = string
}

variable "max_instances" {
  description = "Maximum number of Cloud Run instances"
  type        = number
  default     = 3
}

variable "min_instances" {
  description = "Minimum number of Cloud Run instances"
  type        = number
  default     = 0
}

variable "domain" {
  description = "Custom domain to map to the Cloud Run service (e.g. playground.mbsoft.com). Leave empty to skip."
  type        = string
  default     = ""
}
