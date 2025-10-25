#!/bin/bash

# Monitoring script for multilingual documentation portal
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="docs-portal"
HEALTH_CHECK_URL="http://localhost/api/health"
METRICS_URL="http://localhost:8080/metrics"
LOG_FILE="/var/log/docs-portal-monitor.log"
ALERT_EMAIL=""  # Set this to receive email alerts
CHECK_INTERVAL=60  # seconds

# Functions
log_info() {
    local message="[$(date '+%Y-%m-%d %H:%M:%S')] [INFO] $1"
    echo -e "${BLUE}$message${NC}"
    echo "$message" >> "$LOG_FILE" 2>/dev/null || true
}

log_success() {
    local message="[$(date '+%Y-%m-%d %H:%M:%S')] [SUCCESS] $1"
    echo -e "${GREEN}$message${NC}"
    echo "$message" >> "$LOG_FILE" 2>/dev/null || true
}

log_warning() {
    local message="[$(date '+%Y-%m-%d %H:%M:%S')] [WARNING] $1"
    echo -e "${YELLOW}$message${NC}"
    echo "$message" >> "$LOG_FILE" 2>/dev/null || true
}

log_error() {
    local message="[$(date '+%Y-%m-%d %H:%M:%S')] [ERROR] $1"
    echo -e "${RED}$message${NC}"
    echo "$message" >> "$LOG_FILE" 2>/dev/null || true
}

# Send alert (email or webhook)
send_alert() {
    local subject="$1"
    local message="$2"
    
    log_error "$subject: $message"
    
    # Send email if configured
    if [[ -n "$ALERT_EMAIL" ]] && command -v mail &> /dev/null; then
        echo "$message" | mail -s "$subject" "$ALERT_EMAIL"
    fi
    
    # Add webhook notification here if needed
    # curl -X POST -H 'Content-type: application/json' \
    #   --data "{\"text\":\"$subject: $message\"}" \
    #   YOUR_WEBHOOK_URL
}

# Check service health
check_health() {
    local response
    local status_code
    
    # Check main application health
    if response=$(curl -s -w "%{http_code}" "$HEALTH_CHECK_URL" 2>/dev/null); then
        status_code="${response: -3}"
        response_body="${response%???}"
        
        if [[ "$status_code" == "200" ]]; then
            log_success "Application health check passed"
            
            # Parse health response if it's JSON
            if command -v jq &> /dev/null; then
                local db_status=$(echo "$response_body" | jq -r '.services.database // "unknown"' 2>/dev/null)
                local fs_status=$(echo "$response_body" | jq -r '.services.filesystem // "unknown"' 2>/dev/null)
                local search_status=$(echo "$response_body" | jq -r '.services.search // "unknown"' 2>/dev/null)
                
                log_info "Service status - DB: $db_status, FS: $fs_status, Search: $search_status"
                
                # Check individual service status
                if [[ "$db_status" != "up" ]]; then
                    send_alert "Database Service Alert" "Database service is $db_status"
                fi
                
                if [[ "$fs_status" != "up" ]]; then
                    send_alert "Filesystem Service Alert" "Filesystem service is $fs_status"
                fi
                
                if [[ "$search_status" != "up" ]]; then
                    send_alert "Search Service Alert" "Search service is $search_status"
                fi
            fi
        else
            send_alert "Application Health Check Failed" "HTTP status: $status_code, Response: $response_body"
            return 1
        fi
    else
        send_alert "Application Unreachable" "Could not connect to $HEALTH_CHECK_URL"
        return 1
    fi
}

