// Composable for dark mode toggle
// Use shared state so all components share the same isDark ref
const isDark = ref(false);
let initialized = false;

export const useDarkMode = () => {
  const init = () => {
    // Check localStorage or system preference
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('darkMode');
      if (stored !== null) {
        isDark.value = stored === 'true';
      } else {
        isDark.value = window.matchMedia('(prefers-color-scheme: dark)').matches;
      }
      applyTheme();
    }
  };

  const applyTheme = () => {
    if (typeof document !== 'undefined') {
      if (isDark.value) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  };

  const toggle = () => {
    isDark.value = !isDark.value;
    if (typeof window !== 'undefined') {
      localStorage.setItem('darkMode', isDark.value.toString());
    }
    applyTheme();
  };

  // Initialize on mount (only once globally)
  onMounted(() => {
    if (!initialized) {
      initialized = true;
      init();
    }
  });

  return {
    isDark,
    toggle,
  };
};
