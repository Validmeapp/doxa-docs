'use client';

import { useState, useEffect } from 'react';
import { codeToHtml } from 'shiki';
import { Copy, Check } from 'lucide-react';

// Utility function to get display name for programming languages
function getLanguageDisplayName(lang: string): string {
  const languageMap: Record<string, string> = {
    // JavaScript family
    js: 'JavaScript',
    javascript: 'JavaScript',
    ts: 'TypeScript',
    typescript: 'TypeScript',
    jsx: 'React',
    tsx: 'React',
    
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
    
    // Other
    text: 'Plain Text',
    txt: 'Plain Text',
    log: 'Log File',
    diff: 'Diff',
    patch: 'Patch',
  };
  
  // Normalize language name
  const normalizedLang = lang.toLowerCase().trim();
  return languageMap[normalizedLang] || lang.toUpperCase();
}

// Utility function to normalize language names for Shiki
function normalizeLanguageForShiki(lang: string): string {
  const shikiLanguageMap: Record<string, string> = {
    // Common aliases that Shiki might not recognize
    'js': 'javascript',
    'ts': 'typescript',
    'py': 'python',
    'rb': 'ruby',
    'sh': 'bash',
    'shell': 'bash',
    'yml': 'yaml',
    'md': 'markdown',
    'c++': 'cpp',
    'c#': 'csharp',
    'objective-c': 'objc',
  };
  
  const normalizedLang = lang.toLowerCase().trim();
  return shikiLanguageMap[normalizedLang] || normalizedLang;
}

interface CodeBlockProps {
  code: string;
  language: string;
  filename?: string;
  highlightLines?: number[];
  showLineNumbers?: boolean;
  tabs?: Array<{ label: string; code: string; language: string }>;
  className?: string;
  neutralStyling?: boolean; // New prop for neutral styling mode
}

interface CodeBlockTabProps {
  tabs: Array<{ label: string; code: string; language: string }>;
  filename?: string;
  highlightLines?: number[];
  showLineNumbers?: boolean;
  className?: string;
  neutralStyling?: boolean;
}

