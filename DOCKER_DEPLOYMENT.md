# Docker Deployment Guide

This guide covers deploying the multilingual documentation portal using Docker and Docker Compose with Caddy reverse proxy.

## Prerequisites

- Docker 20.10+
- Docker Compose 2.0+
- Domain name (for SSL certificates)
- Minimum 2GB RAM, 10GB disk space

## Quick Start

1. **Clone and prepare the project:**
   ```bash
   git clone <repository-url>
   cd multilingual-docs-portal
   ```

2. **Configure your domain:**
   ```bash
   # Edit Caddyfile and replace 'your-domain.com' with your actual domain
   sed -i 's/your-domain.com/docs.example.com/g' Caddyfile
   ```

3. **Deploy:**
   ```bash
   ./scripts/deploy.sh
   ```

4. **Monitor:**
   ```bash
   ./scripts/monitor.sh monitor
   ```

## Configuration Files

### Docker Files

- `Dockerfile` - Multi-stage production build
- `Dockerfile.dev` - Development build with hot reload
- `docker-compose.yml` - Main production configuration
- `docker-compose.dev.yml` - Development configuration
- `docker-compose.prod.yml` - Production overrides with monitoring

### Caddy Configuration

- `Caddyfile` - Production reverse proxy with SSL
- `Caddyfile.dev` - Development proxy configuration

## Deployment Options

### Production Deployment

```bash
# Full production deployment with monitoring
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Or use the deployment script
./scripts/deploy.sh
```

### Development Deployment

```bash
# Development with hot reload
docker-compose -f docker-compose.dev.yml up -d

# Access at http://localhost:3000 (direct) or http://localhost:8080 (via Caddy)
```

### Staging Deployment

```bash
# Use production config but with staging domain
cp Caddyfile Caddyfile.staging
sed -i 's/your-domain.com/staging.your-domain.com/g' Caddyfile.staging

# Deploy with staging config
docker-compose -f docker-compose.yml up -d
```

## Environment Variables

### Application Environment Variables

```bash
# Production
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0
LOG_LEVEL=info
ENABLE_METRICS=true

# Development
NODE_ENV=development
PORT=3000
HOSTNAME=0.0.0.0
LOG_LEVEL=debug
```

### Caddy Environment Variables

```bash
# Automatic HTTPS
CADDY_INGRESS_NETWORKS=docs-network

# Custom configuration
CADDY_ADMIN=off
```

## SSL/TLS Configuration

Caddy automatically handles SSL certificates via Let's Encrypt:

1. **Automatic Certificate Generation:**
   - Certificates are generated automatically for your domain
   - Stored in Docker volume `caddy_data`
   - Auto-renewal every 60 days

2. **Custom Certificates:**
   ```bash
   # Mount custom certificates
   volumes:
     - ./certs:/etc/ssl/certs:ro
   ```

3. **Development SSL:**
   ```bash
   # Generate self-signed certificate for development
   caddy trust
   ```

## Health Checks and Monitoring

### Built-in Health Checks

- Application:** `GET /api/health`
- Caddy:** `caddy version` command
- Docker:** Container health status

### Monitoring Scripts

```bash
# Run all health checks once
./scripts/monitor.sh check

# Continuous monitoring
./scripts/monitor.sh monitor

# Check specific components
./scripts/monitor.sh health
./scripts/monitor.sh containers
./scripts/monitor.sh metrics
```

### Health Check Endpoints

- Application Health:** `https://your-domain.com/api/health`
- Caddy Health:** `https://your-domain.com:8080/health`
- Metrics:** `https://your-domain.com:8080/metrics`

## Logging

### Log Locations

```bash
# Application logs
docker-compose logs app

# Caddy logs
docker-compose logs caddy

# All services
docker-compose logs

# Follow logs in real-time
docker-compose logs -f
```

### Log Configuration

- Rotation:** 100MB max size, 5 files retained
- Format:** JSON for structured logging
- Retention:** 720 hours (30 days)

## Backup and Recovery

### Database Backup

```bash
# Backup SQLite database
docker-compose exec app cp /app/data/docs.db /app/data/backup-$(date +%Y%m%d).db

# Copy to host
docker cp docs-portal-app:/app/data/backup-$(date +%Y%m%d).db ./backups/
```

