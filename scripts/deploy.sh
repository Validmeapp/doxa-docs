#!/bin/bash

# Deployment script for multilingual documentation portal
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.yml"
PROJECT_NAME="docs-portal"
HEALTH_CHECK_URL="http://localhost/api/health"
MAX_WAIT_TIME=120

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker and Docker Compose are installed
check_dependencies() {
    log_info "Checking dependencies..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    log_success "Dependencies check passed"
}

# Pre-deployment checks
pre_deployment_checks() {
    log_info "Running pre-deployment checks..."
    
    # Check if required files exist
    required_files=("Dockerfile" "docker-compose.yml" "Caddyfile" "package.json")
    for file in "${required_files[@]}"; do
        if [[ ! -f "$file" ]]; then
            log_error "Required file $file not found"
            exit 1
        fi
    done
    
    # Check if data directory exists
    if [[ ! -d "data" ]]; then
        log_warning "Data directory not found, creating..."
        mkdir -p data
    fi
    
    # Check if search index exists
    if [[ ! -d "public/search" ]]; then
        log_warning "Search index not found, will be created during build"
    fi
    
    log_success "Pre-deployment checks passed"
}

# Build and deploy
deploy() {
    log_info "Starting deployment..."
    
    # Stop existing containers
    log_info "Stopping existing containers..."
    docker-compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" down --remove-orphans
    
    # Build new images
    log_info "Building new images..."
    docker-compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" build --no-cache
    
    # Start services
    log_info "Starting services..."
    docker-compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" up -d
    
    log_success "Services started"
}

# Health check
health_check() {
    log_info "Performing health checks..."
    
    local wait_time=0
    local health_ok=false
    
    while [[ $wait_time -lt $MAX_WAIT_TIME ]]; do
        if curl -f -s "$HEALTH_CHECK_URL" > /dev/null 2>&1; then
            health_ok=true
            break
        fi
        
        log_info "Waiting for services to be ready... ($wait_time/${MAX_WAIT_TIME}s)"
        sleep 5
        wait_time=$((wait_time + 5))
    done
    
    if [[ "$health_ok" == true ]]; then
        log_success "Health check passed"
        
        # Get health check details
        health_response=$(curl -s "$HEALTH_CHECK_URL" | jq '.' 2>/dev/null || echo "Health check response not in JSON format")
        log_info "Health check response: $health_response"
    else
        log_error "Health check failed after ${MAX_WAIT_TIME}s"
        log_error "Deployment may have issues. Check logs with: docker-compose -p $PROJECT_NAME logs"
        exit 1
    fi
}

# Show status
show_status() {
    log_info "Deployment status:"
    docker-compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" ps
    
    log_info "Service logs (last 20 lines):"
    docker-compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" logs --tail=20
}

# Cleanup old images
cleanup() {
    log_info "Cleaning up old Docker images..."
    docker image prune -f
    log_success "Cleanup completed"
}

# Main deployment flow
main() {
    log_info "Starting deployment of $PROJECT_NAME"
    
    check_dependencies
    pre_deployment_checks
    deploy
    health_check
    show_status
    cleanup
    
    log_success "Deployment completed successfully!"
    log_info "Your documentation portal is now available at: https://your-domain.com"
    log_info "Health check endpoint: $HEALTH_CHECK_URL"
}

# Handle script arguments
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "status")
        show_status
        ;;
    "health")
        health_check
        ;;
    "stop")
        log_info "Stopping services..."
        docker-compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" down
        log_success "Services stopped"
        ;;
    "logs")
        docker-compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" logs -f
        ;;
    "cleanup")
        cleanup
        ;;
    *)
        echo "Usage: $0 {deploy|status|health|stop|logs|cleanup}"
        echo "  deploy  - Full deployment (default)"
        echo "  status  - Show service status"
        echo "  health  - Run health check"
        echo "  stop    - Stop all services"
        echo "  logs    - Show and follow logs"
        echo "  cleanup - Clean up old Docker images"
        exit 1
        ;;
esac