export function CodeBlock({
  code,
  language,
  filename,
  highlightLines = [],
  showLineNumbers = false,
  tabs,
  className = '',
  neutralStyling = false,
}: CodeBlockProps) {
  // Enhanced validation for malformed code block content
  if (code === null || code === undefined) {
    console.error('CodeBlock: code prop is null or undefined');
    return (
      <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
        <div className="flex items-center justify-between border-b bg-destructive/20 px-4 py-2 -mx-4 -mt-4 mb-4">
          <span className="rounded bg-destructive/20 px-2 py-1 text-xs font-medium text-destructive">
            Error
          </span>
        </div>
        <p className="text-sm text-destructive">
          Error: Code content is missing. Cannot render code block.
        </p>
      </div>
    );
  }

  if (typeof code !== 'string') {
    console.error('CodeBlock: code must be a string, received:', typeof code, code);
    return (
      <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
        <div className="flex items-center justify-between border-b bg-destructive/20 px-4 py-2 -mx-4 -mt-4 mb-4">
          <span className="rounded bg-destructive/20 px-2 py-1 text-xs font-medium text-destructive">
            Error
          </span>
        </div>
        <p className="text-sm text-destructive">
          Error: Invalid code content. Expected string, received {typeof code}.
        </p>
      </div>
    );
  }

  // If tabs are provided, render the tabbed interface
  if (tabs && tabs.length > 0) {
    return (
      <CodeBlockTabs
        tabs={tabs}
        filename={filename}
        highlightLines={highlightLines}
        showLineNumbers={showLineNumbers}
        className={className}
        neutralStyling={neutralStyling}
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
      neutralStyling={neutralStyling}
    />
  );
}

function CodeBlockTabs({
  tabs,
  filename,
  highlightLines = [],
  showLineNumbers = false,
  className = '',
  neutralStyling = false,
}: CodeBlockTabProps) {
  const [activeTab, setActiveTab] = useState(0);

  // Keyboard navigation for tabs
  const handleKeyDown = (event: React.KeyboardEvent, index: number) => {
    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        if (index > 0) {
          setActiveTab(index - 1);
          // Focus the previous tab
          setTimeout(() => {
            const prevTab = document.getElementById(`tab-${index - 1}`);
            prevTab?.focus();
          }, 0);
        }
        break;
      case 'ArrowRight':
        event.preventDefault();
        if (index < tabs.length - 1) {
          setActiveTab(index + 1);
          // Focus the next tab
          setTimeout(() => {
            const nextTab = document.getElementById(`tab-${index + 1}`);
            nextTab?.focus();
          }, 0);
        }
        break;
      case 'Home':
        event.preventDefault();
        setActiveTab(0);
        setTimeout(() => {
          const firstTab = document.getElementById('tab-0');
          firstTab?.focus();
        }, 0);
        break;
      case 'End':
        event.preventDefault();
        setActiveTab(tabs.length - 1);
        setTimeout(() => {
          const lastTab = document.getElementById(`tab-${tabs.length - 1}`);
          lastTab?.focus();
        }, 0);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        setActiveTab(index);
        break;
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
          neutralStyling={neutralStyling}
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
  neutralStyling?: boolean;
}

function SingleCodeBlock({
  code,
  language,
  filename,
  highlightLines = [],
  showLineNumbers = false,
  className = '',
  hideHeader = false,
  neutralStyling = false,
}: SingleCodeBlockProps) {
  const [highlightedCode, setHighlightedCode] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Determine validation state (compute before hooks to use in useEffect)
  const isCodeNull = code === null || code === undefined;
  const isCodeNotString = !isCodeNull && typeof code !== 'string';
  const isCodeEmpty = !isCodeNull && !isCodeNotString && typeof code === 'string' && code.trim().length === 0;
  const isValidCode = !isCodeNull && !isCodeNotString && !isCodeEmpty;

  // Determine if this is a typed or untyped code block
  const normalizedLanguage = language ? language.trim().toLowerCase() : '';
  const isTyped = normalizedLanguage &&
                  normalizedLanguage.length > 0 &&
                  normalizedLanguage !== 'text' &&
                  normalizedLanguage !== 'plain' &&
                  normalizedLanguage !== 'none';

  // Use neutralStyling prop or detect from className for backward compatibility
  const isUntypedBlock = neutralStyling ||
                         className.includes('untyped-code-block') ||
                         className.includes('neutral-styling') ||
                         !isTyped;

  // Hook must be called unconditionally - before any returns
  useEffect(() => {
    // Skip processing for invalid code
    if (!isValidCode) {
      setIsLoading(false);
      return;
    }

    const highlightCode = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Handle untyped code blocks with neutral styling (requirement 3.2, 3.3)
        if (isUntypedBlock || language === 'text' || !language) {
          // Use consistent neutral styling for untyped blocks
          const neutralHtml = `<pre class="neutral-code-block" style="margin: 0; padding: 0; background: transparent; font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace; font-size: inherit; line-height: inherit; color: var(--foreground, #374151); white-space: pre-wrap; word-wrap: break-word; overflow-wrap: break-word;"><code class="language-text">${escapeHtml(code)}</code></pre>`;
          setHighlightedCode(neutralHtml);
          setIsLoading(false);
          return;
        }

        const normalizedLanguage = normalizeLanguageForShiki(language);
        
        const html = await codeToHtml(code, {
          lang: normalizedLanguage,
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
        const errorMessage = error instanceof Error ? error.message : 'Unknown highlighting error';
        setError(errorMessage);
        
        // Enhanced fallback with consistent styling (requirement 6.3)
        // Fall back to plain text rendering without breaking the page
        const fallbackHtml = `<pre class="fallback-code-block neutral-code-block" style="margin: 0; padding: 0; background: transparent; font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace; font-size: inherit; line-height: inherit; color: var(--foreground, #374151); white-space: pre-wrap; word-wrap: break-word; overflow-wrap: break-word;"><code class="language-text">${escapeHtml(code)}</code></pre>`;
        setHighlightedCode(fallbackHtml);
      } finally {
        setIsLoading(false);
      }
    };

    highlightCode();
  }, [code, language, highlightLines, isUntypedBlock, isValidCode]);

  const handleCopy = async () => {
    try {
      // Enhanced copy functionality for reliability across browsers (requirement 6.4)
      
      // First, try the modern clipboard API
      if (navigator.clipboard && window.isSecureContext) {
        try {
          await navigator.clipboard.writeText(code);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
          return;
        } catch (clipboardError) {
          console.warn('Clipboard API failed, trying fallback:', clipboardError);
          // Continue to fallback method
        }
      }

      // Fallback method for older browsers or when clipboard API fails
      const textArea = document.createElement('textarea');
      textArea.value = code;
      
      // Make the textarea invisible but accessible
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      textArea.style.width = '1px';
      textArea.style.height = '1px';
      textArea.style.padding = '0';
      textArea.style.border = 'none';
      textArea.style.outline = 'none';
      textArea.style.boxShadow = 'none';
      textArea.style.background = 'transparent';
      textArea.setAttribute('readonly', '');
      textArea.setAttribute('aria-hidden', 'true');
      
      document.body.appendChild(textArea);
      
      try {
        // Focus and select the text
        textArea.focus();
        textArea.select();
        textArea.setSelectionRange(0, code.length);
        
        // Try to copy using execCommand
        const successful = document.execCommand('copy');
        if (successful) {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } else {
          throw new Error('execCommand copy returned false');
        }
      } catch (fallbackError) {
        console.error('All copy methods failed:', fallbackError);
        
        // Final fallback - show a modal with the code for manual copying
        const shouldShowCode = window.confirm(
          'Automatic copying failed. Would you like to see the code in a dialog to copy manually?'
        );
        
        if (shouldShowCode) {
          // Create a simple modal-like dialog
          const modal = document.createElement('div');
          modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
          `;
          
          const content = document.createElement('div');
          content.style.cssText = `
            background: white;
            padding: 20px;
            border-radius: 8px;
            max-width: 80%;
            max-height: 80%;
            overflow: auto;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          `;
          
          const title = document.createElement('h3');
          title.textContent = 'Copy Code Manually';
          title.style.marginTop = '0';
          
          const codeDisplay = document.createElement('pre');
          codeDisplay.textContent = code;
          codeDisplay.style.cssText = `
            background: #f5f5f5;
            padding: 10px;
            border-radius: 4px;
            overflow: auto;
            font-family: monospace;
            white-space: pre-wrap;
            word-wrap: break-word;
          `;
          
          const closeButton = document.createElement('button');
          closeButton.textContent = 'Close';
          closeButton.style.cssText = `
            margin-top: 10px;
            padding: 8px 16px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
          `;
          
          closeButton.onclick = () => document.body.removeChild(modal);
          
          content.appendChild(title);
          content.appendChild(codeDisplay);
          content.appendChild(closeButton);
          modal.appendChild(content);
          document.body.appendChild(modal);
          
          // Auto-select the code for easier copying
          const selection = window.getSelection();
          const range = document.createRange();
          range.selectNodeContents(codeDisplay);
          selection?.removeAllRanges();
          selection?.addRange(range);
        }
      } finally {
        document.body.removeChild(textArea);
      }
    } catch (error) {
      console.error('Copy operation failed completely:', error);
    }
  };

  // Render error states for invalid code (after hooks, using state variables)
  if (isCodeNull) {
    console.error('SingleCodeBlock: code is null or undefined');
    return (
      <div className={`rounded-lg border border-destructive bg-destructive/10 p-4 ${className}`}>
        <div className="flex items-center justify-between border-b bg-destructive/20 px-4 py-2 -mx-4 -mt-4 mb-4">
          <span className="rounded bg-destructive/20 px-2 py-1 text-xs font-medium text-destructive">
            Error
          </span>
        </div>
        <p className="text-sm text-destructive">
          Error: Code content is missing. Cannot render code block.
        </p>
      </div>
    );
  }

  if (isCodeNotString) {
    console.error('SingleCodeBlock: code must be a string, received:', typeof code, code);
    return (
      <div className={`rounded-lg border border-destructive bg-destructive/10 p-4 ${className}`}>
        <div className="flex items-center justify-between border-b bg-destructive/20 px-4 py-2 -mx-4 -mt-4 mb-4">
          <span className="rounded bg-destructive/20 px-2 py-1 text-xs font-medium text-destructive">
            Error
          </span>
        </div>
        <p className="text-sm text-destructive">
          Error: Invalid code content. Expected string, received {typeof code}.
        </p>
      </div>
    );
  }

  // Handle empty code blocks with clear message (requirement 6.5)
  if (isCodeEmpty) {
    return (
      <div className={`rounded-lg border bg-muted/50 p-4 ${className}`}>
        {!hideHeader && (
          <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-2 -mx-4 -mt-4 mb-4">
            <span className="rounded bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
              Empty Code Block
            </span>
          </div>
        )}
        <p className="text-sm text-muted-foreground italic text-center py-4">
          This code block is empty
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`relative rounded-lg border bg-muted/50 ${className}`}>
        {!hideHeader && (
          <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-2">
            <div className="flex items-center gap-2">
              <div className="h-4 w-16 animate-pulse rounded bg-muted"></div>
              {filename && (
                <div className="h-4 w-24 animate-pulse rounded bg-muted"></div>
              )}
            </div>
            <div className="h-6 w-16 animate-pulse rounded bg-muted"></div>
          </div>
        )}
        <div className="p-4">
          <div className="space-y-2">
            <div className="h-4 w-full animate-pulse rounded bg-muted"></div>
            <div className="h-4 w-3/4 animate-pulse rounded bg-muted"></div>
            <div className="h-4 w-1/2 animate-pulse rounded bg-muted"></div>
            <div className="h-4 w-5/6 animate-pulse rounded bg-muted"></div>
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <div className="h-3 w-3 animate-spin rounded-full border border-primary border-t-transparent"></div>
            {isUntypedBlock ? 'Preparing plain text...' : `Highlighting ${getLanguageDisplayName(language)} code...`}
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
            <span className={`rounded px-2 py-1 text-xs font-medium ${
              error 
                ? 'bg-destructive/10 text-destructive' 
                : isUntypedBlock 
                  ? 'bg-muted text-muted-foreground'
                  : 'bg-primary/10 text-primary'
            }`}>
              {isUntypedBlock ? 'Plain Text' : getLanguageDisplayName(language)}
              {error && !isUntypedBlock && ' (fallback)'}
            </span>
            {filename && (
              <span className="text-xs text-muted-foreground">{filename}</span>
            )}
            {isUntypedBlock && !error && (
              <span className="text-xs text-muted-foreground italic">
                No syntax highlighting
              </span>
            )}
            {error && !isUntypedBlock && (
              <span className="text-xs text-destructive" title={error}>
                ⚠️ Highlighting failed
              </span>
            )}
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground opacity-0 transition-all hover:bg-muted hover:text-foreground group-hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            title="Copy to clipboard"
            aria-label="Copy code to clipboard"
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
      <div className="relative overflow-x-auto" role="region" aria-label={`Code example in ${getLanguageDisplayName(language)}`}>
        <div
          className={`code-block-content ${error && !isUntypedBlock ? 'fallback-highlighting' : ''} ${isUntypedBlock ? 'untyped-code-content neutral-styling' : ''}`}
          style={{
            padding: '1rem',
            fontFamily: 'SF Mono, Monaco, Cascadia Code, Roboto Mono, Consolas, Courier New, monospace',
            fontSize: '0.875rem',
            lineHeight: '1.5',
            background: 'var(--code-background, #ffffff)',
            color: 'var(--code-foreground, inherit)',
            overflowX: 'auto',
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word',
            // Enhanced handling for very long lines (requirement 6.2)
            overflowWrap: 'break-word',
            wordBreak: 'break-word',
            // Ensure consistent horizontal scroll behavior
            minWidth: '0',
          }}
          dangerouslySetInnerHTML={{ __html: highlightedCode }}
          role="code"
          aria-label={`${getLanguageDisplayName(language)} code${filename ? ` from ${filename}` : ''}`}
        />
        {/* Copy button for headerless blocks */}
        {hideHeader && (
          <button
            onClick={handleCopy}
            className="absolute right-2 top-2 flex items-center gap-1 rounded bg-background/80 px-2 py-1 text-xs text-muted-foreground opacity-0 backdrop-blur-sm transition-all hover:bg-background hover:text-foreground group-hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            title="Copy to clipboard"
            aria-label={`Copy ${getLanguageDisplayName(language)} code to clipboard`}
            aria-describedby={copied ? 'copy-success' : undefined}
          >
            {copied ? (
              <>
                <Check className="h-3 w-3" />
                <span id="copy-success">Copied!</span>
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