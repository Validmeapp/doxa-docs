'use client';

import { useEffect } from 'react';

export function SyntaxHighlighter() {
  useEffect(() => {
    // Simple regex-based syntax highlighting for JSON
    const highlightJSON = () => {
      const codeBlocks = document.querySelectorAll('code.language-json');
      
      codeBlocks.forEach((block) => {
        if (block.getAttribute('data-highlighted')) return;
        
        let html = block.innerHTML;
        
        // Highlight JSON syntax
        html = html
          // Property names (keys)
          .replace(/"([^"]+)"(\s*:)/g, '<span class="token property">"$1"</span>$2')
          // String values
          .replace(/:\s*"([^"]*)"(?=\s*[,\}\]])/g, ': <span class="token string">"$1"</span>')
          // Numbers
          .replace(/:\s*(\d+\.?\d*)(?=\s*[,\}\]])/g, ': <span class="token number">$1</span>')
          // Booleans
          .replace(/:\s*(true|false)(?=\s*[,\}\]])/g, ': <span class="token boolean">$1</span>')
          // Null
          .replace(/:\s*(null)(?=\s*[,\}\]])/g, ': <span class="token null">$1</span>');
        
        block.innerHTML = html;
        block.setAttribute('data-highlighted', 'true');
      });
    };

    // Simple regex-based syntax highlighting for JavaScript
    const highlightJavaScript = () => {
      const codeBlocks = document.querySelectorAll('code.language-javascript, code.language-js');
      
      codeBlocks.forEach((block) => {
        if (block.getAttribute('data-highlighted')) return;
        
        let html = block.innerHTML;
        
        // Highlight JavaScript syntax
        html = html
          // Keywords
          .replace(/\b(const|let|var|function|return|if|else|for|while|class|import|export|from|async|await)\b/g, '<span class="token keyword">$1</span>')
          // Strings
          .replace(/(["'`])([^"'`]*)\1/g, '<span class="token string">$1$2$1</span>')
          // Comments
          .replace(/(\/\/.*$)/gm, '<span class="token comment">$1</span>')
          .replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="token comment">$1</span>');
        
        block.innerHTML = html;
        block.setAttribute('data-highlighted', 'true');
      });
    };

    // Simple regex-based syntax highlighting for Bash
    const highlightBash = () => {
      const codeBlocks = document.querySelectorAll('code.language-bash, code.language-shell');
      
      codeBlocks.forEach((block) => {
        if (block.getAttribute('data-highlighted')) return;
        
        let html = block.innerHTML;
        
        // Highlight Bash syntax
        html = html
          // Commands
          .replace(/^(\w+)/gm, '<span class="token function">$1</span>')
          // Strings
          .replace(/(["'])([^"']*)\1/g, '<span class="token string">$1$2$1</span>')
          // Parameters
          .replace(/(-{1,2}\w+)/g, '<span class="token parameter">$1</span>');
        
        block.innerHTML = html;
        block.setAttribute('data-highlighted', 'true');
      });
    };

    // Run highlighting
    highlightJSON();
    highlightJavaScript();
    highlightBash();

    // Re-run highlighting when content changes
    const observer = new MutationObserver(() => {
      highlightJSON();
      highlightJavaScript();
      highlightBash();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    return () => observer.disconnect();
  }, []);

  return null;
}