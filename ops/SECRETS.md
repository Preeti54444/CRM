Secrets Management Guidance

- Use your orchestration platform's secret store (Docker secrets, Kubernetes Secrets, AWS Secrets Manager, HashiCorp Vault) to inject `SECRET_KEY`, `DATABASE_URL`, `SMTP_PASSWORD`, and `SENTRY_DSN` at runtime.
- Do NOT commit `.env` with production secrets. Keep `.env.example` as a template only.
- Rotate `SECRET_KEY` periodically; note that rotating `SECRET_KEY` will invalidate existing JWTs / sessions.
- Use least-privilege credentials for database access (separate user for backups vs app).
- For Docker Compose on a single host, use `docker secret` or bind-mount a read-only credentials file owned by root.
- For CI, store secrets in repository secrets and avoid printing them in logs.
- Use IAM roles and ephemeral credentials when available (e.g., AWS IAM for RDS access via EC2 roles).
