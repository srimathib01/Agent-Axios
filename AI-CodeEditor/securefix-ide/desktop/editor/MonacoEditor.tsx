import React, { useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import * as monaco from 'monaco-editor';
import { VulnerabilityDecoration, DiffDecoration } from './decorations';

// Import Monaco workers for Vite bundling
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';

// Configure Monaco workers for Vite/Tauri
self.MonacoEnvironment = {
  getWorker: function (_moduleId: string, label: string) {
    switch (label) {
      case 'json':
        return new jsonWorker();
      case 'css':
      case 'scss':
      case 'less':
        return new cssWorker();
      case 'html':
      case 'handlebars':
      case 'razor':
        return new htmlWorker();
      case 'typescript':
      case 'javascript':
        return new tsWorker();
      default:
        return new editorWorker();
    }
  },
};

export interface MonacoEditorProps {
  value: string;
  language: string;
  path?: string;
  readOnly?: boolean;
  theme?: 'vs-dark' | 'vs-light' | 'hc-black';
  onChange?: (value: string) => void;
  onSave?: () => void;
  onSelectionChange?: (startLine: number, endLine: number, selectedText: string) => void;
  vulnerabilityDecorations?: VulnerabilityDecoration[];
  diffDecorations?: DiffDecoration[];
}

export interface MonacoEditorRef {
  editor: monaco.editor.IStandaloneCodeEditor | null;
  getValue: () => string;
  setValue: (value: string) => void;
  focus: () => void;
  revealLine: (lineNumber: number) => void;
  setSelection: (startLine: number, startColumn: number, endLine: number, endColumn: number) => void;
  applyEdit: (range: monaco.IRange, text: string) => void;
}

export const MonacoEditor = forwardRef<MonacoEditorRef, MonacoEditorProps>(
  (
    {
      value,
      language,
      path,
      readOnly = false,
      theme = 'vs-dark',
      onChange,
      onSave,
      onSelectionChange,
      vulnerabilityDecorations = [],
      diffDecorations = [],
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
    const decorationsRef = useRef<string[]>([]);
    const isSettingValue = useRef(false);

    // Expose editor methods to parent
    useImperativeHandle(ref, () => ({
      editor: editorRef.current,
      getValue: () => editorRef.current?.getValue() || '',
      setValue: (newValue: string) => {
        if (editorRef.current) {
          isSettingValue.current = true;
          editorRef.current.setValue(newValue);
          isSettingValue.current = false;
        }
      },
      focus: () => editorRef.current?.focus(),
      revealLine: (lineNumber: number) => {
        editorRef.current?.revealLineInCenter(lineNumber);
      },
      setSelection: (startLine, startColumn, endLine, endColumn) => {
        editorRef.current?.setSelection({
          startLineNumber: startLine,
          startColumn,
          endLineNumber: endLine,
          endColumn,
        });
      },
      applyEdit: (range, text) => {
        editorRef.current?.executeEdits('securefix', [
          {
            range,
            text,
            forceMoveMarkers: true,
          },
        ]);
      },
    }));

    // Initialize editor
    useEffect(() => {
      if (!containerRef.current) return;

      editorRef.current = monaco.editor.create(containerRef.current, {
        value,
        language,
        theme,
        readOnly,
        automaticLayout: true,
        minimap: { enabled: true },
        scrollBeyondLastLine: false,
        fontSize: 14,
        fontFamily: "'Fira Code', 'Cascadia Code', Consolas, monospace",
        fontLigatures: true,
        lineNumbers: 'on',
        renderWhitespace: 'selection',
        bracketPairColorization: { enabled: true },
        guides: {
          bracketPairs: true,
          indentation: true,
        },
        suggest: {
          showMethods: true,
          showFunctions: true,
          showConstructors: true,
          showFields: true,
          showVariables: true,
          showClasses: true,
          showStructs: true,
          showInterfaces: true,
          showModules: true,
          showProperties: true,
          showEvents: true,
          showOperators: true,
          showUnits: true,
          showValues: true,
          showConstants: true,
          showEnums: true,
          showEnumMembers: true,
          showKeywords: true,
          showWords: true,
          showColors: true,
          showFiles: true,
          showReferences: true,
          showFolders: true,
          showTypeParameters: true,
          showSnippets: true,
        },
        quickSuggestions: {
          other: true,
          comments: false,
          strings: false,
        },
        wordWrap: 'off',
        tabSize: 2,
        insertSpaces: true,
        folding: true,
        glyphMargin: true, // For vulnerability icons
        lineDecorationsWidth: 10,
      });

      // Handle content changes
      editorRef.current.onDidChangeModelContent(() => {
        if (!isSettingValue.current && onChange) {
          onChange(editorRef.current?.getValue() || '');
        }
      });

      // Handle selection changes
      editorRef.current.onDidChangeCursorSelection((e) => {
        if (onSelectionChange) {
          const selection = e.selection;
          const model = editorRef.current?.getModel();
          if (model) {
            const selectedText = model.getValueInRange(selection);
            onSelectionChange(
              selection.startLineNumber,
              selection.endLineNumber,
              selectedText
            );
          }
        }
      });

      // Handle Ctrl+S / Cmd+S
      editorRef.current.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
        onSave?.();
      });

      return () => {
        editorRef.current?.dispose();
        editorRef.current = null;
      };
    }, []);

    // Update value when prop changes (from external source like file load)
    useEffect(() => {
      if (editorRef.current && !isSettingValue.current) {
        const currentValue = editorRef.current.getValue();
        if (currentValue !== value) {
          isSettingValue.current = true;
          editorRef.current.setValue(value);
          isSettingValue.current = false;
        }
      }
    }, [value]);

    // Update language when prop changes
    useEffect(() => {
      if (editorRef.current) {
        const model = editorRef.current.getModel();
        if (model) {
          monaco.editor.setModelLanguage(model, language);
        }
      }
    }, [language]);

    // Update theme when prop changes
    useEffect(() => {
      monaco.editor.setTheme(theme);
    }, [theme]);

    // Update readOnly when prop changes
    useEffect(() => {
      editorRef.current?.updateOptions({ readOnly });
    }, [readOnly]);

    // Apply vulnerability decorations
    useEffect(() => {
      if (!editorRef.current) return;

      const newDecorations: monaco.editor.IModelDeltaDecoration[] = [];

      // Add vulnerability decorations
      vulnerabilityDecorations.forEach((vuln) => {
        newDecorations.push({
          range: new monaco.Range(vuln.startLine, 1, vuln.endLine, 1),
          options: {
            isWholeLine: true,
            className: `vuln-line vuln-${vuln.severity}`,
            glyphMarginClassName: `vuln-glyph vuln-glyph-${vuln.severity}`,
            glyphMarginHoverMessage: { value: `**${vuln.severity.toUpperCase()}**: ${vuln.message}` },
            overviewRuler: {
              color: getSeverityColor(vuln.severity),
              position: monaco.editor.OverviewRulerLane.Right,
            },
            minimap: {
              color: getSeverityColor(vuln.severity),
              position: monaco.editor.MinimapPosition.Inline,
            },
          },
        });
      });

      // Add diff decorations
      diffDecorations.forEach((diff) => {
        if (diff.type === 'removed') {
          newDecorations.push({
            range: new monaco.Range(diff.startLine, 1, diff.endLine, 1),
            options: {
              isWholeLine: true,
              className: 'diff-removed',
              glyphMarginClassName: 'diff-glyph-removed',
            },
          });
        } else if (diff.type === 'added') {
          newDecorations.push({
            range: new monaco.Range(diff.startLine, 1, diff.endLine, 1),
            options: {
              isWholeLine: true,
              className: 'diff-added',
              glyphMarginClassName: 'diff-glyph-added',
            },
          });
        }
      });

      decorationsRef.current = editorRef.current.deltaDecorations(
        decorationsRef.current,
        newDecorations
      );
    }, [vulnerabilityDecorations, diffDecorations]);

    return (
      <div
        ref={containerRef}
        className="monaco-editor-container"
        style={{ width: '100%', height: '100%' }}
      />
    );
  }
);

MonacoEditor.displayName = 'MonacoEditor';

function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'critical':
      return '#ff0000';
    case 'high':
      return '#ff6600';
    case 'medium':
      return '#ffcc00';
    case 'low':
      return '#0099ff';
    default:
      return '#808080';
  }
}

export default MonacoEditor;
