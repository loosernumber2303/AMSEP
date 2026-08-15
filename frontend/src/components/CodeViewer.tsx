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
        <div className="flex flex-col items-center justify-center py-20 bg-honey-card border border-honey-border rounded-2xl p-6">
          <Loader2 className="h-8 w-8 animate-spin text-honey-accent mb-3" />
          <p className="text-sm text-honey-text font-semibold">Coding application modules...</p>
          <p className="text-xs text-honey-muted mt-1">Generating file trees and implementing core algorithms.</p>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-honey-card border border-honey-border rounded-2xl p-6">
        <FileCode className="h-8 w-8 text-honey-muted/40 mb-3" />
        <p className="text-sm text-honey-muted font-medium">No source files generated yet</p>
        <p className="text-xs text-honey-muted/60 mt-1">Files created by the Coder Agent will display here.</p>
      </div>
    );
  }

  return (
    <div className="h-[480px] flex border border-honey-border rounded-2xl overflow-hidden bg-honey-card shadow-lg animate-fade-in">
      {/* File Tree Explorer */}
      <div className="w-56 border-r border-honey-border bg-honey-sidebar/15 flex flex-col shrink-0">
        <div className="p-3 border-b border-honey-border/80 text-[10px] font-semibold text-honey-muted flex items-center gap-1.5 uppercase tracking-wider">
          <Folder className="h-3.5 w-3.5 text-honey-accent" />
          <span>Files Tree</span>
        </div>
        <div className="p-2 space-y-1 overflow-y-auto flex-1 text-left">
          {files.map(file => (
            <button
              key={file.id}
              onClick={() => setSelectedPath(file.path)}
              className={`w-full flex items-center gap-2.5 p-2 rounded-xl text-left text-xs font-mono transition-all border ${
                selectedPath === file.path
                  ? 'bg-honey-accent/10 border-honey-accent/30 text-honey-accent font-semibold shadow-inner'
                  : 'border-transparent text-honey-muted hover:bg-honey-sidebar/30 hover:text-honey-text cursor-pointer'
              }`}
            >
              {/* Keep subtle amber/gold icons */}
              <FileCode className={`h-4 w-4 shrink-0 ${file.is_test ? 'text-amber-500' : 'text-amber-400'}`} />
              <span className="truncate">{file.path}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Editor Viewer */}
      <div className="flex-1 flex flex-col min-w-0 bg-honey-card">
        {currentFile ? (
          <>
            <div className="p-3 bg-honey-sidebar/10 border-b border-honey-border text-[11px] font-mono text-honey-muted flex justify-between items-center px-4.5 shrink-0">
              <span className="truncate pr-4">{currentFile.path}</span>
              <button 
                onClick={() => navigator.clipboard.writeText(currentFile.content)}
                className="p-1.5 hover:bg-honey-sidebar text-honey-muted hover:text-honey-accent rounded-lg border border-transparent hover:border-honey-border/50 transition-all cursor-pointer"
                title="Copy Code"
              >
                <Clipboard className="h-3.5 w-3.5" />
              </button>
            </div>
            
            {/* Editor Screen - Premium honey/dark-gold terminal styling */}
            <div className="flex-1 overflow-y-auto p-4.5 font-mono text-xs text-left leading-relaxed bg-[#0C0B08] text-yellow-300">
              <pre className="whitespace-pre overflow-x-auto">
                <code>
                  {currentFile.content.split('\n').map((line, i) => (
                    <div key={i} className="table-row">
                      <span className="table-cell text-honey-muted/20 text-right pr-4 select-none w-8 border-r border-honey-border/10 mr-4">
                        {i + 1}
                      </span>
                      <span className="table-cell pl-4 text-[#FFFDF5]">{line}</span>
                    </div>
                  ))}
                </code>
              </pre>
            </div>
          </>
        ) : (
          <div className="flex-grow flex flex-col items-center justify-center text-xs text-honey-muted gap-2">
            <Terminal className="h-6 w-6 text-honey-muted/30" />
            <span>Select a module from the explorer to preview the source code.</span>
          </div>
        )}
      </div>
    </div>
  );
}
