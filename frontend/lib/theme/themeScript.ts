export const THEME_STORAGE_KEY = 'theme';

// Runs in <head> before the page paints, so a dark-mode visitor never sees a
// flash of the light theme. Saved choice wins; otherwise follow the system.
export const themeScript = `(function(){try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}})()`;
