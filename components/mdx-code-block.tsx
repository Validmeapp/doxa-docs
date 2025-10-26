import { CodeBlock } from './code-block';

// Utility function to get display name for programming languages
function getLanguageDisplayName(lang: string): string {
  const languageMap: Record<string, string> = {
    js: 'JavaScript',
    javascript: 'JavaScript',
    ts: 'TypeScript',
    typescript: 'TypeScript',
    py: 'Python',
    python: 'Python',
    bash: 'Bash',
    shell: 'Shell',
    json: 'JSON',
    yaml: 'YAML',
    html: 'HTML',
    css: 'CSS',
    sql: 'SQL',
    text: 'Plain Text',
  };
  
  const normalizedLang = lang.toLowerCase().trim();
  return languageMap[normalizedLang] || lang.toUpperCase();
}

interface MDXCodeBlockProps {
  children: string;
  className?: string;
  filename?: string;
  highlightLines?: string;
  showLineNumbers?: boolean;
}

/**
 * MDX-compatible code block component
 * Usage in MDX:
 * ```javascript filename="example.js" highlightLines="2,3,4"
 * const greeting = "Hello World";
 * console.log(greeting);
 * ```
 */
export function MDXCodeBlock({
  children,
  className = '',
  filename,
  highlightLines,
  showLineNumbers = false,
}: MDXCodeBlockProps) {
  // Extract language from className (format: "language-javascript")
  const language = className.replace(/language-/, '') || 'text';
  
  // Parse highlight lines from string format "1,2,3" to number array
  const highlightLinesArray = highlightLines
    ? highlightLines.split(',').map(line => parseInt(line.trim(), 10)).filter(Boolean)
    : [];

  // Validate children prop
  if (typeof children !== 'string') {
    console.error('MDXCodeBlock: children must be a string, received:', typeof children);
    return (
      <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
        <p className="text-sm text-destructive">
          Error: Invalid code content. Expected string, received {typeof children}.
        </p>
      </div>
    );
  }

  // Handle empty code
  if (!children || children.trim().length === 0) {
    return (
      <div className="rounded-lg border bg-muted/50 p-4">
        <p className="text-sm text-muted-foreground italic">
          Empty code block
        </p>
      </div>
    );
  }

  // Debug: Log what we're receiving
  console.log('MDXCodeBlock Debug:', {
    language,
    childrenType: typeof children,
    childrenLength: children?.length,
    childrenPreview: children?.substring(0, 100),
    filename,
    className
  });

  // Add a simple fallback to ensure something renders
  return (
    <div style={{ 
      border: '2px solid red', 
      margin: '1rem 0', 
      borderRadius: '0.5rem', 
      overflow: 'hidden',
      background: 'white'
    }}>
      <div style={{ 
        background: '#f5f5f5', 
        padding: '0.5rem', 
        borderBottom: '1px solid #ccc', 
        fontSize: '0.875rem', 
        fontWeight: '500',
        color: 'black'
      }}>
        DEBUG: {getLanguageDisplayName(language)} ({children?.length || 0} chars)
      </div>
      <pre style={{ 
        margin: '0', 
        padding: '1rem', 
        background: '#fafafa', 
        overflow: 'auto',
        fontFamily: 'Monaco, Consolas, "Courier New", monospace',
        fontSize: '0.875rem',
        lineHeight: '1.5',
        color: 'black',
        whiteSpace: 'pre-wrap'
      }}>
        <code style={{ color: 'black' }}>{children ? children.trim() : 'NO CONTENT'}</code>
      </pre>
    </div>
  );

  // Original CodeBlock component (commented out for now)
  /*
  return (
    <CodeBlock
      code={children.trim()}
      language={language}
      filename={filename}
      highlightLines={highlightLinesArray}
      showLineNumbers={showLineNumbers}
    />
  );
  */
}

interface MDXCodeTabsProps {
  tabs: string; // JSON string of tab configuration
  filename?: string;
  highlightLines?: string;
  showLineNumbers?: boolean;
}

/**
 * MDX-compatible tabbed code block component
 * Usage in MDX:
 * <CodeTabs 
 *   tabs='[{"label":"JavaScript","code":"console.log(\"hello\");","language":"js"},{"label":"Python","code":"print(\"hello\")","language":"python"}]'
 *   filename="examples"
 * />
 */
export function MDXCodeTabs({
  tabs,
  filename,
  highlightLines,
  showLineNumbers = false,
}: MDXCodeTabsProps) {
  let parsedTabs;
  
  // Validate tabs prop
  if (!tabs || typeof tabs !== 'string') {
    console.error('MDXCodeTabs: tabs must be a non-empty string, received:', typeof tabs);
    return (
      <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
        <p className="text-sm text-destructive">
          Error: Invalid tabs configuration. Expected JSON string, received {typeof tabs}.
        </p>
      </div>
    );
  }
  
  try {
    parsedTabs = JSON.parse(tabs);
  } catch (error) {
    console.error('Failed to parse tabs JSON:', error);
    return (
      <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
        <p className="text-sm text-destructive">
          Error: Invalid tabs configuration. Please check the JSON format.
        </p>
        <details className="mt-2">
          <summary className="cursor-pointer text-xs text-destructive/80">Show details</summary>
          <pre className="mt-1 text-xs text-destructive/60">{error instanceof Error ? error.message : String(error)}</pre>
        </details>
      </div>
    );
  }

  // Validate parsed tabs structure
  if (!Array.isArray(parsedTabs)) {
    console.error('MDXCodeTabs: parsed tabs must be an array, received:', typeof parsedTabs);
    return (
      <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
        <p className="text-sm text-destructive">
          Error: Tabs configuration must be an array of tab objects.
        </p>
      </div>
    );
  }

  if (parsedTabs.length === 0) {
    return (
      <div className="rounded-lg border bg-muted/50 p-4">
        <p className="text-sm text-muted-foreground italic">
          No tabs configured
        </p>
      </div>
    );
  }

  // Validate each tab object
  const validTabs = parsedTabs.filter((tab, index) => {
    if (!tab || typeof tab !== 'object') {
      console.warn(`MDXCodeTabs: tab at index ${index} is not an object:`, tab);
      return false;
    }
    if (!tab.label || typeof tab.label !== 'string') {
      console.warn(`MDXCodeTabs: tab at index ${index} missing or invalid label:`, tab);
      return false;
    }
    if (!tab.code || typeof tab.code !== 'string') {
      console.warn(`MDXCodeTabs: tab at index ${index} missing or invalid code:`, tab);
      return false;
    }
    if (!tab.language || typeof tab.language !== 'string') {
      console.warn(`MDXCodeTabs: tab at index ${index} missing or invalid language:`, tab);
      return false;
    }
    return true;
  });

  if (validTabs.length === 0) {
    return (
      <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
        <p className="text-sm text-destructive">
          Error: No valid tabs found. Each tab must have label, code, and language properties.
        </p>
      </div>
    );
  }

  // Parse highlight lines from string format "1,2,3" to number array
  const highlightLinesArray = highlightLines
    ? highlightLines.split(',').map(line => parseInt(line.trim(), 10)).filter(Boolean)
    : [];

  return (
    <CodeBlock
      code=""
      language=""
      tabs={validTabs}
      filename={filename}
      highlightLines={highlightLinesArray}
      showLineNumbers={showLineNumbers}
    />
  );
}

// Export both components for use in MDX
export { MDXCodeBlock as pre, MDXCodeTabs as CodeTabs };
export default MDXCodeBlock;