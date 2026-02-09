/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // VS Code theme colors
        'vscode-bg': 'var(--vscode-editor-background)',
        'vscode-fg': 'var(--vscode-editor-foreground)',
        'vscode-border': 'var(--vscode-panel-border)',
        'vscode-button-bg': 'var(--vscode-button-background)',
        'vscode-button-fg': 'var(--vscode-button-foreground)',
        'vscode-button-hover': 'var(--vscode-button-hoverBackground)',
        'vscode-input-bg': 'var(--vscode-input-background)',
        'vscode-input-fg': 'var(--vscode-input-foreground)',
        'vscode-input-border': 'var(--vscode-input-border)',
        'vscode-list-hover': 'var(--vscode-list-hoverBackground)',
        'vscode-list-active': 'var(--vscode-list-activeSelectionBackground)',
        // Severity colors
        'severity-critical': '#ff0000',
        'severity-high': '#ff8c00',
        'severity-medium': '#ffd700',
        'severity-low': '#1e90ff',
        'severity-info': '#808080',
      },
      fontFamily: {
        vscode: 'var(--vscode-font-family)',
      },
      fontSize: {
        vscode: 'var(--vscode-font-size)',
      },
    },
  },
  plugins: [],
}
