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
  const [error, setError] = useState<string | null>(null);

  console.log('SingleCodeBlock rendering:', { language, codeLength: code?.length, isLoading, error });

  useEffect(() => {
    const highlightCode = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Validate inputs
        if (!code || typeof code !== 'string') {
          throw new Error('Invalid code content');
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
        setError(error instanceof Error ? error.message : 'Unknown highlighting error');
        
        // Enhanced fallback with better formatting
        const fallbackHtml = `<pre class="fallback-code-block"><code class="language-${language}">${escapeHtml(code)}</code></pre>`;
        setHighlightedCode(fallbackHtml);
      } finally {
        setIsLoading(false);
      }
    };

    highlightCode();
  }, [code, language, highlightLines]);

  const handleCopy = async () => {
    try {
      // Check if clipboard API is available
      if (!navigator.clipboard) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = code;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
          document.execCommand('copy');
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch (fallbackError) {
          console.error('Fallback copy failed:', fallbackError);
          // Show user-friendly error
          alert('Copy failed. Please select and copy the code manually.');
        } finally {
          document.body.removeChild(textArea);
        }
        return;
      }

      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy code:', error);
      // Show user-friendly error
      alert('Copy failed. Please select and copy the code manually.');
    }
  };



  if (isLoading) {
    return (
      <div className={`relative rounded-lg border bg-muted/50 ${className}`} style={{ background: 'yellow', padding: '20px', margin: '10px 0' }}>
        <div style={{ color: 'black', fontWeight: 'bold' }}>DEBUG: Loading state - Language: {language}</div>
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
            Highlighting {getLanguageDisplayName(language)} code...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`group relative rounded-lg border bg-muted/50 ${className}`} style={{ background: 'lightblue', border: '2px solid blue', margin: '10px 0' }}>
      <div style={{ background: 'blue', color: 'white', padding: '5px' }}>
        DEBUG: CodeBlock rendered - Language: {language}, Error: {error || 'none'}
      </div>
      {/* Header with language badge and copy button */}
      {!hideHeader && (
        <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-2">
          <div className="flex items-center gap-2">
            <span className={`rounded px-2 py-1 text-xs font-medium ${
              error 
                ? 'bg-destructive/10 text-destructive' 
                : 'bg-primary/10 text-primary'
            }`}>
              {getLanguageDisplayName(language)}
              {error && ' (fallback)'}
            </span>
            {filename && (
              <span className="text-xs text-muted-foreground">{filename}</span>
            )}
            {error && (
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
          className={`code-block-content ${error ? 'fallback-highlighting' : ''}`}
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