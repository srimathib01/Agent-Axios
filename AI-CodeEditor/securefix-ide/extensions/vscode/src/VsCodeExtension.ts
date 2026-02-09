/**
 * VsCodeExtension
 *
 * Main orchestrator for the VS Code extension.
 * Initializes Core, GUI, and message routing between components.
 */

import * as vscode from 'vscode';
import { SecureFixCore } from '@securefix/core';
import { WebviewProvider } from './webview/WebviewProvider';
import { VsCodeMessenger } from './VsCodeMessenger';
import { VulnerabilityDecorator } from './decorations/VulnerabilityDecorator';
import { DiffZoneDecorator } from './decorations/DiffZoneDecorator';
import { registerCommands } from './commands';

export class VsCodeExtension {
  private context: vscode.ExtensionContext;
  private core: SecureFixCore | undefined;
  private webviewProvider: WebviewProvider | undefined;
  private messenger: VsCodeMessenger | undefined;
  private vulnerabilityDecorator: VulnerabilityDecorator | undefined;
  private diffZoneDecorator: DiffZoneDecorator | undefined;
  private disposables: vscode.Disposable[] = [];

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  async activate(): Promise<void> {
    // Get configuration
    const config = vscode.workspace.getConfiguration('securefix');
    const backendUrl = config.get<string>('backendUrl', 'http://localhost:8000');
    const apiKey = config.get<string>('apiKey', '');

    // Initialize Core
    this.core = new SecureFixCore({
      backendUrl,
      apiKey: apiKey || undefined
    });

    // Initialize Messenger
    this.messenger = new VsCodeMessenger(this.core);

    // Set up messengers for Core
    this.core.setGuiMessenger(this.messenger.createGuiMessenger());
    this.core.setExtensionMessenger(this.messenger.createExtensionMessenger());

    // Initialize WebviewProvider
    this.webviewProvider = new WebviewProvider(
      this.context.extensionUri,
      this.messenger
    );

    // Register webview provider
    const webviewDisposable = vscode.window.registerWebviewViewProvider(
      'securefix.mainPanel',
      this.webviewProvider,
      {
        webviewOptions: {
          retainContextWhenHidden: true
        }
      }
    );
    this.disposables.push(webviewDisposable);

    // Initialize decorators
    this.vulnerabilityDecorator = new VulnerabilityDecorator();
    this.diffZoneDecorator = new DiffZoneDecorator();

    // Register commands
    const commandDisposables = registerCommands(
      this.context,
      this.core,
      this.webviewProvider,
      this.vulnerabilityDecorator,
      this.diffZoneDecorator
    );
    this.disposables.push(...commandDisposables);

    // Set up listeners for extension events
    this.setupEventListeners();

    // Set up listeners for Core messages to Extension
    this.setupCoreToExtensionListeners();

    // Show welcome message
    vscode.window.showInformationMessage('SecureFix AI IDE is ready!');
  }

  private setupEventListeners(): void {
    // Listen for active editor changes
    const editorChangeDisposable = vscode.window.onDidChangeActiveTextEditor(
      (editor) => {
        if (editor && this.messenger) {
          this.messenger.sendFileOpened(
            editor.document.uri.toString(),
            editor.document.languageId,
            editor.document.getText()
          );
        }
      }
    );
    this.disposables.push(editorChangeDisposable);

    // Listen for text document changes
    const docChangeDisposable = vscode.workspace.onDidChangeTextDocument(
      (event) => {
        if (this.messenger) {
          this.messenger.sendFileChanged(
            event.document.uri.toString(),
            event.document.getText()
          );
        }
      }
    );
    this.disposables.push(docChangeDisposable);

    // Listen for document save
    const saveDisposable = vscode.workspace.onDidSaveTextDocument(
      (document) => {
        if (this.messenger) {
          this.messenger.sendFileSaved(document.uri.toString());
        }
      }
    );
    this.disposables.push(saveDisposable);

    // Listen for workspace folder changes
    const workspaceDisposable = vscode.workspace.onDidChangeWorkspaceFolders(
      () => {
        if (vscode.workspace.workspaceFolders && this.messenger) {
          const folder = vscode.workspace.workspaceFolders[0];
          this.messenger.sendWorkspaceOpened(folder.uri.fsPath);
        }
      }
    );
    this.disposables.push(workspaceDisposable);

    // Listen for selection changes
    const selectionDisposable = vscode.window.onDidChangeTextEditorSelection(
      (event) => {
        if (this.messenger) {
          const selection = event.selections[0];
          this.messenger.sendEditorSelection(
            event.textEditor.document.uri.toString(),
            selection.start.line + 1,
            selection.end.line + 1,
            selection.start.character,
            selection.end.character,
            event.textEditor.document.getText(selection)
          );
        }
      }
    );
    this.disposables.push(selectionDisposable);
  }

