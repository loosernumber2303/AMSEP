import { 
  FileCode, 
  Clipboard, 
  Folder, 
  Terminal, 
  Loader2, 
  Play, 
  Save, 
  CheckCircle2, 
  MessageSquare, 
  Send, 
  ShieldAlert, 
  Sparkles, 
  ArrowRight,
  Check,
  AlertTriangle
} from 'lucide-react';
import React, { useState, useEffect } from 'react';

interface ProjectFile {
  id: number;
  session_id: number;
  path: string;
  content: string;
  is_test: boolean;
  created_at: string;
}

interface ExecutionLog {
  id: number;
  session_id: number;
  log_text: string;
  created_at: string;
}

interface CodeViewerProps {
  files: ProjectFile[];
  status: string;
  sessionId: number;
  requirement?: string;
  planJson?: string | null;
  logs?: ExecutionLog[];
  onSaveFile?: (fileId: number, content: string) => Promise<void>;
  onRunApp?: () => Promise<any>;
  onRunTests?: () => Promise<any>;
  onSubmitFeedback?: (feedback: string) => Promise<void>;
  onProceedToReview?: () => Promise<void>;
  onDiagnoseFailure?: () => Promise<any>;
  onAcceptCorrection?: (filePath: string, correctedContent: string) => Promise<any>;
  onRejectCorrection?: (reason: string) => Promise<any>;
  loading?: boolean;
}

