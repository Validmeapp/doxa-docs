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
 * Enhanced MDX-compatible code block component with flexible language handling
 * Supports both typed and untyped code fences with consistent styling and functionality
 * Usage in MDX:
 * ```javascript filename="example.js" highlightLines="2,3,4"
 * const greeting = "Hello World";
 * console.log(greeting);
 * ```
 * 
 * Or untyped:
 * ```
 * This is plain text without syntax highlighting
 * ```
 */
export function MDXCodeBlock({
  children,
  className = '',
  filename,
  highlightLines,
  showLineNumbers = false,
}: MDXCodeBlockProps) {
  // Extract language from className (format: "language-javascript" or empty for untyped)
  const originalLanguage = className.replace(/language-/, '') || '';
  const isTyped = originalLanguage && originalLanguage.trim().length > 0 && originalLanguage !== 'text';
  const language = isTyped ? originalLanguage : 'text';
  
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
        <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-2 -mx-4 -mt-4 mb-4">
          <span className="rounded bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
            Empty Code Block
          </span>
        </div>
        <p className="text-sm text-muted-foreground italic text-center">
          This code block is empty
        </p>
      </div>
    );
  }

  // Enhanced language display name function
  const getEnhancedLanguageDisplayName = (lang: string, isTypedBlock: boolean): string => {
    if (!isTypedBlock) {
      return 'Plain Text';
    }
    
    const languageMap: Record<string, string> = {
      // JavaScript family
      js: 'JavaScript',
      javascript: 'JavaScript',
      ts: 'TypeScript',
      typescript: 'TypeScript',
      jsx: 'React JSX',
      tsx: 'React TSX',
      
      // Python
      py: 'Python',
      python: 'Python',
      
      // Web technologies
      html: 'HTML',
      css: 'CSS',
      scss: 'SCSS',
      sass: 'Sass',
      less: 'Less',
      
      // Data formats
      json: 'JSON',
      yaml: 'YAML',
      yml: 'YAML',
      xml: 'XML',
      toml: 'TOML',
      
      // Shell/Terminal
      sh: 'Shell',
      shell: 'Shell',
      bash: 'Bash',
      zsh: 'Zsh',
      fish: 'Fish',
      powershell: 'PowerShell',
      cmd: 'Command Prompt',
      
      // Systems programming
      c: 'C',
      cpp: 'C++',
      'c++': 'C++',
      rust: 'Rust',
      rs: 'Rust',
      go: 'Go',
      golang: 'Go',
      
      // Other popular languages
      java: 'Java',
      kotlin: 'Kotlin',
      scala: 'Scala',
      cs: 'C#',
      'c#': 'C#',
      csharp: 'C#',
      php: 'PHP',
      rb: 'Ruby',
      ruby: 'Ruby',
      swift: 'Swift',
      objc: 'Objective-C',
      'objective-c': 'Objective-C',
      
      // Functional languages
      haskell: 'Haskell',
      elm: 'Elm',
      clojure: 'Clojure',
      erlang: 'Erlang',
      elixir: 'Elixir',
      
      // Database
      sql: 'SQL',
      mysql: 'MySQL',
      postgresql: 'PostgreSQL',
      sqlite: 'SQLite',
      
      // Documentation
      md: 'Markdown',
      markdown: 'Markdown',
      mdx: 'MDX',
      
      // Configuration
      ini: 'INI',
      conf: 'Config',
      config: 'Config',
      env: 'Environment',
      dockerfile: 'Dockerfile',
      docker: 'Dockerfile',
      
      // Other
      text: 'Plain Text',
      txt: 'Plain Text',
      log: 'Log File',
      diff: 'Diff',
      patch: 'Patch',
    };
    
    const normalizedLang = lang.toLowerCase().trim();
    return languageMap[normalizedLang] || lang.toUpperCase();
  };

  // Use the CodeBlock component with enhanced language handling
  return (
    <CodeBlock
      code={children.trim()}
      language={language}
      filename={filename}
      highlightLines={highlightLinesArray}
      showLineNumbers={showLineNumbers}
      className={!isTyped ? 'untyped-code-block' : ''}
    />
  );
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