  private setupCoreToExtensionListeners(): void {
    if (!this.messenger) return;

    this.messenger.onExtensionMessage((message) => {
      switch (message.type) {
        case 'show_decoration':
          if (this.vulnerabilityDecorator) {
            this.vulnerabilityDecorator.setDecorations(
              message.fileUri,
              message.decorations
            );
          }
          break;

        case 'remove_decoration':
          if (this.vulnerabilityDecorator) {
            this.vulnerabilityDecorator.clearDecorations(message.fileUri);
          }
          break;

        case 'create_diff_zone':
          if (this.diffZoneDecorator) {
            this.diffZoneDecorator.createDiffZone(
              message.diffZoneId,
              message.fileUri,
              message.startLine,
              message.endLine,
              message.originalContent,
              message.suggestedContent
            );
          }
          break;

        case 'remove_diff_zone':
          if (this.diffZoneDecorator) {
            this.diffZoneDecorator.removeDiffZone(message.diffZoneId);
          }
          break;

        case 'apply_edit':
          this.applyEdit(
            message.fileUri,
            message.startLine,
            message.endLine,
            message.newContent
          );
          break;

        case 'navigate_to_location':
          this.navigateToLocation(
            message.fileUri,
            message.line,
            message.column,
            message.select
          );
          break;

        case 'show_notification':
          this.showNotification(
            message.level,
            message.message,
            message.actions
          );
          break;
      }
    });
  }

  private async applyEdit(
    fileUri: string,
    startLine: number,
    endLine: number,
    newContent: string
  ): Promise<void> {
    const uri = vscode.Uri.parse(fileUri);
    const document = await vscode.workspace.openTextDocument(uri);
    const editor = await vscode.window.showTextDocument(document);

    const range = new vscode.Range(
      new vscode.Position(startLine - 1, 0),
      new vscode.Position(endLine, 0)
    );

    await editor.edit((editBuilder) => {
      editBuilder.replace(range, newContent + '\n');
    });
  }

  private async navigateToLocation(
    fileUri: string,
    line: number,
    column?: number,
    select?: boolean
  ): Promise<void> {
    const uri = vscode.Uri.parse(fileUri);
    const document = await vscode.workspace.openTextDocument(uri);
    const editor = await vscode.window.showTextDocument(document);

    const position = new vscode.Position(line - 1, column || 0);
    editor.selection = new vscode.Selection(position, position);
    editor.revealRange(
      new vscode.Range(position, position),
      vscode.TextEditorRevealType.InCenter
    );

    if (select) {
      const lineRange = document.lineAt(line - 1).range;
      editor.selection = new vscode.Selection(lineRange.start, lineRange.end);
    }
  }

  private showNotification(
    level: 'info' | 'warning' | 'error',
    message: string,
    actions?: Array<{ title: string; actionId: string }>
  ): void {
    const actionTitles = actions?.map((a) => a.title) || [];

    let showFn: typeof vscode.window.showInformationMessage;
    switch (level) {
      case 'error':
        showFn = vscode.window.showErrorMessage;
        break;
      case 'warning':
        showFn = vscode.window.showWarningMessage;
        break;
      default:
        showFn = vscode.window.showInformationMessage;
    }

    showFn(message, ...actionTitles);
  }

  deactivate(): void {
    // Dispose all disposables
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
    this.disposables = [];

    // Clean up Core
    if (this.core) {
      this.core.dispose();
      this.core = undefined;
    }

    // Clean up decorators
    if (this.vulnerabilityDecorator) {
      this.vulnerabilityDecorator.dispose();
      this.vulnerabilityDecorator = undefined;
    }

    if (this.diffZoneDecorator) {
      this.diffZoneDecorator.dispose();
      this.diffZoneDecorator = undefined;
    }
  }
}
