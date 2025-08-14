// This component injects a blocking script that applies the theme before React hydration
// to prevent the flash of white theme on page load

export function ThemeScript() {
  const themeScript = `
    (function() {
      function getThemeFromStorage() {
        try {
          return localStorage.getItem('theme');
        } catch (e) {
          return null;
        }
      }
      
      function getSystemTheme() {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      
      function applyTheme() {
        const savedTheme = getThemeFromStorage();
        const root = document.documentElement;
        
        // Remove any existing theme classes
        root.classList.remove('light', 'dark');
        
        let effectiveTheme;
        if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
          // User has explicitly set a preference - use it
          effectiveTheme = savedTheme;
        } else {
          // No user preference - use system theme
          effectiveTheme = getSystemTheme();
        }
        
        // Apply the theme class immediately
        root.classList.add(effectiveTheme);
      }
      
      // Apply theme immediately
      applyTheme();
      
      // Listen for system theme changes only if no user preference is set
      const savedTheme = getThemeFromStorage();
      if (!savedTheme || savedTheme === 'system') {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(e) {
          const root = document.documentElement;
          root.classList.remove('light', 'dark');
          root.classList.add(e.matches ? 'dark' : 'light');
        });
      }
      
      // Store the effective theme for React to sync with
      window.__THEME__ = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    })();
  `;

  return (
    <script
      dangerouslySetInnerHTML={{ __html: themeScript }}
      suppressHydrationWarning
    />
  );
}
