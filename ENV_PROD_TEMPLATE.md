# VPS Production Environment Template
# 
# HOW TO USE THIS FILE:
# 1. Copy this file to your VPS as `.env.prod`
# 2. Replace all placeholder values (text in brackets) with real values
# 3. NEVER commit this file to Git
# 4. Use with: docker-compose -f docker-compose.prod.yml up -d
#
# ═══════════════════════════════════════════════════════════════

# ─── ENVIRONMENT ───
# Must be "production" for this file
ENVIRONMENT=production
LOG_LEVEL=INFO

# ─── SECURITY ───
# Generate with: openssl rand -hex 32
# CRITICAL: Must be ≥32 characters, cryptographically random
# NEVER use default values
# NEVER expose in logs or Git
SECRET_KEY=[GENERATE_WITH: openssl rand -hex 32]

# ─── DATABASE ───
# Configure PostgreSQL credentials
# 
# POSTGRES_USER: Username for database
# POSTGRES_PASSWORD: Strong password (≥16 chars, mixed case, numbers, symbols)
# POSTGRES_DB: Database name (usually "fundingsathicrm")
#
# DATABASE_URL: Connection string
# - CRITICAL: Use "postgres" service name, NOT IP address
# - Format: postgresql://[USER]:[PASSWORD]@[HOST]:[PORT]/[DB]
# - Host must be: postgres (Docker service name)
# - Port must be: 5432 (default PostgreSQL port)
# - Example: postgresql://postgres:MyStr0ng!Pwd@postgres:5432/fundingsathicrm
#
POSTGRES_USER=postgres
POSTGRES_PASSWORD=[STRONG_PASSWORD_16_CHARS_MIN]
POSTGRES_DB=fundingsathicrm
DATABASE_URL=postgresql://postgres:[STRONG_PASSWORD_16_CHARS_MIN]@postgres:5432/fundingsathicrm

# ─── JWT SETTINGS ───
# Token expiration time in minutes
ACCESS_TOKEN_EXPIRE_MINUTES=60

# ─── CORS & ALLOWED HOSTS ───
# CRITICAL: Comma-separated list of allowed origins
# Must include:
#   1. Your Vercel frontend domain: https://your-app.vercel.app
#   2. Your API domain: https://api.YOUR-DOMAIN.com
#
# Security Note:
#   - NEVER use "*" in production
#   - NEVER use http:// in production (only https://)
#   - Must exactly match frontend's domain
#   - Multiple domains separated by comma (no spaces)
#
# Example for Vercel deployment:
#   ALLOWED_HOSTS=https://my-crm.vercel.app,https://api.fundingsathi.com
#
ALLOWED_HOSTS=https://[YOUR_VERCEL_APP].vercel.app,https://api.[YOUR-DOMAIN].com

# FRONTEND_URL: Where the frontend is deployed
# Must be HTTPS in production
# Should match your Vercel deployment URL
FRONTEND_URL=https://[YOUR_VERCEL_APP].vercel.app

# ─── EMAIL CONFIGURATION ───
# For sending verification emails, password resets, notifications
#
# Using Gmail:
# 1. Create Gmail App Password: https://myaccount.google.com/apppasswords
# 2. Use App Password (not regular Gmail password)
#
# SMTP_HOST: Gmail SMTP server
# SMTP_PORT: 587 (TLS) or 465 (SSL)
# SMTP_USER: Your Gmail address
# SMTP_PASSWORD: App-specific password from step 1
# SMTP_USE_TLS: true for port 587, false for port 465
# EMAIL_FROM: Display name for sent emails
#
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=[YOUR_EMAIL@gmail.com]
SMTP_PASSWORD=[GMAIL_APP_PASSWORD_NOT_YOUR_PASSWORD]
SMTP_USE_TLS=true
EMAIL_FROM=noreply@fundingsathi.com

# ─── API BASE OVERRIDES ───
# Backend API URL that frontend will use to call API
# Must be HTTPS in production
# Should be your domain's API subdomain or path
# Format: https://api.your-domain.com or https://your-domain.com/api
#
API_BASE=https://api.[YOUR-DOMAIN].com

# ─── REDIS CONFIGURATION ───
# For Celery task queue (background jobs)
#
# If using docker-compose.prod.yml:
#   CELERY_BROKER_URL=redis://redis:6379/0
#   CELERY_RESULT_BACKEND=redis://redis:6379/0
#
# This assumes Redis service in docker-compose.prod.yml
# Host "redis" is the Docker service name
# Database 0 is default
#
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/0

# ═══════════════════════════════════════════════════════════════

# QUICK CHECKLIST - Before starting services:
# 
# ✓ SECRET_KEY: Generated with openssl rand -hex 32 (≥32 chars)
# ✓ POSTGRES_PASSWORD: Strong password (≥16 chars)
# ✓ DATABASE_URL: Uses "postgres" service name, correct password
# ✓ ALLOWED_HOSTS: Includes Vercel domain + API domain
# ✓ FRONTEND_URL: Matches your Vercel URL
# ✓ SMTP_USER: Real Gmail address
# ✓ SMTP_PASSWORD: App password from Gmail settings (NOT your Gmail password)
# ✓ API_BASE: Your production API domain
# ✓ File is .env.prod (NOT .env)
# ✓ File is NOT committed to Git

# EXAMPLE FILLED VALUES (use real values, these are examples only):
# ═══════════════════════════════════════════════════════════════
# ENVIRONMENT=production
# LOG_LEVEL=INFO
# SECRET_KEY=a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6
# POSTGRES_USER=postgres
# POSTGRES_PASSWORD=MySecure!Password#2024
# POSTGRES_DB=fundingsathicrm
# DATABASE_URL=postgresql://postgres:MySecure!Password#2024@postgres:5432/fundingsathicrm
# ACCESS_TOKEN_EXPIRE_MINUTES=60
# ALLOWED_HOSTS=https://fundingsathi-crm.vercel.app,https://api.fundingsathi.com
# FRONTEND_URL=https://fundingsathi-crm.vercel.app
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=crm@gmail.com
# SMTP_PASSWORD=abcd efgh ijkl mnop
# SMTP_USE_TLS=true
# EMAIL_FROM=noreply@fundingsathi.com
# API_BASE=https://api.fundingsathi.com
# CELERY_BROKER_URL=redis://redis:6379/0
# CELERY_RESULT_BACKEND=redis://redis:6379/0
