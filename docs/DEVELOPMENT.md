# Development Guide

This guide covers the development workflow, tooling, and best practices for the multilingual documentation portal.

## Quick Start

```bash
# Install dependencies
npm install

# Start enhanced development server
npm run dev:enhanced

# Or use standard Next.js dev server
npm run dev
```

## Development Scripts

### Core Development

- `npm run dev` - Standard Next.js development server
- `npm run dev:enhanced` - Enhanced dev server with content watching and auto-rebuild
- `npm run build` - Build for production with content validation
- `npm run build:optimized` - Optimized build with performance analysis
- `npm run build:production` - Production build with Lighthouse report

### Content Management

- `npm run content:create` - Create new content files
- `npm run content:list` - List all content files
- `npm run content:validate` - Validate content structure
- `npm run content:translate` - Generate translation templates
- `npm run content:watch` - Watch content files for changes

### Quality Assurance

- `npm run lint` - Lint TypeScript/JavaScript code
- `npm run lint:content` - Lint content files for style and consistency
- `npm run lint:content:report` - Generate detailed content linting report
- `npm run validate:content` - Validate content structure and links
- `npm run type-check` - TypeScript type checking

### Performance & Analysis

- `npm run performance:analyze` - Analyze bundle sizes and performance
- `npm run performance:build` - Build with performance monitoring
- `npm run performance:lighthouse` - Generate Lighthouse performance report
- `npm run build:analyze` - Build with webpack bundle analyzer

## Content Authoring

### Creating New Content

Use the content authoring helper to create new documentation:

```bash
# Create a new guide
tsx scripts/content-authoring.ts create en v1 guide "API Integration Guide"

# Create API reference
tsx scripts/content-authoring.ts create en v1 api-reference "Webhooks API"

# Create overview page
tsx scripts/content-authoring.ts create es v1 overview "Descripción General"
```

### Content Structure

```
content/
├── en/                 # English content
│   └── v1/
│       ├── overview.mdx
│       ├── authentication.mdx
│       ├── guides/
│       │   └── getting-started.mdx
│       └── api-reference/
│           ├── users.mdx
│           └── webhooks.mdx
├── es/                 # Spanish content
│   └── v1/
│       └── ...

```

### Frontmatter Requirements

All content files must include proper frontmatter:

```yaml
---
title: "Page Title"
description: "Brief description of the page content"
version: "v1"
locale: "en"
order: 1
tags: ["tag1", "tag2"]
---
```

### Translation Workflow

1. Create content in English first
2. Generate translation templates:
   ```bash
   tsx scripts/content-authoring.ts translate content/en/v1/overview.mdx es
   ```
3. Translate the content and update frontmatter
4. Validate the translated content

## Development Workflow

### 1. Enhanced Development Server

The enhanced development server provides additional features:

```bash
npm run dev:enhanced
```

Features:
- Content file watching with hot reload
- Automatic search index rebuilding
- Content validation on changes
- Development report generation

### 2. Content Validation

Before committing changes, validate your content:

```bash
# Validate all content
npm run validate:content

# Lint content for style issues
npm run lint:content

# Generate detailed linting report
npm run lint:content:report
```

### 3. Performance Monitoring

Monitor build performance and bundle sizes:

```bash
# Analyze current build
npm run performance:analyze

# Build with performance monitoring
npm run performance:build

# Generate Lighthouse report
npm run performance:lighthouse
```

## Code Quality

### TypeScript

- Strict mode enabled
- No implicit any
- Proper type definitions for all components

### ESLint Configuration

```json
{
  "extends": [
    "next/core-web-vitals",
    "prettier"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/no-explicit-any": "warn"
  }
}
```

### Prettier Configuration

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2
}
```

## Content Guidelines

### Writing Style

- Use active voice
- Keep sentences concise
- Use consistent terminology
- Include code examples
- Provide clear step-by-step instructions

### Code Examples

Always specify language for code blocks:

````markdown
```javascript
const response = await fetch('/api/users');
```

```bash
curl -X GET "https://api.example.com/v1/users"
```
````

### Links

- Use descriptive link text
- Prefer absolute paths for internal links
- Validate all links before publishing

## Build Process

### Development Build

```bash
npm run build
```

Includes:
- Content validation
- TypeScript compilation
- Next.js optimization
- Static export generation

### Production Build

```bash
npm run build:production
```

Additional features:
- Performance analysis
- Bundle optimization
- Lighthouse report generation
- Search index building
- Sitemap generation

### Build Optimization

The build process includes several optimizations:

1. **Bundle Splitting**: Automatic code splitting for optimal loading
2. **Tree Shaking**: Remove unused code
3. **Compression**: Gzip compression for assets
4. **Image Optimization**: Automatic image optimization
5. **Static Generation**: Pre-render all pages at build time

## Performance Budgets

The project enforces performance budgets:

- JavaScript bundle: < 300KB
- CSS bundle: < 50KB
- Total bundle (gzipped): < 500KB
- Lighthouse score: > 95

## Testing Strategy

### Content Testing

- Frontmatter validation
- Link checking
- MDX syntax validation
- Translation completeness

### Performance Testing

- Bundle size monitoring
- Lighthouse CI integration
- Core Web Vitals tracking

## Deployment

### Static Export

The application builds to static files in the `out/` directory:

```bash
npm run build:production
```

### Docker Deployment

Use the provided Docker configuration:

```bash
# Development
docker-compose -f docker-compose.dev.yml up

# Production
docker-compose -f docker-compose.prod.yml up
```

## Troubleshooting

### Common Issues

1. **Content validation errors**: Check frontmatter and file structure
2. **Build failures**: Run type checking and linting
3. **Performance issues**: Use bundle analyzer to identify large dependencies
4. **Search not working**: Rebuild search index

### Debug Commands

```bash
# Check dependencies
npm run content:validate

# Analyze bundle
npm run build:analyze

# Generate development report
tsx scripts/dev-server.ts --help
```

## Contributing

1. Create content following the style guide
2. Validate content before committing
3. Test build process locally
4. Update documentation as needed

## Tools and Scripts

### Content Authoring (`scripts/content-authoring.ts`)

Helper for creating and managing content files.

### Content Linter (`scripts/content-linter.ts`)

Checks content for style, consistency, and best practices.

### Content Validator (`scripts/validate-content.ts`)

Validates content structure, frontmatter, and links.

### Performance Monitor (`scripts/performance-monitor.ts`)

Analyzes build performance and bundle sizes.

### Enhanced Dev Server (`scripts/dev-server.ts`)

Development server with content watching and auto-rebuild.

### Build Optimizer (`scripts/build-optimized.ts`)

Orchestrates optimized build process with analysis.

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [MDX Documentation](https://mdxjs.com/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)

## Support

For development questions or issues:

1. Check this development guide
2. Review the troubleshooting section
3. Check existing issues in the repository
4. Create a new issue with detailed information