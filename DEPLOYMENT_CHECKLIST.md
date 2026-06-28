# CRM Application - VPS Deployment Checklist

## Pre-Deployment

- [ ] Domain name registered and pointing to VPS IP
- [ ] VPS with minimum: 2GB RAM, 20GB storage, Ubuntu 20.04+
- [ ] SSH access configured
- [ ] Firewall rules configured (ports 80, 443 open)
- [ ] Repository cloned on VPS
- [ ] Git configured for automatic deployments (optional)

## Environment Setup

- [ ] Docker installed (version 20.10+)
- [ ] Docker Compose installed (version 2.0+)
- [ ] `.env` file created with production values:
  - [ ] `ENVIRONMENT=production`
  - [ ] `SECRET_KEY` generated (`openssl rand -hex 32`)
  - [ ] `DATABASE_URL` configured
  - [ ] `FRONTEND_URL` set to your domain
  - [ ] `ALLOWED_HOSTS` includes your domain
  - [ ] `SMTP_*` variables set for email
  - [ ] `LOG_LEVEL=INFO` (not DEBUG)

## Security Configuration

- [ ] SSL/TLS certificates obtained (Let's Encrypt recommended)
- [ ] `nginx.conf` updated with SSL paths
- [ ] CORS properly configured
- [ ] Database passwords strong and unique
- [ ] JWT SECRET_KEY is cryptographically secure
- [ ] No hardcoded secrets in code

## Database Setup

- [ ] PostgreSQL volume mounted on persistent storage
- [ ] Database backups configured
- [ ] Initial database migrations run successfully
- [ ] Database users created with minimal permissions
- [ ] Connection pooling configured

## Application Deployment

- [ ] Run `bash deploy.sh` script
- [ ] Frontend builds without errors
- [ ] Backend starts successfully
- [ ] Nginx reverse proxy configured
- [ ] No error logs in container startup

## Testing & Validation

- [ ] Frontend loads at https://your-domain.com
- [ ] Backend API responds at https://your-domain.com/api/
- [ ] API documentation accessible at https://your-domain.com/api/docs
- [ ] Database connectivity verified
- [ ] Can create new users
- [ ] Login functionality works
- [ ] WebSocket connections work (if applicable)
- [ ] Email notifications send (if configured)

## Monitoring & Logging

- [ ] Docker resource limits set
- [ ] Container restart policies configured
- [ ] Log rotation configured
- [ ] Monitoring service configured (optional)
- [ ] Alert notifications set up

## Backup & Recovery

- [ ] Database backup schedule created
- [ ] Backup location: `/backups/` or cloud storage
- [ ] Backup retention policy: Minimum 30 days
- [ ] Recovery procedure documented
- [ ] Test recovery from backup

## Performance Optimization

- [ ] Database indexes created
- [ ] Query performance reviewed
- [ ] Frontend assets minified
- [ ] Caching headers configured
- [ ] CDN configured (optional)

## Maintenance & Operations

- [ ] Runbook created for common operations
- [ ] Deployment procedure documented
- [ ] Rollback procedure tested
- [ ] Team training completed
- [ ] On-call procedures established

## Post-Deployment Monitoring

- [ ] Monitor application for 24 hours
- [ ] Check error logs daily
- [ ] Verify performance metrics
- [ ] Confirm backups are running
- [ ] Test recovery procedures monthly

## Documentation

- [ ] API documentation updated
- [ ] Deployment guide created
- [ ] Environment variables documented
- [ ] Troubleshooting guide written
- [ ] Security procedures documented

## Optional Enhancements

- [ ] CloudFlare CDN integration
- [ ] OAuth/SSO integration
- [ ] Advanced monitoring (Prometheus/Grafana)
- [ ] Load balancing configuration
- [ ] Database replication setup
- [ ] Automated testing CI/CD pipeline

---

**Deployment Date**: _____________  
**Deployed By**: _____________  
**Status**: [ ] Complete [ ] In Progress [ ] Pending  
**Notes**: _______________________________________________

