/**
 * Command Registration
 *
 * Registers all VS Code commands for the SecureFix extension.
 */

import * as vscode from 'vscode';
import type { SecureFixCore } from '@securefix/core';
import type { WebviewProvider } from '../webview/WebviewProvider';
import type { VulnerabilityDecorator } from '../decorations/VulnerabilityDecorator';
import type { DiffZoneDecorator } from '../decorations/DiffZoneDecorator';

export function registerCommands(
  context: vscode.ExtensionContext,
  core: SecureFixCore,
  webviewProvider: WebviewProvider,
  vulnerabilityDecorator: VulnerabilityDecorator,
  diffZoneDecorator: DiffZoneDecorator
): vscode.Disposable[] {
  const disposables: vscode.Disposable[] = [];

  // Clone Repository command
  disposables.push(
    vscode.commands.registerCommand('securefix.cloneRepository', async () => {
      const gitUrl = await vscode.window.showInputBox({
        prompt: 'Enter Git repository URL',
        placeHolder: 'https://github.com/user/repo.git',
        validateInput: (value) => {
          if (!value) return 'Repository URL is required';
          if (!value.startsWith('http') && !value.startsWith('git@')) {
            return 'Please enter a valid Git URL';
          }
          return null;
        }
      });

      if (!gitUrl) return;

      // Select folder to clone into
      const folders = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        title: 'Select folder to clone repository into'
      });

      if (!folders || folders.length === 0) return;

      const targetFolder = folders[0].fsPath;
      const repoName = gitUrl.split('/').pop()?.replace('.git', '') || 'repo';
      const clonePath = `${targetFolder}/${repoName}`;

      // Show progress
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Cloning repository...',
          cancellable: false
        },
        async () => {
          try {
            // Clone using git
            const terminal = vscode.window.createTerminal('SecureFix Clone');
            terminal.sendText(`git clone "${gitUrl}" "${clonePath}"`);
            terminal.show();

            // Wait a bit for clone to start, then open folder
            await new Promise(resolve => setTimeout(resolve, 3000));

            // Open the cloned folder
            const uri = vscode.Uri.file(clonePath);
            await vscode.commands.executeCommand('vscode.openFolder', uri);

          } catch (error) {
            vscode.window.showErrorMessage(
              `Failed to clone repository: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
          }
        }
      );
    })
  );

  // Scan Workspace command
  disposables.push(
    vscode.commands.registerCommand('securefix.scanWorkspace', async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showWarningMessage('No workspace folder open. Please open a folder first.');
        return;
      }

      const workspacePath = workspaceFolders[0].uri.fsPath;

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Scanning for vulnerabilities...',
          cancellable: true
        },
        async (progress, token) => {
          try {
            const scanId = await core.vulnerabilityService.startScan(workspacePath);

            // Poll for completion
            let completed = false;
            while (!completed && !token.isCancellationRequested) {
              const status = await core.vulnerabilityService.getScanStatus(scanId);

              progress.report({
                message: `Progress: ${status.progress}%`,
                increment: status.progress
              });

              if (status.status === 'completed' || status.status === 'failed') {
                completed = true;

                if (status.status === 'completed') {
                  const summary = core.vulnerabilityService.getSummary();
                  vscode.window.showInformationMessage(
                    `Scan complete! Found ${summary.total} vulnerabilities: ` +
                    `${summary.critical} critical, ${summary.high} high, ` +
                    `${summary.medium} medium, ${summary.low} low`
                  );
                } else {
                  vscode.window.showErrorMessage('Scan failed. Please check the backend server.');
                }
              } else {
                await new Promise(resolve => setTimeout(resolve, 2000));
              }
            }
          } catch (error) {
            vscode.window.showErrorMessage(
              `Scan failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
          }
        }
      );
    })
  );

  // Fix Vulnerability command
  disposables.push(
    vscode.commands.registerCommand('securefix.fixVulnerability', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage('No active editor. Please open a file first.');
        return;
      }

      const fileUri = editor.document.uri.toString();
      const vulnerabilities = core.vulnerabilityService.getByFile(fileUri);

      if (vulnerabilities.length === 0) {
        vscode.window.showInformationMessage('No vulnerabilities found in this file.');
        return;
      }

      // If multiple vulnerabilities, let user choose
      let selectedVuln = vulnerabilities[0];
      if (vulnerabilities.length > 1) {
        const items = vulnerabilities.map(v => ({
          label: `${v.severity.toUpperCase()}: ${v.title}`,
          description: `Line ${v.location.startLine}`,
          detail: v.description,
          vulnerability: v
        }));

        const selected = await vscode.window.showQuickPick(items, {
          placeHolder: 'Select a vulnerability to fix'
        });

        if (!selected) return;
        selectedVuln = selected.vulnerability;
      }

      vscode.window.showInformationMessage(`Generating fix for: ${selectedVuln.title}...`);

      // The fix generation is handled by Core through message passing
      // This command just triggers the GUI to initiate the fix
      webviewProvider.postMessage({
        type: 'trigger_fix',
        vulnerabilityId: selectedVuln.id
      });
    })
  );

  // Show Panel command
  disposables.push(
    vscode.commands.registerCommand('securefix.showPanel', () => {
      webviewProvider.show();
    })
  );

  // Accept Fix command
  disposables.push(
    vscode.commands.registerCommand('securefix.acceptFix', () => {
      const diffZoneId = diffZoneDecorator.getCurrentDiffZoneId();
      if (!diffZoneId) {
        vscode.window.showWarningMessage('No active fix to accept.');
        return;
      }

      // Trigger apply through Core
      webviewProvider.postMessage({
        type: 'apply_fix',
        diffZoneId
      });
    })
  );

  // Reject Fix command
  disposables.push(
    vscode.commands.registerCommand('securefix.rejectFix', () => {
      const diffZoneId = diffZoneDecorator.getCurrentDiffZoneId();
      if (!diffZoneId) {
        vscode.window.showWarningMessage('No active fix to reject.');
        return;
      }

      // Trigger reject through Core
      webviewProvider.postMessage({
        type: 'reject_fix',
        diffZoneId
      });
    })
  );

  // Next DiffZone command
  disposables.push(
    vscode.commands.registerCommand('securefix.nextDiffZone', () => {
      diffZoneDecorator.navigateToNextDiffZone();
    })
  );

  // Previous DiffZone command
  disposables.push(
    vscode.commands.registerCommand('securefix.previousDiffZone', () => {
      diffZoneDecorator.navigateToPreviousDiffZone();
    })
  );

  return disposables;
}