# Check Docker containers
check_containers() {
    local containers
    containers=$(docker-compose -p "$PROJECT_NAME" ps -q 2>/dev/null || echo "")
    
    if [[ -z "$containers" ]]; then
        send_alert "Container Check Failed" "No containers found for project $PROJECT_NAME"
        return 1
    fi
    
    local unhealthy_containers=()
    
    for container in $containers; do
        local container_name
        local container_status
        
        container_name=$(docker inspect --format='{{.Name}}' "$container" | sed 's/^.//')
        container_status=$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "no-healthcheck")
        
        if [[ "$container_status" == "unhealthy" ]]; then
            unhealthy_containers+=("$container_name")
        elif [[ "$container_status" == "no-healthcheck" ]]; then
            # Check if container is running
            local running_status
            running_status=$(docker inspect --format='{{.State.Running}}' "$container")
            if [[ "$running_status" != "true" ]]; then
                unhealthy_containers+=("$container_name (not running)")
            fi
        fi
    done
    
    if [[ ${#unhealthy_containers[@]} -gt 0 ]]; then
        send_alert "Unhealthy Containers Detected" "Containers: ${unhealthy_containers[*]}"
        return 1
    else
        log_success "All containers are healthy"
    fi
}

# Check disk space
check_disk_space() {
    local usage
    usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    
    if [[ "$usage" -gt 90 ]]; then
        send_alert "Disk Space Critical" "Disk usage is at ${usage}%"
    elif [[ "$usage" -gt 80 ]]; then
        log_warning "Disk usage is at ${usage}%"
    else
        log_info "Disk usage is at ${usage}%"
    fi
}

# Check memory usage
check_memory() {
    local memory_usage
    memory_usage=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
    
    if [[ "$memory_usage" -gt 90 ]]; then
        send_alert "Memory Usage Critical" "Memory usage is at ${memory_usage}%"
    elif [[ "$memory_usage" -gt 80 ]]; then
        log_warning "Memory usage is at ${memory_usage}%"
    else
        log_info "Memory usage is at ${memory_usage}%"
    fi
}

# Get system metrics
get_metrics() {
    log_info "=== System Metrics ==="
    
    # Docker stats
    log_info "Container resource usage:"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}" 2>/dev/null || log_warning "Could not get Docker stats"
    
    # System load
    local load_avg
    load_avg=$(uptime | awk -F'load average:' '{print $2}')
    log_info "System load average:$load_avg"
    
    # Check logs for errors
    local error_count
    error_count=$(docker-compose -p "$PROJECT_NAME" logs --since="1m" 2>/dev/null | grep -i error | wc -l || echo "0")
    if [[ "$error_count" -gt 0 ]]; then
        log_warning "Found $error_count error(s) in logs in the last minute"
    fi
}

# Run all checks
run_checks() {
    log_info "Starting monitoring checks..."
    
    local failed_checks=0
    
    # Health check
    if ! check_health; then
        ((failed_checks++))
    fi
    
    # Container check
    if ! check_containers; then
        ((failed_checks++))
    fi
    
    # System checks
    check_disk_space
    check_memory
    
    # Metrics
    get_metrics
    
    if [[ $failed_checks -eq 0 ]]; then
        log_success "All monitoring checks passed"
    else
        log_error "$failed_checks monitoring check(s) failed"
    fi
    
    return $failed_checks
}

# Continuous monitoring
monitor_continuous() {
    log_info "Starting continuous monitoring (interval: ${CHECK_INTERVAL}s)"
    log_info "Press Ctrl+C to stop"
    
    while true; do
        run_checks
        echo "---"
        sleep "$CHECK_INTERVAL"
    done
}

# Main function
main() {
    case "${1:-check}" in
        "check")
            run_checks
            ;;
        "monitor")
            monitor_continuous
            ;;
        "health")
            check_health
            ;;
        "containers")
            check_containers
            ;;
        "metrics")
            get_metrics
            ;;
        *)
            echo "Usage: $0 {check|monitor|health|containers|metrics}"
            echo "  check      - Run all checks once (default)"
            echo "  monitor    - Continuous monitoring"
            echo "  health     - Check application health only"
            echo "  containers - Check container status only"
            echo "  metrics    - Show system metrics only"
            exit 1
            ;;
    esac
}

# Create log directory if it doesn't exist
mkdir -p "$(dirname "$LOG_FILE")" 2>/dev/null || true

# Run main function
main "$@"