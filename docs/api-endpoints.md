# API Endpoints Documentation

This document describes the API endpoints implemented for the multilingual documentation portal.

## Configuration API

### GET /api/config

Returns application configuration including available locales, versions, and feature flags.

**Response:**
```json
{
  "defaultLocale": "en",
  "defaultVersion": "v1",
  "availableLocales": ["en", "es", "pt"],
  "availableVersions": ["v1", "v2"],
  "features": {
    "search": true,
    "analytics": true,
    "darkMode": true,
    "languageSwitcher": true,
    "versionSwitcher": true
  }
}
```

**Caching:** 5 minutes with stale-while-revalidate

### POST /api/config

Update configuration values (admin only).

**Request Body:**
```json
{
  "defaultLocale": "en",
  "feature_search": true,
  "feature_analytics": false
}
```

**Response:**
```json
{
  "message": "Configuration updated successfully"
}
```

## Health Check API

### GET /api/health

Returns health status of all services with detailed information.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "services": {
    "database": "up",
    "filesystem": "up",
    "search": "up"
  },
  "details": {
    "database": {
      "connected": true,
      "size": 12345,
      "path": "/path/to/docs.db",
      "responseTime": 5
    },
    "filesystem": {
      "contentDir": true,
      "writable": true,
      "responseTime": 2
    },
    "search": {
      "indexExists": true,
      "locales": ["en", "es", "pt"],
      "responseTime": 3
    }
  },
  "responseTime": 15
}
```

**Status Codes:**
- `200`: All services healthy
- `207`: Some services degraded
- `503`: Services unhealthy

### HEAD /api/health

Simple health check that returns only status code (for load balancers).

**Response:** Empty body with status code 200 (healthy) or 503 (unhealthy)

## Redirect Management API

### GET /api/redirects

Get all redirect rules with optional filtering.

**Query Parameters:**
- `locale` (optional): Filter by locale
- `version` (optional): Filter by version
- `from_path` (optional): Search in from_path

**Response:**
```json
{
  "redirects": [
    {
      "from_path": "/old-page",
      "to_path": "/new-page",
      "status_code": 301,
      "locale": "en",
      "version": "v1",
      "created_at": "2024-01-01T12:00:00.000Z"
    }
  ],
  "total": 1
}
```

### POST /api/redirects

Create a new redirect rule.

**Request Body:**
```json
{
  "from_path": "/old-page",
  "to_path": "/new-page",
  "status_code": 301,
  "locale": "en",
  "version": "v1"
}
```

**Response:**
```json
{
  "message": "Redirect created successfully",
  "redirect": {
    "from_path": "/old-page",
    "to_path": "/new-page",
    "status_code": 301,
    "locale": "en",
    "version": "v1",
    "created_at": "2024-01-01T12:00:00.000Z"
  }
}
```

**Status Codes:**
- `201`: Redirect created successfully
- `400`: Validation failed
- `409`: Redirect conflicts detected

### DELETE /api/redirects

Delete redirect rules.

**Query Parameters:**
- `from_path` (required): Path to delete
- `locale` (optional): Filter by locale
- `version` (optional): Filter by version

**Response:**
```json
{
  "message": "Redirect deleted successfully",
  "deleted": 1
}
```

## Bulk Redirect Operations

### POST /api/redirects/bulk

Create multiple redirect rules at once.

**Request Body:**
```json
{
  "redirects": [
    {
      "from_path": "/old-1",
      "to_path": "/new-1",
      "status_code": 301
    },
    {
      "from_path": "/old-2",
      "to_path": "/new-2",
      "status_code": 302
    }
  ],
  "overwrite": false
}
```

**Response:**
```json
{
  "message": "Bulk redirect operation completed",
  "results": {
    "created": 2,
    "updated": 0,
    "errors": []
  },
  "total": 2
}
```

**Status Codes:**
- `201`: All redirects created successfully
- `207`: Some redirects failed (partial success)
- `400`: Validation failed
- `409`: Conflicts detected (set `overwrite: true` to resolve)

### GET /api/redirects/bulk/export

Export all redirects as JSON or CSV.

**Query Parameters:**
- `format` (optional): `json` (default) or `csv`
- `locale` (optional): Filter by locale
- `version` (optional): Filter by version

**JSON Response:**
```json
{
  "redirects": [...],
  "total": 10,
  "exported_at": "2024-01-01T12:00:00.000Z"
}
```

**CSV Response:**
```csv
from_path,to_path,status_code,locale,version
"/old-1","/new-1",301,"en","v1"
"/old-2","/new-2",302,"es","v1"
```

## Validation Rules

### Redirect Rules

- `from_path`: Required, must start with `/`
- `to_path`: Required, must start with `/` or be a full URL
- `status_code`: Optional, must be 301, 302, 307, or 308 (default: 301)
- `locale`: Optional string
- `version`: Optional string
- `from_path` and `to_path` cannot be the same

### Conflict Detection

The API automatically detects and prevents:

1. **Duplicate paths**: Same `from_path` with same `locale` and `version`
2. **Circular redirects**: A → B and B → A
3. **Redirect chains**: A → B → C (warns about potential chains)

## Error Responses

All endpoints return consistent error responses:

```json
{
  "error": "Error message",
  "details": ["Additional error details"]
}
```

Common HTTP status codes:
- `400`: Bad Request (validation failed)
- `404`: Not Found
- `409`: Conflict (duplicate/circular redirects)
- `500`: Internal Server Error

## Caching

- **Configuration API**: 5 minutes cache with stale-while-revalidate
- **Health API**: No caching (always fresh)
- **Redirect API**: No caching for mutations, redirect rules cached internally for 5 minutes

## Security Considerations

- All POST/DELETE operations should be protected with authentication in production
- Input validation prevents SQL injection and path traversal attacks
- Rate limiting should be implemented for bulk operations
- CORS headers should be configured appropriately for your domain

## Usage Examples

### Check Application Health

```bash
curl -X GET http://localhost:3000/api/health
```

### Get Configuration

```bash
curl -X GET http://localhost:3000/api/config
```

### Create a Redirect

```bash
curl -X POST http://localhost:3000/api/redirects \
  -H "Content-Type: application/json" \
  -d '{
    "from_path": "/old-docs",
    "to_path": "/docs",
    "status_code": 301,
    "locale": "en"
  }'
```

### Bulk Import Redirects

```bash
curl -X POST http://localhost:3000/api/redirects/bulk \
  -H "Content-Type: application/json" \
  -d '{
    "redirects": [
      {"from_path": "/old-1", "to_path": "/new-1"},
      {"from_path": "/old-2", "to_path": "/new-2"}
    ]
  }'
```

### Export Redirects as CSV

```bash
curl -X GET "http://localhost:3000/api/redirects/bulk/export?format=csv" \
  -o redirects.csv
```