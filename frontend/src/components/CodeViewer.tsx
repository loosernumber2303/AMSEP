import { FileCode, Clipboard, Folder, Terminal, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';

interface ProjectFile {
  id: number;
  session_id: number;
  path: string;
  content: string;
  is_test: boolean;
  created_at: string;
}

interface CodeViewerProps {
  files: ProjectFile[];
  status: string;
}

export default function CodeViewer({ files, status }: CodeViewerProps) {
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  useEffect(() => {
    if (files.length > 0 && !selectedPath) {
      setSelectedPath(files[0].path);
    }
  }, [files, selectedPath]);

  const currentFile = files.find(f => f.path === selectedPath);

  if (files.length === 0) {
    if (['CODING'].includes(status)) {
      return (
        <div className="flex flex-col items-center justify-center py-20 bg-green-card border border-green-border rounded-2xl p-6">
          <Loader2 className="h-8 w-8 animate-spin text-green-accent mb-3" />
          <p className="text-sm text-green-text font-medium">Coding application modules...</p>
          <p className="text-xs text-green-muted mt-1">Generating file trees and implementing core algorithms.</p>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-green-card border border-green-border rounded-2xl p-6">
        <FileCode className="h-8 w-8 text-green-muted/40 mb-3" />
        <p className="text-sm text-green-muted font-medium">No source files generated yet</p>
        <p className="text-xs text-green-muted/60 mt-1">Files created by the Coder Agent will display here.</p>
      </div>
    );
  }

  return (
    <div className="h-[480px] flex border border-green-border rounded-2xl overflow-hidden bg-green-card shadow-lg animate-fade-in">
      {/* File Tree Explorer */}
      <div className="w-56 border-r border-green-border bg-green-sidebar/35 flex flex-col shrink-0">
        <div className="p-3 border-b border-green-border/80 text-[10px] font-semibold text-green-muted flex items-center gap-1.5 uppercase tracking-wider">
          <Folder className="h-3.5 w-3.5 text-green-accent" />
          <span>Files Tree</span>
        </div>
        <div className="p-2 space-y-1 overflow-y-auto flex-1 text-left">
          {files.map(file => (
            <button
              key={file.id}
              onClick={() => setSelectedPath(file.path)}
              className={`w-full flex items-center gap-2.5 p-2 rounded-xl text-left text-xs font-mono transition-all border ${
                selectedPath === file.path
                  ? 'bg-green-accent/10 border-green-accent/30 text-green-accent font-semibold shadow-inner'
                  : 'border-transparent text-green-muted hover:bg-green-sidebar/60 hover:text-green-text'
              }`}
            >
              <FileCode className={`h-4 w-4 shrink-0 ${file.is_test ? 'text-emerald-500' : 'text-teal-500'}`} />
              <span className="truncate">{file.path}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Editor Viewer */}
      <div className="flex-1 flex flex-col min-w-0 bg-green-card">
        {currentFile ? (
          <>
            <div className="p-3 bg-green-sidebar/30 border-b border-green-border text-[11px] font-mono text-green-muted flex justify-between items-center px-4.5 shrink-0">
              <span className="truncate pr-4">{currentFile.path}</span>
              <button 
                onClick={() => navigator.clipboard.writeText(currentFile.content)}
                className="p-1.5 hover:bg-green-sidebar text-green-muted hover:text-green-accent rounded-lg border border-transparent hover:border-green-border/50 transition-all cursor-pointer"
                title="Copy Code"
              >
                <Clipboard className="h-3.5 w-3.5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4.5 font-mono text-xs text-left leading-relaxed bg-[#030704] text-emerald-300">
              <pre className="whitespace-pre overflow-x-auto">
                <code>
                  {currentFile.content.split('\n').map((line, i) => (
                    <div key={i} className="table-row">
                      <span className="table-cell text-green-muted/30 text-right pr-4 select-none w-8 border-r border-green-border/10 mr-4">
                        {i + 1}
                      </span>
                      <span className="table-cell pl-4 text-[#a7f3d0]">{line}</span>
                    </div>
                  ))}
                </code>
              </pre>
            </div>
          </>
        ) : (
          <div className="flex-grow flex flex-col items-center justify-center text-xs text-green-muted gap-2">
            <Terminal className="h-6 w-6 text-green-muted/30" />
            <span>Select a module from the explorer to preview the source code.</span>
          </div>
        )}
      </div>
    </div>
  );
}
