/// <reference types="vite/client" />

interface Window {
  vscode?: {
    postMessage: (message: unknown) => void;
    getState: () => unknown;
    setState: (state: unknown) => void;
  };
  postMessageToExtension?: (message: unknown) => void;
  getVsCodeState?: () => unknown;
  setVsCodeState?: (state: unknown) => void;
}
