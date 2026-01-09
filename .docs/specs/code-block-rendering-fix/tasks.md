# Implementation Plan

- [x] 1. Fix MDX processor to preserve code blocks for client-side rendering
  - Remove server-side Shiki processing from remarkShikiHighlight function
  - Modify MDX processor to preserve code blocks in their original markdown form
  - Ensure code blocks are passed to React components instead of being converted to HTML
  - _Requirements: 1.1, 1.2, 3.2_

- [x] 2. Update content rendering to use MDX components properly
  - Configure MDX component mapping to use CodeBlock components for pre/code elements
  - Ensure MDXCodeBlock component receives proper props from markdown parsing
  - Test that code blocks render as React components instead of raw HTML
  - _Requirements: 1.1, 3.1, 3.2_

- [x] 3. Enhance CodeBlock component for client-side highlighting
  - Integrate Shiki for client-side syntax highlighting in CodeBlock component
  - Implement proper error handling and fallback for unsupported languages
  - Ensure copy-to-clipboard functionality works correctly
  - Add loading states for syntax highlighting
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 4.3_

- [ ] 4. Fix theme integration and styling
  - Ensure code blocks work properly with light/dark theme switching
  - Update CSS variables and styling for proper contrast in both themes
  - Test responsive behavior and overflow handling
  - _Requirements: 2.3, 2.4_

- [ ] 5. Clean up conflicting dependencies and systems
  - Remove unused Prism.js dependency
  - Remove or disable custom syntax-highlighter component
  - Ensure single source of truth for code highlighting
  - _Requirements: 4.1, 4.2_

- [ ] 6. Test and validate code block rendering across content
  - Test code blocks in existing MDX files (users.mdx, webhooks.mdx)
  - Verify syntax highlighting works for all supported languages (JSON, JavaScript, Python, Bash)
  - Test copy functionality and interactive features
  - Verify performance with multiple code blocks on a page
  - _Requirements: 2.1, 2.2, 4.1, 4.2_

- [ ] 7. Add error boundaries and improve error handling
  - Implement error boundaries around code block components
  - Add graceful fallback for highlighting failures
  - Ensure build process doesn't fail on code block processing errors
  - _Requirements: 4.3, 4.4_