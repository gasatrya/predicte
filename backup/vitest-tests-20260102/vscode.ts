import { vi } from 'vitest';

// Mock VS Code API globally
const mockVSCode = {
  workspace: {
    getConfiguration: vi.fn(),
    onDidChangeConfiguration: vi.fn(),
    workspaceFolders: [],
  },
  window: {
    showErrorMessage: vi.fn(),
    showWarningMessage: vi.fn(),
    showInformationMessage: vi.fn(),
    createStatusBarItem: vi.fn(),
    createOutputChannel: vi.fn(),
  },
  commands: {
    registerCommand: vi.fn(),
    executeCommand: vi.fn(),
  },
  SecretStorage: vi.fn(),
  EventEmitter: vi.fn(),
  Disposable: {
    from: vi.fn(),
  },
  Uri: {
    file: vi.fn(),
    joinPath: vi.fn(),
  },
  Range: vi.fn(),
  Position: vi.fn(),
  CompletionItem: vi.fn(),
  InlineCompletionItem: vi.fn(),
  InlineCompletionTriggerKind: {
    Automatic: 0,
    Invoke: 1,
  },
};

export default mockVSCode;
