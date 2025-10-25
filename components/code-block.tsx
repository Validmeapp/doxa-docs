'use client';

import { useState, useEffect } from 'react';
import { codeToHtml } from 'shiki';
import { Copy, Check } from 'lucide-react';

// Utility function to get display name for programming languages
function getLanguageDisplayName(lang: string): string {
  const languageMap: Record<string, string> = {
    js: 'JavaScript',
    ts: 'TypeScript',
    jsx: 'React',
    tsx: 'React',
    py: 'Python',
    rb: 'Ruby',
    go: 'Go',
    rs: 'Rust',
    php: 'PHP',
    java: 'Java',
    cpp: 'C++',
    c: 'C',
    cs: 'C#',
    sh: 'Shell',
    bash: 'Bash',
    zsh: 'Zsh',
    fish: 'Fish',
    json: 'JSON',
    yaml: 'YAML',
    yml: 'YAML',
    xml: 'XML',
    html: 'HTML',
    css: 'CSS',
    scss: 'SCSS',
    sass: 'Sass',
    less: 'Less',
    sql: 'SQL',
    md: 'Markdown',
    mdx: 'MDX',
  };
  return languageMap[lang] || lang.toUpperCase();
}

interface CodeBlockProps {
  code: string;
  language: string;
  filename?: string;
  highlightLines?: number[];
  showLineNumbers?: boolean;
  tabs?: Array<{ label: string; code: string; language: string }>;
  className?: string;
}

interface CodeBlockTabProps {
  tabs: Array<{ label: string; code: string; language: string }>;
  filename?: string;
  highlightLines?: number[];
  showLineNumbers?: boolean;
  className?: string;
}

export function CodeBlock({
  code,
  language,
  filename,
  highlightLines = [],
  showLineNumbers = false,
  tabs,
  className = '',
}: CodeBlockProps) {
  // If tabs are provided, render the tabbed interface
  if (tabs && tabs.length > 0) {
    return (
      <CodeBlockTabs
        tabs={tabs}
        filename={filename}
        highlightLines={highlightLines}
        showLineNumbers={showLineNumbers}
        className={className}
      />
    );
  }

  // Render single code block
  return (
    <SingleCodeBlock
      code={code}
      language={language}
      filename={filename}
      highlightLines={highlightLines}
      showLineNumbers={showLineNumbers}
      className={className}
    />
  );
}

function CodeBlockTabs({
  tabs,
  filename,
  highlightLines = [],
  showLineNumbers = false,
  className = '',
}: CodeBlockTabProps) {
  const [activeTab, setActiveTab] = useState(0);

  // Keyboard navigation for tabs
  const handleKeyDown = (event: React.KeyboardEvent, index: number) => {
    if (event.key === 'ArrowLeft' && index > 0) {
      setActiveTab(index - 1);
    } else if (event.key === 'ArrowRight' && index < tabs.length - 1) {
      setActiveTab(index + 1);
    } else if (event.key === 'Home') {
      setActiveTab(0);
    } else if (event.key === 'End') {
      setActiveTab(tabs.length - 1);
    }
  };

  return (
    <div className={`relative rounded-lg border bg-muted/50 ${className}`}>
      {/* Tab Headers */}
      <div className="flex items-center border-b bg-muted/30">
        <div className="flex" role="tablist" aria-label="Code examples">
          {tabs.map((tab, index) => (
            <button
              key={index}
              role="tab"
              aria-selected={activeTab === index}
              aria-controls={`tabpanel-${index}`}
              id={`tab-${index}`}
              tabIndex={activeTab === index ? 0 : -1}
              onClick={() => setActiveTab(index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className={`px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                activeTab === index
                  ? 'border-b-2 border-primary bg-background text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span className="flex items-center gap-2">
                {tab.label}
                <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
                  {getLanguageDisplayName(tab.language)}
                </span>
              </span>
            </button>
          ))}
        </div>
        {filename && (
          <div className="ml-auto px-4 py-2 text-xs text-muted-foreground">
            {filename}
          </div>
        )}
      </div>

      {/* Active Tab Content */}
      <div
        role="tabpanel"
        id={`tabpanel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
      >
        <SingleCodeBlock
          code={tabs[activeTab].code}
          language={tabs[activeTab].language}
          highlightLines={highlightLines}
          showLineNumbers={showLineNumbers}
          className="border-0 rounded-t-none"
          hideHeader={true} // Don't show duplicate language badge
        />
      </div>
    </div>
  );
}

interface SingleCodeBlockProps {
  code: string;
  language: string;
  filename?: string;
  highlightLines?: number[];
  showLineNumbers?: boolean;
  className?: string;
  hideHeader?: boolean;
}

function SingleCodeBlock({
  code,
  language,
  filename,
  highlightLines = [],
  showLineNumbers = false,
  className = '',
  hideHeader = false,
}: SingleCodeBlockProps) {
  const [highlightedCode, setHighlightedCode] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const highlightCode = async () => {
      try {
        setIsLoading(true);
        const html = await codeToHtml(code, {
          lang: language,
          themes: {
            light: 'github-light',
            dark: 'github-dark',
          },
          defaultColor: false,
          cssVariablePrefix: '--shiki-',
          transformers: [
            {
              name: 'line-highlight',
              line(node, line) {
                if (highlightLines.includes(line)) {
                  this.addClassToHast(node, 'highlighted-line');
                }
              },
            },
          ],
        });
        setHighlightedCode(html);
      } catch (error) {
        console.error('Failed to highlight code:', error);
        // Fallback to plain text
        setHighlightedCode(`<pre><code>${escapeHtml(code)}</code></pre>`);
      } finally {
        setIsLoading(false);
      }
    };

    highlightCode();
  }, [code, language, highlightLines]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy code:', error);
    }
  };



  if (isLoading) {
    return (
      <div className={`relative rounded-lg border bg-muted/50 ${className}`}>
        <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-2">
          <div className="flex items-center gap-2">
            <div className="h-4 w-16 animate-pulse rounded bg-muted"></div>
            {filename && (
              <div className="h-4 w-24 animate-pulse rounded bg-muted"></div>
            )}
          </div>
        </div>
        <div className="p-4">
          <div className="space-y-2">
            <div className="h-4 w-full animate-pulse rounded bg-muted"></div>
            <div className="h-4 w-3/4 animate-pulse rounded bg-muted"></div>
            <div className="h-4 w-1/2 animate-pulse rounded bg-muted"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`group relative rounded-lg border bg-muted/50 ${className}`}>
      {/* Header with language badge and copy button */}
      {!hideHeader && (
        <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-2">
          <div className="flex items-center gap-2">
            <span className="rounded bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
              {getLanguageDisplayName(language)}
            </span>
            {filename && (
              <span className="text-xs text-muted-foreground">{filename}</span>
            )}
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground opacity-0 transition-all hover:bg-muted hover:text-foreground group-hover:opacity-100"
            title="Copy to clipboard"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                Copy
              </>
            )}
          </button>
        </div>
      )}

      {/* Code content */}
      <div className="relative overflow-x-auto">
        <div
          className="code-block-content"
          dangerouslySetInnerHTML={{ __html: highlightedCode }}
        />
        {/* Copy button for headerless blocks */}
        {hideHeader && (
          <button
            onClick={handleCopy}
            className="absolute right-2 top-2 flex items-center gap-1 rounded bg-background/80 px-2 py-1 text-xs text-muted-foreground opacity-0 backdrop-blur-sm transition-all hover:bg-background hover:text-foreground group-hover:opacity-100"
            title="Copy to clipboard"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                Copy
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// Utility function to escape HTML
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export default CodeBlock;