### Content Backup

```bash
# Backup content and search index
tar -czf backup-content-$(date +%Y%m%d).tar.gz content/ public/search/
```

### Full System Backup

```bash
# Backup all persistent data
docker-compose down
tar -czf backup-full-$(date +%Y%m%d).tar.gz data/ public/search/ content/
docker-compose up -d
```

## Scaling and Performance

### Horizontal Scaling

```bash
# Scale application containers
docker-compose up -d --scale app=3

# Update Caddy configuration for load balancing
# (Multiple upstream servers in Caddyfile)
```

### Resource Limits

Production limits (in `docker-compose.prod.yml`):
- App:** 2 CPU cores, 1GB RAM
- Caddy:** 1 CPU core, 512MB RAM

### Performance Optimization

1. **Enable HTTP/3:**
   ```caddyfile
   servers {
       protocol {
           experimental_http3
       }
   }
   ```

2. **Optimize Caching:**
   ```caddyfile
   @static {
       path /_next/static/* /favicon.ico
   }
   header @static Cache-Control "public, max-age=31536000"
   ```

3. **Enable Compression:**
   ```caddyfile
   encode {
       gzip 6
       zstd
   }
   ```

## Security

### Security Headers

Automatically applied via Caddy:
- HSTS (HTTP Strict Transport Security)
- CSP (Content Security Policy)
- X-Frame-Options
- X-Content-Type-Options
- X-XSS-Protection

### Container Security

- Non-root user (nextjs:nodejs)
- Minimal Alpine Linux base
- No unnecessary packages
- Read-only filesystem where possible

### Network Security

- Internal Docker network
- Only necessary ports exposed
- Rate limiting enabled
- Fail2ban integration (optional)

## Troubleshooting

### Common Issues

1. **SSL Certificate Issues:**
   ```bash
   # Check certificate status
   docker-compose exec caddy caddy list-certificates
   
   # Force certificate renewal
   docker-compose exec caddy caddy reload
   ```

2. **Application Won't Start:**
   ```bash
   # Check logs
   docker-compose logs app
   
   # Check health status
   curl -f http://localhost/api/health
   ```

3. **Database Issues:**
   ```bash
   # Check database health
   docker-compose exec app npm run db:health
   
   # Run migrations
   docker-compose exec app npm run db:migrate
   ```

### Debug Mode

```bash
# Enable debug logging
docker-compose -f docker-compose.yml -f docker-compose.debug.yml up -d

# Access container shell
docker-compose exec app sh
```

### Performance Issues

```bash
# Check resource usage
docker stats

# Check system metrics
./scripts/monitor.sh metrics

# Analyze logs for errors
docker-compose logs | grep -i error
```

## Maintenance

### Updates

```bash
# Update application
git pull
./scripts/deploy.sh

# Update Docker images
docker-compose pull
docker-compose up -d
```

### Cleanup

```bash
# Clean up old images
docker image prune -f

# Clean up old containers
docker container prune -f

# Clean up old volumes (careful!)
docker volume prune -f
```

### Scheduled Maintenance

Create a cron job for regular maintenance:

```bash
# Add to crontab
0 2 * * 0 /path/to/project/scripts/deploy.sh cleanup
0 3 * * * /path/to/project/scripts/monitor.sh check
```

## Support

For issues and questions:

1. Check the logs: `docker-compose logs`
2. Run health checks: `./scripts/monitor.sh check`
3. Review this documentation
4. Check the project repository issues

## Advanced Configuration

### Custom Caddy Modules

```dockerfile
# Build Caddy with custom modules
FROM caddy:builder AS caddy-builder
RUN caddy-builder github.com/caddy-dns/cloudflare

FROM caddy:alpine
COPY --from=caddy-builder /usr/bin/caddy /usr/bin/caddy
```

### Prometheus Monitoring

Uncomment the Prometheus and Grafana services in `docker-compose.prod.yml` for advanced monitoring.

### Custom Domains

For multiple domains, update the Caddyfile:

```caddyfile
docs.example.com, api-docs.example.com {
    # Configuration
}
```