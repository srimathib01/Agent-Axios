/**
 * SecureFix IDE Core Module
 *
 * The Core module contains all business logic and is IDE-agnostic.
 * It communicates with other layers through the message-passing protocol.
 */

// Export types
export * from './types/index.js';

// Export protocol
export * from './protocol/index.js';

// Export services
export * from './services/index.js';

// Core orchestrator
import type { GuiToCoreMessage } from './protocol/gui-to-core.js';
import type { CoreToGuiMessage, InitialStateMessage } from './protocol/core-to-gui.js';
import type { ExtensionToCoreMessage, CoreToExtensionMessage } from './protocol/extension-messages.js';
import type { Messenger } from './protocol/index.js';
import { VulnerabilityService } from './services/VulnerabilityService.js';
import { FixGeneratorService } from './services/FixGeneratorService.js';
import { DiffService } from './services/DiffService.js';

export interface CoreConfig {
  backendUrl: string;
  apiKey?: string;
}

export class SecureFixCore {
  private guiMessenger?: Messenger<GuiToCoreMessage, CoreToGuiMessage>;
  private extensionMessenger?: Messenger<ExtensionToCoreMessage, CoreToExtensionMessage>;

  public readonly vulnerabilityService: VulnerabilityService;
  public readonly fixGeneratorService: FixGeneratorService;
  public readonly diffService: DiffService;

  constructor(config: CoreConfig) {

    this.vulnerabilityService = new VulnerabilityService({
      backendUrl: config.backendUrl,
      apiKey: config.apiKey
    });

    this.fixGeneratorService = new FixGeneratorService({
      backendUrl: config.backendUrl,
      apiKey: config.apiKey
    });

    this.diffService = new DiffService();

    // Set up service listeners
    this.setupServiceListeners();
  }

  /**
   * Set up the GUI messenger for communication with webview
   */
  setGuiMessenger(messenger: Messenger<GuiToCoreMessage, CoreToGuiMessage>): void {
    this.guiMessenger = messenger;
    messenger.onMessage((msg) => this.handleGuiMessage(msg));
  }

  /**
   * Set up the Extension messenger for communication with IDE
   */
  setExtensionMessenger(messenger: Messenger<ExtensionToCoreMessage, CoreToExtensionMessage>): void {
    this.extensionMessenger = messenger;
    messenger.onMessage((msg) => this.handleExtensionMessage(msg));
  }

  /**
   * Handle messages from GUI
   */
  private async handleGuiMessage(message: GuiToCoreMessage): Promise<void> {
    console.log('[Core] Received GUI message:', message.type);

    switch (message.type) {
      case 'gui_ready':
        this.sendInitialState();
        break;

      case 'request_fix':
        await this.handleFixRequest(message);
        break;

      case 'apply_fix':
        this.handleApplyFix(message.diffZoneId);
        break;

      case 'reject_fix':
        this.handleRejectFix(message.diffZoneId);
        break;

      case 'get_vulnerabilities':
        this.sendVulnerabilityList(message.fileUri);
        break;

      case 'get_vulnerability_details':
        this.sendVulnerabilityDetails(message.vulnerabilityId);
        break;

      case 'scan_repository':
        await this.handleScanRepository(message.repositoryPath);
        break;

      case 'navigate_to_vulnerability':
        this.navigateToVulnerability(message.vulnerabilityId);
        break;

      default:
        console.log('[Core] Unknown message type:', (message as GuiToCoreMessage).type);
    }
  }

  /**
   * Handle messages from Extension
   */
  private async handleExtensionMessage(message: ExtensionToCoreMessage): Promise<void> {
    console.log('[Core] Received Extension message:', message.type);

    switch (message.type) {
      case 'file_opened':
        // Could trigger re-scan or update UI with file-specific vulnerabilities
        break;

      case 'file_changed':
        // Track changes for potential re-scan
        break;

      case 'workspace_opened':
        // Could trigger initial scan
        break;
    }
  }

