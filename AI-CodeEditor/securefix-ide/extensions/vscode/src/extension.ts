/**
 * SecureFix AI IDE Extension Entry Point
 *
 * This is the main entry point for the VS Code extension.
 * It initializes the extension and registers all commands and providers.
 */

import * as vscode from 'vscode';
import { VsCodeExtension } from './VsCodeExtension';

let extension: VsCodeExtension | undefined;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  console.log('[SecureFix] Extension activating...');

  try {
    // Create and initialize the extension
    extension = new VsCodeExtension(context);
    await extension.activate();

    console.log('[SecureFix] Extension activated successfully');
  } catch (error) {
    console.error('[SecureFix] Extension activation failed:', error);
    vscode.window.showErrorMessage(
      `SecureFix activation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export function deactivate(): void {
  console.log('[SecureFix] Extension deactivating...');

  if (extension) {
    extension.deactivate();
    extension = undefined;
  }

  console.log('[SecureFix] Extension deactivated');
}
