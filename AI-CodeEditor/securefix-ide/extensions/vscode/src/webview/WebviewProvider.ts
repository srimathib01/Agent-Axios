/**
 * WebviewProvider
 *
 * Provides the webview panel for the SecureFix sidebar.
 * Manages the React GUI lifecycle and communication.
 */

import * as vscode from 'vscode';
import { VsCodeMessenger } from '../VsCodeMessenger';

export class WebviewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'securefix.mainPanel';

  private view?: vscode.WebviewView;
  private extensionUri: vscode.Uri;
  private messenger: VsCodeMessenger;

  constructor(extensionUri: vscode.Uri, messenger: VsCodeMessenger) {
    this.extensionUri = extensionUri;
    this.messenger = messenger;
  }

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void | Thenable<void> {
    this.view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.extensionUri, 'dist'),
        vscode.Uri.joinPath(this.extensionUri, 'media'),
        vscode.Uri.joinPath(this.extensionUri, '..', '..', 'gui', 'dist')
      ]
    };

    // Set up messenger with webview
    this.messenger.setWebview(webviewView.webview);

    // Set webview HTML content
    webviewView.webview.html = this.getHtmlForWebview(webviewView.webview);

    // Handle webview visibility changes
    webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible) {
        // Webview became visible, might need to refresh state
        console.log('[WebviewProvider] Webview became visible');
      }
    });
  }

  private getHtmlForWebview(webview: vscode.Webview): string {
    // Get URIs for resources
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, '..', '..', 'gui', 'dist', 'main.js')
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, '..', '..', 'gui', 'dist', 'main.css')
    );

    // Use a nonce for script security
    const nonce = this.getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; img-src ${webview.cspSource} data:; font-src ${webview.cspSource};">
  <link href="${styleUri}" rel="stylesheet">
  <title>SecureFix AI</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: var(--vscode-editor-background);
      color: var(--vscode-editor-foreground);
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
    }
    #root {
      width: 100%;
      height: 100vh;
      overflow: auto;
    }
    .loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      gap: 16px;
    }
    .loading-spinner {
      width: 32px;
      height: 32px;
      border: 3px solid var(--vscode-editor-foreground);
      border-top-color: transparent;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <div id="root">
    <div class="loading">
      <div class="loading-spinner"></div>
      <span>Loading SecureFix AI...</span>
    </div>
  </div>
  <script nonce="${nonce}">
    // Acquire VS Code API
    const vscode = acquireVsCodeApi();

    // Make it available globally for the React app
    window.vscode = vscode;

    // Store state persistence
    const state = vscode.getState() || {};
    window.getVsCodeState = () => vscode.getState();
    window.setVsCodeState = (newState) => vscode.setState(newState);

    // Message passing helpers
    window.postMessageToExtension = (message) => {
      vscode.postMessage(message);
    };

    // Listen for messages from extension
    window.addEventListener('message', (event) => {
      const message = event.data;
      // Dispatch custom event for React app to listen to
      window.dispatchEvent(new CustomEvent('securefix-message', { detail: message }));
    });
  </script>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }

  private getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  /**
   * Post a message to the webview
   */
  postMessage(message: unknown): void {
    if (this.view) {
      this.view.webview.postMessage(message);
    }
  }

  /**
   * Show the webview panel
   */
  show(): void {
    if (this.view) {
      this.view.show(true);
    }
  }
}