  /**
   * Send initial state to GUI when it's ready
   */
  private sendInitialState(): void {
    if (!this.guiMessenger) return;

    const message: InitialStateMessage = {
      id: `msg-${Date.now()}`,
      timestamp: Date.now(),
      type: 'initial_state',
      vulnerabilities: this.vulnerabilityService.getAll(),
      diffZones: this.diffService.getAllDiffZones(),
      theme: 'dark',
      config: {}
    };

    this.guiMessenger.sendMessage(message);
  }

  /**
   * Handle fix request from GUI
   */
  private async handleFixRequest(message: GuiToCoreMessage & { type: 'request_fix' }): Promise<void> {
    const vulnerability = this.vulnerabilityService.getById(message.vulnerabilityId);
    if (!vulnerability || !this.guiMessenger) return;

    // Stream fix generation
    await this.fixGeneratorService.generateFix(
      vulnerability,
      message.codeContext,
      {
        onChunk: (content, done) => {
          this.guiMessenger?.sendMessage({
            id: `msg-${Date.now()}`,
            timestamp: Date.now(),
            type: 'fix_stream_chunk',
            vulnerabilityId: message.vulnerabilityId,
            content,
            done
          });
        },
        onComplete: (_fullContent, blocks) => {
          // Create DiffZone from the fix
          const zone = this.diffService.createDiffZoneFromBlocks(
            message.codeContext.fileUri,
            message.codeContext.vulnerableCode,
            blocks,
            message.vulnerabilityId
          );

          if (zone) {
            const diffResult = this.diffService.computeDiff(
              zone.originalContent,
              zone.suggestedContent
            );

            this.guiMessenger?.sendMessage({
              id: `msg-${Date.now()}`,
              timestamp: Date.now(),
              type: 'fix_complete',
              vulnerabilityId: message.vulnerabilityId,
              diffZone: zone,
              diffResult
            });

            // Tell extension to create diff zone decoration
            this.extensionMessenger?.sendMessage({
              id: `msg-${Date.now()}`,
              timestamp: Date.now(),
              type: 'create_diff_zone',
              fileUri: zone.fileUri,
              startLine: zone.startLine,
              endLine: zone.endLine,
              originalContent: zone.originalContent,
              suggestedContent: zone.suggestedContent,
              diffZoneId: zone.id
            });
          }
        },
        onError: (error) => {
          this.guiMessenger?.sendMessage({
            id: `msg-${Date.now()}`,
            timestamp: Date.now(),
            type: 'fix_error',
            vulnerabilityId: message.vulnerabilityId,
            error: error.message
          });
        }
      }
    );
  }

  /**
   * Handle apply fix
   */
  private handleApplyFix(diffZoneId: string): void {
    const zone = this.diffService.getDiffZone(diffZoneId);
    if (!zone) return;

    const result = this.diffService.applyDiffZone(diffZoneId);

    if (result.success) {
      // Tell extension to apply the edit
      this.extensionMessenger?.sendMessage({
        id: `msg-${Date.now()}`,
        timestamp: Date.now(),
        type: 'apply_edit',
        fileUri: zone.fileUri,
        startLine: zone.startLine,
        endLine: zone.endLine,
        newContent: zone.suggestedContent
      });

      // Mark vulnerability as fixed
      this.vulnerabilityService.markAsFixed(zone.vulnerabilityId);

      // Notify GUI
      this.guiMessenger?.sendMessage({
        id: `msg-${Date.now()}`,
        timestamp: Date.now(),
        type: 'fix_applied',
        diffZoneId,
        vulnerabilityId: zone.vulnerabilityId
      });
    }
  }

