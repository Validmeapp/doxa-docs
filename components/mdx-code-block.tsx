import { CodeBlock } from './code-block';

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

  return (
    <CodeBlock
      code={children.trim()}
      language={language}
      filename={filename}
      highlightLines={highlightLinesArray}
      showLineNumbers={showLineNumbers}
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
  
  try {
    parsedTabs = JSON.parse(tabs);
  } catch (error) {
    console.error('Failed to parse tabs JSON:', error);
    return (
      <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
        <p className="text-sm text-destructive">
          Error: Invalid tabs configuration. Please check the JSON format.
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
      tabs={parsedTabs}
      filename={filename}
      highlightLines={highlightLinesArray}
      showLineNumbers={showLineNumbers}
    />
  );
}

// Export both components for use in MDX
export { MDXCodeBlock as pre, MDXCodeTabs as CodeTabs };
export default MDXCodeBlock;