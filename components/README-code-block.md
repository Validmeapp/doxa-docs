# CodeBlock Component

The enhanced CodeBlock component provides syntax highlighting, copy-to-clipboard functionality, and multi-tab support for code examples in the documentation portal.

## Features

- ✅ Syntax highlighting with Shiki
- ✅ Copy-to-clipboard functionality with visual feedback
- ✅ Language detection and display badges
- ✅ Multi-tab support for request/response examples
- ✅ Line highlighting support
- ✅ Keyboard navigation for tabs
- ✅ Accessibility features (ARIA labels, keyboard support)
- ✅ Dark/light theme support
- ✅ MDX integration

## Basic Usage

```tsx
import { CodeBlock } from './code-block';

// Simple code block
<CodeBlock
  code="console.log('Hello, World!');"
  language="javascript"
  filename="hello.js"
/>

// With line highlighting
<CodeBlock
  code={multiLineCode}
  language="typescript"
  filename="example.ts"
  highlightLines={[2, 3, 4]}
  showLineNumbers={true}
/>
```

## Multi-Tab Usage

```tsx
const tabs = [
  { 
    label: 'JavaScript', 
    code: 'console.log("Hello");', 
    language: 'javascript' 
  },
  { 
    label: 'Python', 
    code: 'print("Hello")', 
    language: 'python' 
  },
];

<CodeBlock
  code=""
  language=""
  tabs={tabs}
  filename="examples"
/>
```

## MDX Integration

For use in MDX files, use the MDX wrapper components:

```mdx
<!-- Simple code block -->
```javascript filename="example.js" highlightLines="2,3"
function greet(name) {
  console.log(`Hello, ${name}!`);
}
```

<!-- Multi-tab code block -->
<CodeTabs 
  tabs='[{"label":"cURL","code":"curl -X GET https://api.example.com","language":"bash"},{"label":"Response","code":"{\"status\":\"success\"}","language":"json"}]'
  filename="api-example"
/>
```

## Props

### CodeBlock Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `code` | `string` | - | The code content to display |
| `language` | `string` | - | Programming language for syntax highlighting |
| `filename` | `string` | - | Optional filename to display in header |
| `highlightLines` | `number[]` | `[]` | Array of line numbers to highlight |
| `showLineNumbers` | `boolean` | `false` | Whether to show line numbers |
| `tabs` | `Tab[]` | - | Array of tabs for multi-tab interface |
| `className` | `string` | `''` | Additional CSS classes |

### Tab Interface

```typescript
interface Tab {
  label: string;      // Display name for the tab
  code: string;       // Code content for this tab
  language: string;   // Programming language for syntax highlighting
}
```

## Supported Languages

The component supports all languages supported by Shiki, with friendly display names for common languages:

- JavaScript/TypeScript
- Python
- Go, Rust, Java, C++, C#
- Shell/Bash
- JSON, YAML, XML
- HTML, CSS, SCSS
- SQL, Markdown, MDX
- And many more...

## Keyboard Navigation

- **Tab**: Navigate between UI elements
- **Arrow Left/Right**: Switch between tabs
- **Home/End**: Jump to first/last tab
- **Enter/Space**: Activate buttons

## Accessibility Features

- Semantic HTML with proper ARIA labels
- Keyboard navigation support
- Screen reader compatible
- High contrast support
- Focus indicators

## Styling

The component uses CSS variables for theming and integrates with the Tailwind CSS design system. Custom styles can be applied via the `className` prop or by overriding CSS variables:

```css
.code-block-content {
  --shiki-color-text: /* custom text color */;
  --shiki-token-keyword: /* custom keyword color */;
  /* ... other Shiki variables */
}
```

## Testing

Run the component tests with:

```bash
npm run test:code-block
```

This tests:
- Shiki syntax highlighting
- Language mapping
- Highlight lines parsing
- Tabs configuration parsing