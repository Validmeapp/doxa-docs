# Makefile for multilingual documentation portal

.PHONY: help build dev prod deploy stop clean logs health monitor

# Default target
help: ## Show this help message
	@echo "Available commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

# Development commands
dev: ## Start development environment
	docker-compose -f docker-compose.dev.yml up -d
	@echo "Development server started at http://localhost:3000"

dev-logs: ## Follow development logs
	docker-compose -f docker-compose.dev.yml logs -f

dev-stop: ## Stop development environment
	docker-compose -f docker-compose.dev.yml down

# Production commands
build: ## Build production images
	docker-compose build --no-cache

prod: ## Start production environment
	docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

deploy: ## Full deployment with health checks
	./scripts/deploy.sh

# Management commands
stop: ## Stop all services
	docker-compose down

clean: ## Clean up containers, images, and volumes
	docker-compose down -v --remove-orphans
	docker image prune -f
	docker volume prune -f

restart: ## Restart all services
	docker-compose restart

# Monitoring commands
logs: ## Show logs from all services
	docker-compose logs

logs-follow: ## Follow logs from all services
	docker-compose logs -f

health: ## Check application health
	./scripts/monitor.sh health

monitor: ## Start continuous monitoring
	./scripts/monitor.sh monitor

status: ## Show service status
	docker-compose ps

# Database commands
db-init: ## Initialize database
	docker-compose exec app npm run db:init

db-migrate: ## Run database migrations
	docker-compose exec app npm run db:migrate

db-seed: ## Seed database with sample data
	docker-compose exec app npm run db:seed

db-backup: ## Backup database
	@mkdir -p backups
	docker-compose exec app cp /app/data/docs.db /app/data/backup-$$(date +%Y%m%d-%H%M%S).db
	docker cp $$(docker-compose ps -q app):/app/data/backup-$$(date +%Y%m%d-%H%M%S).db ./backups/

# Content commands
search-build: ## Build search index
	docker-compose exec app npm run search:build

search-cleanup: ## Clean up search data
	docker-compose exec app npm run search:cleanup

# Utility commands
shell: ## Access application container shell
	docker-compose exec app sh

caddy-shell: ## Access Caddy container shell
	docker-compose exec caddy sh

caddy-reload: ## Reload Caddy configuration
	docker-compose exec caddy caddy reload

ssl-status: ## Check SSL certificate status
	docker-compose exec caddy caddy list-certificates

# Testing commands
test: ## Run tests in container
	docker-compose exec app npm run test:content
	docker-compose exec app npm run test:mdx

lint: ## Run linting
	docker-compose exec app npm run lint

format: ## Format code
	docker-compose exec app npm run format

# Backup and restore
backup: ## Create full backup
	@mkdir -p backups
	@echo "Creating backup..."
	docker-compose down
	tar -czf backups/backup-full-$$(date +%Y%m%d-%H%M%S).tar.gz data/ public/search/ content/
	docker-compose up -d
	@echo "Backup created in backups/ directory"

# Security
security-scan: ## Run security scan on images
	docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
		-v $$(pwd):/root/.cache/ aquasec/trivy:latest image \
		$$(docker-compose config | grep 'image:' | awk '{print $$2}' | head -1)

# Performance
benchmark: ## Run performance benchmark
	@echo "Running performance benchmark..."
	@if command -v ab >/dev/null 2>&1; then \
		ab -n 100 -c 10 http://localhost/api/health; \
	else \
		echo "Apache Bench (ab) not installed. Install with: apt-get install apache2-utils"; \
	fi