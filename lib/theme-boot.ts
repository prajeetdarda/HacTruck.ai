/** Runs before paint — reads stored preference, defaults to dark. */
export const THEME_BOOT_SCRIPT = `(function(){try{var k="hacktruck-theme";var t=localStorage.getItem(k);if(t==="light"){document.documentElement.classList.remove("dark");}else{document.documentElement.classList.add("dark");}}catch(e){document.documentElement.classList.add("dark");}})();`;
