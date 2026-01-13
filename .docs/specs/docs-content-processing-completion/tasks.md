# Implementation Plan

- [x] 1. Enhance ContentLoader for home document handling
  - Implement `getHomeDocument` method to check for index.mdx files in locale/version directories
  - Create `findIndexFile` method to locate index.mdx with proper path resolution
  - Add `generateMissingHomeContent` method to create friendly fallback content when index.mdx is missing
  - Update `getContentBySlug` to handle empty slug as home document request
  - Write unit tests for home document resolution logic
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 2. Create missing home document fallback component
  - Design and implement `MissingHomePage` component with friendly messaging
  - Include instructions for creating index.mdx files
  - Display available content in current locale/version
  - Add proper styling consistent with existing design system
  - Implement accessibility features (ARIA labels, keyboard navigation)
  - Write component tests for different scenarios
  - _Requirements: 1.4, 1.5_

- [x] 3. Update docs page routing to handle home documents
  - Modify `app/[locale]/docs/page.tsx` to use enhanced ContentLoader home document methods
  - Implement fallback rendering when index.mdx is missing
  - Update `app/[locale]/docs/[...slug]/page.tsx` to handle empty slug arrays as home requests
  - Add proper error handling and loading states
  - Test routing behavior with and without index.mdx files
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 4. Enhance NavigationBuilder with filesystem-based generation
  - Implement `buildFilesystemNavigation` method for single-pass directory traversal
  - Create `formatDirectoryName` method to generate human-friendly labels from directory names
  - Add support for frontmatter `sidebar_position` field in navigation ordering
  - Implement directory-based grouping with collapsible sections
  - Write comprehensive tests for various directory structures
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.7_

- [x] 5. Add sidebar configuration support
  - Define `SidebarConfig` interface and related types
  - Implement `loadSidebarConfig` method to read _sidebar.json or _sidebar.mjs files
  - Create `applySidebarConfig` method to apply custom ordering, hiding, and labeling
  - Add validation for sidebar configuration files
  - Implement fallback to filesystem-based navigation when config is invalid
  - Write tests for configuration loading and application
  - _Requirements: 2.5, 2.6_

- [x] 6. Update NavigationBuilder to integrate new features
  - Modify `buildNavigationTree` to use new filesystem-based generation
  - Integrate sidebar configuration support with filesystem scanning
  - Ensure backward compatibility with existing navigation structure
  - Add performance optimizations for large directory trees
  - Update navigation validation to handle new features
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

- [x] 7. Enhance MDXProcessor for flexible code block handling
  - Modify `remarkRenderCodeBlocks` plugin to handle untyped code fences
  - Implement neutral styling for code blocks without language specification
  - Ensure copy button functionality works for both typed and untyped blocks
  - Add graceful fallback when syntax highlighting fails
  - Implement proper horizontal scroll and line wrapping for all code blocks
  - Write tests for various code block scenarios
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 8. Update code block components for consistency
  - Modify `MDXCodeBlock` component to handle missing language gracefully
  - Ensure consistent styling between typed and untyped code blocks
  - Update `CodeBlock` component to support neutral styling mode
  - Add proper error handling for malformed code block content
  - Test code block rendering across different content types
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 9. Create LinkAuditor class for comprehensive link validation
  - Implement `LinkAuditor` class with core link validation methods
  - Create `auditAllLinks` method to scan all markdown files for internal links
  - Implement `findPlausibleTarget` method to suggest fixes for broken links
  - Add `normalizeLink` method to ensure links are locale/version-aware
  - Create detailed audit reporting with broken and fixable links
  - Write comprehensive tests for link validation logic
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 10. Implement automatic link fixing functionality
  - Create `fixBrokenLinks` method to automatically rewrite fixable links
  - Implement link stripping for unfixable links while preserving text
  - Add file backup functionality before making link modifications
  - Create detailed logging of all link modifications
  - Implement dry-run mode for testing link fixes
  - Write tests for link fixing scenarios
  - _Requirements: 4.2, 4.3, 4.4_

- [ ] 11. Integrate link auditing with build process
  - Add link validation to content loading pipeline
  - Implement build failure on newly introduced broken links
  - Create CLI command for running link auditor independently
  - Add progress indicators for long-running link validation
  - Implement incremental link validation for changed files only
  - Write integration tests for build process integration
  - _Requirements: 4.6, 4.7_

- [ ] 12. Add comprehensive error handling and logging
  - Implement detailed error logging for all content processing steps
  - Add graceful degradation for partial content loading failures
  - Create user-friendly error messages for common issues
  - Implement timeout handling for long-running operations
  - Add performance monitoring and reporting
  - Write tests for error handling scenarios
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 13. Create CLI tools for content management
  - Implement CLI command for running link auditor independently
  - Create content validation command for checking frontmatter and structure
  - Add navigation tree debugging command
  - Implement content statistics and reporting commands
  - Create documentation for CLI tools usage
  - Write tests for CLI functionality
  - _Requirements: 4.7, 5.2_

- [ ] 14. Update existing components to use enhanced features
  - Modify `Sidebar` component to work with enhanced navigation structure
  - Update docs layout components to handle missing home documents
  - Ensure all existing functionality continues to work with enhancements
  - Add loading states and error boundaries where needed
  - Test component integration with new features
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4_

- [ ] 15. Add comprehensive testing and documentation
  - Write integration tests for complete content processing pipeline
  - Create performance tests for large documentation sites
  - Add accessibility tests for new components and features
  - Update documentation for new features and configuration options
  - Create migration guide for existing documentation sites
  - Write troubleshooting guide for common issues
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_