  /**
   * Handle reject fix
   */
  private handleRejectFix(diffZoneId: string): void {
    const zone = this.diffService.getDiffZone(diffZoneId);
    if (!zone) return;

    this.diffService.rejectDiffZone(diffZoneId);

    // Tell extension to remove diff zone
    this.extensionMessenger?.sendMessage({
      id: `msg-${Date.now()}`,
      timestamp: Date.now(),
      type: 'remove_diff_zone',
      diffZoneId
    });

    // Notify GUI
    this.guiMessenger?.sendMessage({
      id: `msg-${Date.now()}`,
      timestamp: Date.now(),
      type: 'fix_rejected',
      diffZoneId,
      vulnerabilityId: zone.vulnerabilityId
    });
  }

  /**
   * Handle scan repository request
   */
  private async handleScanRepository(repositoryPath: string): Promise<void> {
    if (!this.guiMessenger) return;

    try {
      const scanId = await this.vulnerabilityService.startScan(repositoryPath);

      // Poll for status
      const pollInterval = setInterval(async () => {
        try {
          const status = await this.vulnerabilityService.getScanStatus(scanId);

          this.guiMessenger?.sendMessage({
            id: `msg-${Date.now()}`,
            timestamp: Date.now(),
            type: 'scan_progress',
            scanId,
            status: status.status,
            progress: status.progress
          });

          if (status.status === 'completed' || status.status === 'failed') {
            clearInterval(pollInterval);

            if (status.status === 'completed') {
              this.guiMessenger?.sendMessage({
                id: `msg-${Date.now()}`,
                timestamp: Date.now(),
                type: 'scan_complete',
                result: status
              });
            }
          }
        } catch (error) {
          clearInterval(pollInterval);
        }
      }, 2000);

    } catch (error) {
      this.guiMessenger.sendMessage({
        id: `msg-${Date.now()}`,
        timestamp: Date.now(),
        type: 'error',
        error: error instanceof Error ? error.message : 'Scan failed'
      });
    }
  }

  /**
   * Send vulnerability list to GUI
   */
  private sendVulnerabilityList(fileUri?: string): void {
    if (!this.guiMessenger) return;

    const vulnerabilities = fileUri
      ? this.vulnerabilityService.getByFile(fileUri)
      : this.vulnerabilityService.getAll();

    this.guiMessenger.sendMessage({
      id: `msg-${Date.now()}`,
      timestamp: Date.now(),
      type: 'vulnerability_list',
      vulnerabilities
    });
  }

  /**
   * Send vulnerability details to GUI
   */
  private sendVulnerabilityDetails(vulnerabilityId: string): void {
    if (!this.guiMessenger) return;

    const vulnerability = this.vulnerabilityService.getById(vulnerabilityId);
    if (!vulnerability) return;

    this.guiMessenger.sendMessage({
      id: `msg-${Date.now()}`,
      timestamp: Date.now(),
      type: 'vulnerability_details',
      vulnerability
    });
  }

  /**
   * Navigate to vulnerability in editor
   */
  private navigateToVulnerability(vulnerabilityId: string): void {
    const vulnerability = this.vulnerabilityService.getById(vulnerabilityId);
    if (!vulnerability || !this.extensionMessenger) return;

    this.extensionMessenger.sendMessage({
      id: `msg-${Date.now()}`,
      timestamp: Date.now(),
      type: 'navigate_to_location',
      fileUri: vulnerability.location.fileUri,
      line: vulnerability.location.startLine,
      select: true
    });
  }

  /**
   * Set up listeners for service updates
   */
  private setupServiceListeners(): void {
    this.vulnerabilityService.onUpdate((vulnerabilities) => {
      this.guiMessenger?.sendMessage({
        id: `msg-${Date.now()}`,
        timestamp: Date.now(),
        type: 'vulnerability_list',
        vulnerabilities
      });
    });

    this.diffService.onUpdate((_zones) => {
      // Could send diff zone updates to GUI if needed
    });
  }

  /**
   * Dispose and clean up resources
   */
  dispose(): void {
    this.fixGeneratorService.dispose();
    this.guiMessenger?.dispose();
    this.extensionMessenger?.dispose();
  }
}
