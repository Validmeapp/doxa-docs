export function ThemeScript() {
  const script = `
    (function() {
      try {
        // Disable transitions during initial load to prevent flashing
        document.documentElement.classList.add('theme-transition-disabled');
        
        function getThemePreference() {
          if (typeof localStorage !== 'undefined' && localStorage.getItem('docs-theme')) {
            return localStorage.getItem('docs-theme');
          }
          return 'system';
        }
        
        function getSystemTheme() {
          return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        
        const theme = getThemePreference();
        const root = document.documentElement;
        
        // Remove any existing theme classes
        root.classList.remove('light', 'dark');
        
        if (theme === 'system') {
          const systemTheme = getSystemTheme();
          root.classList.add(systemTheme);
          
          // Listen for system theme changes
          window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(e) {
            if (getThemePreference() === 'system') {
              root.classList.remove('light', 'dark');
              root.classList.add(e.matches ? 'dark' : 'light');
            }
          });
        } else {
          root.classList.add(theme);
        }
        
        // Re-enable transitions after a brief delay
        setTimeout(function() {
          document.documentElement.classList.remove('theme-transition-disabled');
        }, 100);
        
      } catch (e) {
        // Fallback to light theme if anything fails
        console.warn('Theme initialization failed:', e);
        document.documentElement.classList.add('light');
      }
    })();
  `;

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}