export default function CodeViewer({ 
  files, 
  status, 
  sessionId,
  requirement,
  planJson,
  logs = [],
  onSaveFile,
  onRunApp,
  onRunTests,
  onSubmitFeedback,
  onProceedToReview,
  onDiagnoseFailure,
  onAcceptCorrection,
  onRejectCorrection,
  loading = false
}: CodeViewerProps) {
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [editedContents, setEditedContents] = useState<{ [path: string]: string }>({});
  const [modifiedFileIds, setModifiedFileIds] = useState<Set<number>>(new Set());
  const [savingFile, setSavingFile] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // Console output state
  const [consoleTab, setConsoleTab] = useState<'app' | 'tests'>('app');
  const [appOutput, setAppOutput] = useState<any>(null);
  const [testOutput, setTestOutput] = useState<any>(null);
  const [runningApp, setRunningApp] = useState(false);
  const [runningTests, setRunningTests] = useState(false);

  // Feedback state
  const [feedbackText, setFeedbackText] = useState('');
  const [sendingFeedback, setSendingFeedback] = useState(false);
  const [feedbackSentSuccess, setFeedbackSentSuccess] = useState(false);

  // AI Correction Proposal state
  const [proposal, setProposal] = useState<any>(null);
  const [diagnosing, setDiagnosing] = useState(false);
  const [applyingFix, setApplyingFix] = useState(false);

  // Reset workspace state when switching sessions
  useEffect(() => {
    setSelectedPath(files.length > 0 ? files[0].path : null);
    setEditedContents({});
    setModifiedFileIds(new Set());
    setAppOutput(null);
    setTestOutput(null);
    setFeedbackText('');
    setSaveSuccess(null);
    setProposal(null);
  }, [sessionId]);

  // Synchronize initial selection when files arrive
  useEffect(() => {
    if (files.length > 0 && (!selectedPath || !files.find(f => f.path === selectedPath))) {
      setSelectedPath(files[0].path);
    }
  }, [files]);

  const currentFile = files.find(f => f.path === selectedPath);

  // Current content being edited or viewed
  const currentContent = currentFile 
    ? (editedContents[currentFile.path] !== undefined ? editedContents[currentFile.path] : currentFile.content)
    : '';

  const isDirty = currentFile && editedContents[currentFile.path] !== undefined && editedContents[currentFile.path] !== currentFile.content;

  // Determine if file was previously modified by dev (from logs or local set)
  const isFileModifiedByDev = currentFile && (
    modifiedFileIds.has(currentFile.id) ||
    logs.some(l => l.log_text.includes(`[DEVELOPER EDIT] Modified ${currentFile.path}`))
  );

  const handleContentChange = (val: string) => {
    if (!currentFile) return;
    setEditedContents(prev => ({
      ...prev,
      [currentFile.path]: val
    }));
    setSaveSuccess(null);
  };

  const handleSave = async () => {
    if (!currentFile || !onSaveFile || !isDirty) return;
    setSavingFile(true);
    try {
      await onSaveFile(currentFile.id, currentContent);
      setModifiedFileIds(prev => new Set(prev).add(currentFile.id));
      setSaveSuccess(`Saved ${currentFile.path}`);
      setTimeout(() => setSaveSuccess(null), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingFile(false);
    }
  };

  const handleRunApplication = async () => {
    if (!onRunApp) return;
    setRunningApp(true);
    setConsoleTab('app');
    try {
      const res = await onRunApp();
      setAppOutput(res);
    } catch (err: any) {
      setAppOutput({
        status: 'error',
        message: 'Application execution failed',
        stderr: err.message || 'Execution error'
      });
    } finally {
      setRunningApp(false);
    }
  };

  const handleRunWorkspaceTests = async () => {
    if (!onRunTests) return;
    setRunningTests(true);
    setConsoleTab('tests');
    try {
      const res = await onRunTests();
      setTestOutput(res);
    } catch (err: any) {
      setTestOutput({
        status: 'error',
        message: 'Test execution failed',
        stderr: err.message || 'Execution error'
      });
    } finally {
      setRunningTests(false);
    }
  };

  const handleSendFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackText.trim() || !onSubmitFeedback || sendingFeedback) return;
    setSendingFeedback(true);
    try {
      await onSubmitFeedback(feedbackText.trim());
      setFeedbackText('');
      setFeedbackSentSuccess(true);
      setTimeout(() => setFeedbackSentSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSendingFeedback(false);
    }
  };

  const handleDiagnose = async () => {
    if (!onDiagnoseFailure) return;
    setDiagnosing(true);
    try {
      const p = await onDiagnoseFailure();
      setProposal(p);
    } catch (e) {
      console.error(e);
    } finally {
      setDiagnosing(false);
    }
  };

  const handleAcceptProposal = async () => {
    if (!proposal || !onAcceptCorrection) return;
    setApplyingFix(true);
    try {
      const res = await onAcceptCorrection(proposal.affected_file, proposal.proposed_code);
      setEditedContents(prev => ({
        ...prev,
        [proposal.affected_file]: proposal.proposed_code
      }));
      setTestOutput(res);
      setConsoleTab('tests');
      setProposal(null);
    } catch (e) {
      console.error(e);
    } finally {
      setApplyingFix(false);
    }
  };

  const handleRejectProposal = async () => {
    if (onRejectCorrection) {
      try {
        await onRejectCorrection('Developer rejected AI correction proposal.');
      } catch (e) {
        console.error(e);
      }
    }
    setProposal(null);
  };

  const handleManualEditProposal = () => {
    if (proposal?.affected_file) {
      setSelectedPath(proposal.affected_file);
    }
    setProposal(null);
  };

  // Find latest change request in logs if any
  const latestChangeRequest = logs
    ? [...logs].reverse().find(l => l.log_text.includes('[CHANGE REQUESTED]'))
    : null;
  const changeRequestNotes = latestChangeRequest 
    ? latestChangeRequest.log_text.split('[CHANGE REQUESTED]')[1]?.trim() 
    : null;

  if (files.length === 0) {
    if (['CODING', 'PLAN_APPROVED'].includes(status)) {
      return (
        <div className="flex flex-col items-center justify-center py-20 bg-honey-card border border-honey-border rounded-2xl p-6">
          <Loader2 className="h-8 w-8 animate-spin text-honey-accent mb-3" />
          <p className="text-sm text-honey-text font-semibold">Coding application modules...</p>
          <p className="text-xs text-honey-muted mt-1">Generating file trees and preparing the developer workspace.</p>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-honey-card border border-honey-border rounded-2xl p-6">
        <FileCode className="h-8 w-8 text-honey-muted/40 mb-3" />
        <p className="text-sm text-honey-muted font-medium">No source files generated yet</p>
        <p className="text-xs text-honey-muted/60 mt-1">Approve the plan in the Plan tab to generate code into this workspace.</p>
      </div>
    );
  }

  // Parse feedback from logs
  const pastFeedback = logs
    .filter(l => l.log_text.includes('[DEVELOPER FEEDBACK]'))
    .map(l => l.log_text.replace('[DEVELOPER FEEDBACK]', '').trim());

  return (
    <div className="flex flex-col space-y-4 text-left animate-fade-in">
      
      {/* ACTIVE CHANGE REQUEST BANNER */}
      {changeRequestNotes && (
        <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-xs flex items-start gap-3 text-amber-500 animate-fade-in shadow-sm">
          <AlertTriangle className="h-4.5 w-4.5 shrink-0 mt-0.5 text-amber-500" />
          <div className="space-y-0.5">
            <span className="font-bold uppercase tracking-wider block">
              Active Change Request from Developer Review / Validation
            </span>
            <span className="text-honey-text block font-mono text-[11px]">
              {changeRequestNotes}
            </span>
            <span className="text-[10px] text-honey-muted block">
              Edit the files below, run tests in Docker sandbox, and proceed to review when ready.
            </span>
          </div>
        </div>
      )}

      {/* WORKSPACE TOP CONTROL BAR */}
      <div className="bg-honey-card border border-honey-border rounded-2xl p-3.5 px-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2">
          <Terminal className="h-4.5 w-4.5 text-honey-accent" />
          <span className="text-xs font-bold uppercase tracking-wider text-honey-text">Developer Workspace</span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-honey-accent/15 text-honey-accent border border-honey-accent/30 font-semibold">
            Session #{sessionId}
          </span>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
          {/* RUN APPLICATION */}
          <button
            onClick={handleRunApplication}
            disabled={runningApp || loading}
            className="px-3.5 py-1.5 bg-honey-card hover:bg-honey-sidebar border border-honey-border hover:border-honey-accent/60 text-honey-text hover:text-honey-accent rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            title="Run application in Docker sandbox"
          >
            {runningApp ? <Loader2 className="h-3.5 w-3.5 animate-spin text-honey-accent" /> : <Play className="h-3.5 w-3.5 fill-current text-honey-accent" />}
            <span>Run Application</span>
          </button>

          {/* RUN TESTS */}
          <button
            onClick={handleRunWorkspaceTests}
            disabled={runningTests || loading}
            className="px-3.5 py-1.5 bg-honey-card hover:bg-honey-sidebar border border-honey-border hover:border-honey-accent/60 text-honey-text hover:text-honey-accent rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            title="Execute PyTest in Docker sandbox"
          >
            {runningTests ? <Loader2 className="h-3.5 w-3.5 animate-spin text-honey-accent" /> : <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
            <span>Run Tests</span>
          </button>

          {/* PROCEED TO REVIEW */}
          {onProceedToReview && (
            <button
              onClick={onProceedToReview}
              disabled={loading}
              className="px-4 py-1.5 bg-honey-accent text-honey-bg rounded-xl text-xs font-bold hover:bg-honey-accent-hover transition-all shadow-md shadow-honey-accent/15 cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              title="Proceed to AI code review"
            >
              <span>Proceed to Review</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* WORKSPACE 3-COLUMN MAIN ENVIRONMENT */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 h-[520px]">
        
        {/* COLUMN 1: FILE EXPLORER (3 cols) */}
        <div className="md:col-span-3 border border-honey-border rounded-2xl bg-honey-card flex flex-col overflow-hidden shadow-sm">
          <div className="p-3 border-b border-honey-border/80 text-[10px] font-bold text-honey-muted flex items-center justify-between uppercase tracking-wider bg-honey-sidebar/10">
            <div className="flex items-center gap-1.5">
              <Folder className="h-3.5 w-3.5 text-honey-accent" />
              <span>Project Files</span>
            </div>
            <span className="font-mono text-[9px] text-honey-muted/70">{files.length} files</span>
          </div>

          <div className="p-2 space-y-1 overflow-y-auto flex-1">
            {files.map(file => {
              const isSelected = selectedPath === file.path;
              const hasUnsavedEdits = editedContents[file.path] !== undefined && editedContents[file.path] !== file.content;
              const isMod = modifiedFileIds.has(file.id) || logs.some(l => l.log_text.includes(`[DEVELOPER EDIT] Modified ${file.path}`));

              return (
                <button
                  key={file.id}
                  onClick={() => setSelectedPath(file.path)}
                  className={`w-full flex items-center justify-between p-2 rounded-xl text-left text-xs font-mono transition-all border ${
                    isSelected
                      ? 'bg-honey-accent/10 border-honey-accent/30 text-honey-accent font-semibold shadow-inner'
                      : 'border-transparent text-honey-muted hover:bg-honey-sidebar/30 hover:text-honey-text cursor-pointer'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <FileCode className={`h-3.5 w-3.5 shrink-0 ${file.is_test ? 'text-amber-500' : 'text-honey-accent'}`} />
                    <span className="truncate">{file.path}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-1">
                    {hasUnsavedEdits && (
                      <span className="h-2 w-2 rounded-full bg-honey-accent" title="Unsaved changes" />
                    )}
                    {isMod && !hasUnsavedEdits && (
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" title="Modified by developer" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* COLUMN 2: CODE EDITOR (6 cols) */}
        <div className="md:col-span-6 border border-honey-border rounded-2xl bg-honey-card flex flex-col overflow-hidden shadow-sm">
          {currentFile ? (
            <>
              {/* Editor Header Bar */}
              <div className="p-2.5 px-3.5 bg-honey-sidebar/10 border-b border-honey-border text-[11px] font-mono text-honey-muted flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2 truncate">
                  <span className="font-bold text-honey-text truncate">{currentFile.path}</span>
                  {/* Distinction Badge: AI-GENERATED vs MODIFIED BY DEVELOPER */}
                  {isFileModifiedByDev ? (
                    <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-500/15 text-amber-500 border border-amber-500/30 uppercase">
                      Developer Modified
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-honey-accent/15 text-honey-accent border border-honey-accent/30 uppercase">
                      AI Generated
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {saveSuccess && (
                    <span className="text-[10px] text-emerald-500 font-sans font-semibold flex items-center gap-1">
                      <Check className="h-3 w-3" />
                      Saved
                    </span>
                  )}

                  {/* SAVE BUTTON */}
                  <button
                    onClick={handleSave}
                    disabled={!isDirty || savingFile}
                    className="px-3 py-1 bg-honey-accent hover:bg-honey-accent-hover disabled:opacity-40 disabled:hover:bg-honey-accent text-honey-bg rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow-sm cursor-pointer disabled:cursor-not-allowed"
                    title="Save changes to workspace"
                  >
                    {savingFile ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                    <span>Save</span>
                  </button>

                  {/* COPY CODE BUTTON */}
                  <button 
                    onClick={() => navigator.clipboard.writeText(currentContent)}
                    className="p-1 hover:bg-honey-sidebar text-honey-muted hover:text-honey-accent rounded-lg border border-transparent hover:border-honey-border/50 transition-all cursor-pointer"
                    title="Copy Code"
                  >
                    <Clipboard className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Editable Code Surface */}
              <div className="flex-1 flex overflow-hidden bg-[#0C0B08] text-yellow-300 font-mono text-xs">
                {/* Line Numbers */}
                <div className="w-10 py-3 pr-2 text-right text-honey-muted/30 select-none border-r border-honey-border/10 bg-[#090806] shrink-0 font-mono text-[11px] leading-relaxed">
                  {currentContent.split('\n').map((_, i) => (
                    <div key={i}>{i + 1}</div>
                  ))}
                </div>

                {/* Textarea Editor */}
                <textarea
                  value={currentContent}
                  onChange={(e) => handleContentChange(e.target.value)}
                  className="flex-1 p-3 bg-transparent text-[#FFFDF5] font-mono text-[11px] leading-relaxed resize-none focus:outline-none overflow-auto whitespace-pre"
                  spellCheck={false}
                />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs text-honey-muted">
              Select a file to inspect and edit code
            </div>
          )}
        </div>

        {/* COLUMN 3: AI CONTEXT & DEVELOPER FEEDBACK (3 cols) */}
        <div className="md:col-span-3 border border-honey-border rounded-2xl bg-honey-card flex flex-col overflow-hidden shadow-sm space-y-3 p-3">
          
          {/* AI Task Context Card */}
          <div className="space-y-1.5 p-3 rounded-xl bg-honey-sidebar/10 border border-honey-border/50 shrink-0">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-honey-accent uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Requirement Context</span>
            </div>
            {(() => {
              try {
                if (planJson) {
                  const p = JSON.parse(planJson);
                  if (p.project_title) {
                    return (
                      <span className="text-[10px] font-semibold text-honey-accent block">
                        {p.project_title}
                      </span>
                    );
                  }
                }
              } catch {
                // ignore
              }
              return null;
            })()}
            <p className="text-[11px] text-honey-text font-medium line-clamp-3 leading-relaxed">
              {requirement || "Current development session task."}
            </p>
          </div>

          {/* DEVELOPER FEEDBACK INPUT AREA */}
          <div className="flex-1 flex flex-col justify-between border border-honey-border/60 rounded-xl p-3 bg-honey-sidebar/5 overflow-hidden">
            <div className="space-y-2 flex-1 flex flex-col overflow-hidden">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-honey-text uppercase tracking-wider">
                <MessageSquare className="h-3.5 w-3.5 text-honey-accent" />
                <span>Developer Feedback</span>
              </div>
              <p className="text-[10px] text-honey-muted leading-relaxed">
                Provide observations or issues regarding the generated code.
              </p>

              {/* Feedback Textarea */}
              <textarea
                rows={3}
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="e.g., Deleting an expense does not update the total balance."
                className="w-full bg-honey-sidebar/20 border border-honey-border rounded-xl p-2.5 text-xs text-honey-text placeholder-honey-muted/50 focus:border-honey-accent focus:outline-none resize-none"
              />

              <button
                type="button"
                onClick={handleSendFeedback}
                disabled={!feedbackText.trim() || sendingFeedback}
                className="w-full py-1.5 bg-honey-accent/15 hover:bg-honey-accent text-honey-accent hover:text-honey-bg border border-honey-accent/30 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {sendingFeedback ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                <span>Send Feedback</span>
              </button>

              {feedbackSentSuccess && (
                <span className="text-[10px] text-emerald-500 text-center font-semibold animate-fade-in">
                  Feedback recorded for session #{sessionId}
                </span>
              )}

              {/* Past Feedback Log */}
              {pastFeedback.length > 0 && (
                <div className="mt-2 pt-2 border-t border-honey-border/40 flex-1 overflow-y-auto space-y-1.5">
                  <span className="text-[9px] font-bold text-honey-muted uppercase block">Logged Feedback:</span>
                  {pastFeedback.map((fb, idx) => (
                    <div key={idx} className="text-[10px] text-honey-text bg-honey-sidebar/20 p-1.5 rounded-lg border border-honey-border/30 italic">
                      "{fb}"
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* BOTTOM CONSOLE PANEL: SANDBOX TERMINAL & TEST EXECUTION */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-lg font-mono text-xs">
        
        {/* Console Header Tabs */}
        <div className="flex items-center justify-between px-4 py-2 bg-neutral-950 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <Terminal className="h-3.5 w-3.5 text-honey-accent" />
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Sandbox Terminal</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setConsoleTab('app')}
              className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                consoleTab === 'app'
                  ? 'bg-neutral-800 text-honey-accent border border-honey-accent/30'
                  : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              Application Output
            </button>
            <button
              onClick={() => setConsoleTab('tests')}
              className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                consoleTab === 'tests'
                  ? 'bg-neutral-800 text-honey-accent border border-honey-accent/30'
                  : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              Test Suite Output
            </button>
          </div>
        </div>

        {/* Console Body */}
        <div className="p-4 max-h-48 overflow-y-auto text-left leading-relaxed">
          {consoleTab === 'app' ? (
            appOutput ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[10px] text-neutral-400 border-b border-neutral-800 pb-1">
                  <span>Entrypoint: {appOutput.entrypoint || 'main.py'}</span>
                  <span className={appOutput.status === 'success' ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                    {appOutput.status === 'success' ? `EXIT CODE ${appOutput.exit_code}` : 'ERROR'}
                  </span>
                </div>

                {/* Graceful Docker unavailable notification */}
                {!appOutput.sandbox_available && (
                  <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400 flex items-center gap-2 text-[11px]">
                    <ShieldAlert className="h-4 w-4 shrink-0" />
                    <span>{appOutput.message}</span>
                  </div>
                )}

                {appOutput.stdout && (
                  <pre className="text-emerald-300 whitespace-pre-wrap text-[11px]">{appOutput.stdout}</pre>
                )}
                {appOutput.stderr && (
                  <pre className="text-rose-400 whitespace-pre-wrap text-[11px]">{appOutput.stderr}</pre>
                )}
              </div>
            ) : (
              <div className="text-neutral-500 italic py-3 text-[11px]">
                Click <strong className="text-honey-accent">[ Run Application ]</strong> above to execute code securely in the Docker sandbox.
              </div>
            )
          ) : (
            testOutput ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[10px] text-neutral-400 border-b border-neutral-800 pb-1">
                  <span>PyTest Sandbox Runner</span>
                  <span className={testOutput.passed ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                    {testOutput.passed ? 'ALL TESTS PASSED' : 'TESTS FAILED'}
                  </span>
                </div>

                {!testOutput.sandbox_available && (
                  <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400 flex items-center gap-2 text-[11px]">
                    <ShieldAlert className="h-4 w-4 shrink-0" />
                    <span>{testOutput.message}</span>
                  </div>
                )}

                {testOutput.sandbox_available && (
                  <div className="grid grid-cols-3 gap-2 text-[10px] text-neutral-300 bg-neutral-950 p-2 rounded-lg border border-neutral-800">
                    <div>Total Assertions: {testOutput.total_tests}</div>
                    <div className="text-emerald-400">Passed: {testOutput.passed_tests}</div>
                    <div className="text-rose-400">Failed: {testOutput.failed_tests}</div>
                  </div>
                )}

                {testOutput.stdout && (
                  <pre className="text-neutral-300 whitespace-pre-wrap text-[11px]">{testOutput.stdout}</pre>
                )}
                {testOutput.stderr && (
                  <pre className="text-rose-400 whitespace-pre-wrap text-[11px]">{testOutput.stderr}</pre>
                )}

                {testOutput && !testOutput.passed && onDiagnoseFailure && !proposal && (
                  <div className="pt-2 flex items-center justify-between border-t border-neutral-800">
                    <span className="text-[10px] text-rose-400">Tests failed. Propose an AI diagnosis & fix?</span>
                    <button
                      onClick={handleDiagnose}
                      disabled={diagnosing}
                      className="px-2.5 py-1 rounded bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/40 text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {diagnosing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                      <span>Diagnose & Propose Fix</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-neutral-500 italic py-3 text-[11px]">
                Click <strong className="text-honey-accent">[ Run Tests ]</strong> above to execute PyTest assertions inside the Docker sandbox.
              </div>
            )
          )}
        </div>

      </div>

      {/* AI CORRECTION PROPOSAL CARD (Human Authority - Developer decides) */}
      {proposal && (
        <div className="p-4 bg-honey-card border-2 border-honey-accent/40 rounded-2xl shadow-xl space-y-3.5 animate-fade-in text-xs relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-honey-border/80 pb-2.5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4.5 w-4.5 text-honey-accent" />
              <span className="font-bold uppercase tracking-wider text-honey-text text-[11px]">
                AI Correction Proposal (Advisory — Developer Authority)
              </span>
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-honey-accent/20 text-honey-accent border border-honey-accent/30">
              Target: {proposal.affected_file}
            </span>
          </div>

          <div className="grid md:grid-cols-2 gap-3 text-[11px]">
            <div className="space-y-1">
              <span className="font-semibold text-rose-400 block">Failure Reason:</span>
              <p className="text-honey-muted bg-honey-sidebar/20 p-2 rounded-lg border border-honey-border font-mono text-[10px]">
                {proposal.failure_summary}
              </p>
            </div>
            <div className="space-y-1">
              <span className="font-semibold text-honey-accent block">Explanation & Proposed Fix:</span>
              <p className="text-honey-muted bg-honey-sidebar/20 p-2 rounded-lg border border-honey-border leading-relaxed">
                {proposal.explanation}
              </p>
            </div>
          </div>

          {proposal.proposed_code && (
            <div className="space-y-1">
              <span className="font-semibold text-honey-text block text-[10px] uppercase tracking-wider">
                Proposed Code Replacement Preview:
              </span>
              <pre className="p-3 bg-black/60 border border-honey-border rounded-xl font-mono text-[10px] text-emerald-300 max-h-36 overflow-y-auto whitespace-pre-wrap">
                {proposal.proposed_code}
              </pre>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-honey-border/60">
            <span className="text-[10px] text-honey-muted italic">
              Your existing files remain untouched until you choose to accept.
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRejectProposal}
                className="px-3 py-1.5 rounded-lg border border-honey-border text-honey-muted hover:text-honey-text text-xs font-semibold cursor-pointer"
              >
                Reject
              </button>
              <button
                onClick={handleManualEditProposal}
                className="px-3 py-1.5 rounded-lg border border-honey-accent/50 text-honey-accent hover:bg-honey-accent/10 text-xs font-semibold cursor-pointer"
              >
                Edit Manually
              </button>
              <button
                onClick={handleAcceptProposal}
                disabled={applyingFix}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {applyingFix ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                <span>Accept AI Change & Retest</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
