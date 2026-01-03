// Semantic color names mapping to Tailwind palette
export const chartColors = {
  // Status colors
  granted: '#22c55e',     // green-500
  denied: '#ef4444',      // red-500
  pending: '#818cf8',     // indigo-400
  newReceived: '#3b82f6', // blue-500

  // Application type colors
  types: {
    '10': '#4ADE80', // Status Acquisition - green-400
    '20': '#3B82F6', // Period Extension - blue-500
    '30': '#F97316', // Status Change - orange-500
    '40': '#A855F7', // Extra-Status - purple-500
    '50': '#EC4899', // Re-entry - pink-500
    '60': '#F43F5E', // Permanent Residence - rose-500
  } as Record<string, string>,

  // Bureau palette (10 colors for distribution chart)
  bureaus: [
    '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316',
    '#eab308', '#22c55e', '#14b8a6', '#0ea5e9', '#64748b'
  ],

  // Comparison colors
  current: '#6366f1',  // indigo-500
  previous: '#94a3b8', // slate-400

  // UI colors (dark mode aware)
  ui: {
    light: {
      text: '#64748b',
      grid: 'rgba(0, 0, 0, 0.1)',
      tooltipBg: '#ffffff',
      tooltipText: '#0f172a',
      tooltipBorder: '#e2e8f0',
    },
    dark: {
      text: '#cbd5e1',
      grid: 'rgba(255, 255, 255, 0.1)',
      tooltipBg: '#1e293b',
      tooltipText: '#ffffff',
      tooltipBorder: '#334155',
    }
  }
}

// Chart font configuration
export const chartFonts = {
  family: "'Inter', sans-serif",
  size: 14,
  weight: '500', 
  lineHeight: 1.5
}

// Helper to get UI colors based on dark mode
export const getChartUIColors = (isDark: boolean) =>
  isDark ? chartColors.ui.dark : chartColors.ui.light
