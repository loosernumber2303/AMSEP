import { useState } from 'react';
import { 
  CheckSquare, 
  Square, 
  Play, 
  Terminal, 
  Loader2, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  ArrowLeft, 
  RotateCcw, 
  ShieldCheck, 
  FileText
} from 'lucide-react';

interface ProjectFile {
  id: number;
  session_id: number;
  path: string;
  content: string;
  is_test: boolean;
  created_at: string;
}

interface TestResult {
  id: number;
  session_id: number;
  attempt: number;
  passed: boolean;
  total_tests: number;
  passed_tests: number;
  failed_tests: number;
  stdout: string;
  stderr: string;
  json_report: string;
  created_at: string;
}

interface ValidationPanelProps {
  sessionId: number;
  status: string;
  requirement?: string;
  files: ProjectFile[];
  testResults: TestResult[];
  onCompleteValidation: (checklist: { [key: string]: boolean }, notes: string) => Promise<void>;
  onRequestChanges: (feedback: string, stage: string) => Promise<void>;
  onReturnToWorkspace: () => Promise<void>;
  onRunApp?: () => Promise<any>;
  onRunTests?: () => Promise<any>;
  initialChecklist?: { [key: string]: boolean };
  initialNotes?: string;
  loading?: boolean;
}

const CHECKLIST_ITEMS = [
  { key: 'requirements_met', label: 'Code meets original software requirement', desc: 'Verify all functional specifications from the requirement are satisfied.' },
  { key: 'edge_cases_handled', label: 'Edge cases and boundary limits handled', desc: 'Check behavior with empty inputs, zero divisions, negative bounds, or out-of-range values.' },
  { key: 'error_handling_verified', label: 'Error handling and input validation verified', desc: 'Ensure proper exceptions (e.g. ValueError) and informative error messages are raised.' },
  { key: 'code_style_clean', label: 'Code style, modular structure, and naming clean', desc: 'Verify PEP 8 compliance, clean class/function declarations, and no debug clutter.' },
  { key: 'tests_cover_paths', label: 'Tests cover critical logical execution paths', desc: 'Assert that unit tests comprehensively cover both normal and error branches.' },
  { key: 'sandbox_execution_verified', label: 'Docker sandbox execution verified', desc: 'Confirm code runs cleanly inside the network-isolated container sandbox.' },
];

export default function ValidationPanel({
  sessionId,
  status,
  requirement,
  files,
  testResults,
  onCompleteValidation,
  onRequestChanges,
  onReturnToWorkspace,
  onRunApp,
  onRunTests,
  initialChecklist = {},
  initialNotes = '',
  loading = false
}: ValidationPanelProps) {
  const [checklist, setChecklist] = useState<{ [key: string]: boolean }>({
    requirements_met: initialChecklist.requirements_met ?? true,
    edge_cases_handled: initialChecklist.edge_cases_handled ?? true,
    error_handling_verified: initialChecklist.error_handling_verified ?? true,
    code_style_clean: initialChecklist.code_style_clean ?? true,
    tests_cover_paths: initialChecklist.tests_cover_paths ?? true,
    sandbox_execution_verified: initialChecklist.sandbox_execution_verified ?? true,
  });

  const [notes, setNotes] = useState(initialNotes);
  const [submitting, setSubmitting] = useState(false);
  const [showChangeBox, setShowChangeBox] = useState(false);
  const [changeNotes, setChangeNotes] = useState('');

  // Sandbox execution state
  const [runningApp, setRunningApp] = useState(false);
  const [runningTests, setRunningTests] = useState(false);
  const [appOutput, setAppOutput] = useState<any>(null);
  const [testOutput, setTestOutput] = useState<any>(null);
  const [activeConsole, setActiveConsole] = useState<'app' | 'tests' | null>(null);

  const toggleCheck = (key: string) => {
    setChecklist(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const allChecked = CHECKLIST_ITEMS.every(item => !!checklist[item.key]);
  const checkedCount = CHECKLIST_ITEMS.filter(item => !!checklist[item.key]).length;

  const handleRunApplication = async () => {
    if (!onRunApp) return;
    setRunningApp(true);
    setActiveConsole('app');
    try {
      const res = await onRunApp();
      setAppOutput(res);
    } catch (e: any) {
      setAppOutput({ status: 'error', stderr: e.message || 'Execution failed' });
    } finally {
      setRunningApp(false);
    }
  };

  const handleRunWorkspaceTests = async () => {
    if (!onRunTests) return;
    setRunningTests(true);
    setActiveConsole('tests');
    try {
      const res = await onRunTests();
      setTestOutput(res);
    } catch (e: any) {
      setTestOutput({ status: 'error', stderr: e.message || 'Tests failed' });
    } finally {
      setRunningTests(false);
    }
  };

  const handleProceed = async () => {
    setSubmitting(true);
    try {
      await onCompleteValidation(checklist, notes);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitChangeRequest = async () => {
    if (!changeNotes.trim()) return;
    setSubmitting(true);
    try {
      await onRequestChanges(changeNotes.trim(), 'MANUAL_VALIDATION');
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-honey-card border border-honey-border rounded-2xl p-6 shadow-sm text-left space-y-6 animate-fade-in relative overflow-hidden">
      
      {/* Decorative honeycomb accent */}
      <div className="absolute top-0 right-0 w-32 h-32 honeycomb-bg opacity-5 pointer-events-none rounded-2xl" />

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-honey-sidebar/20 border border-honey-border rounded-xl relative z-10">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-honey-accent/15 border border-honey-accent/30 text-honey-accent flex items-center justify-center font-bold">
            <CheckSquare className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-honey-text flex items-center gap-2">
              <span>Developer Manual Validation</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-honey-card border border-honey-border text-honey-muted">
                Session #{sessionId} ({status})
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-honey-accent/20 text-honey-accent font-bold">
                HUMAN CHECKPOINT
              </span>
            </h2>
            <p className="text-xs text-honey-muted mt-0.5">
              Verify compliance, run isolated sandbox assertions, and sign off on quality criteria.
              {requirement ? ` Target: "${requirement}" (${files.length} files, ${testResults.length} test runs).` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-honey-accent bg-honey-card px-3 py-1.5 rounded-lg border border-honey-border">
            {checkedCount} / {CHECKLIST_ITEMS.length} Criteria Verified
          </span>
        </div>
      </div>

      {/* Direct Sandbox Execution Triggers */}
      <div className="p-4 bg-honey-sidebar/10 border border-honey-border rounded-xl space-y-3 relative z-10">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-honey-text uppercase tracking-wider flex items-center gap-2">
            <Terminal className="h-4 w-4 text-honey-accent" />
            Sandbox Verification Triggers
          </span>
          <span className="text-[11px] text-honey-muted font-mono">
            Docker network-isolated container
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleRunApplication}
            disabled={runningApp || runningTests}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl border border-honey-border bg-honey-card hover:bg-honey-accent hover:text-honey-bg hover:border-honey-accent text-honey-text transition-all cursor-pointer disabled:opacity-50"
          >
            {runningApp ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 text-honey-accent" />}
            <span>Run Application in Docker</span>
          </button>

          <button
            onClick={handleRunWorkspaceTests}
            disabled={runningApp || runningTests}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl border border-honey-border bg-honey-card hover:bg-honey-accent hover:text-honey-bg hover:border-honey-accent text-honey-text transition-all cursor-pointer disabled:opacity-50"
          >
            {runningTests ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4 text-emerald-500" />}
            <span>Run PyTest in Docker</span>
          </button>
        </div>

        {/* Inline Console Output */}
        {activeConsole === 'app' && appOutput && (
          <div className="mt-3 p-3.5 bg-honey-sidebar/30 border border-honey-border rounded-xl text-xs space-y-2">
            <div className="flex items-center justify-between font-mono text-[11px]">
              <span className="font-semibold text-honey-text">Entrypoint: {appOutput.entrypoint || 'main.py'}</span>
              <span className={`px-2 py-0.5 rounded font-bold ${appOutput.exit_code === 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                Exit Code: {appOutput.exit_code ?? 'N/A'}
              </span>
            </div>
            {appOutput.stdout && (
              <pre className="p-2.5 bg-black/40 rounded-lg font-mono text-[11px] text-honey-text max-h-36 overflow-y-auto whitespace-pre-wrap">
                {appOutput.stdout}
              </pre>
            )}
            {appOutput.stderr && (
              <pre className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-lg font-mono text-[11px] text-rose-400 max-h-36 overflow-y-auto whitespace-pre-wrap">
                {appOutput.stderr}
              </pre>
            )}
          </div>
        )}

        {activeConsole === 'tests' && testOutput && (
          <div className="mt-3 p-3.5 bg-honey-sidebar/30 border border-honey-border rounded-xl text-xs space-y-2">
            <div className="flex items-center justify-between font-mono text-[11px]">
              <span className="font-semibold text-honey-text">
                PyTest Result: {testOutput.passed_tests || 0} passed, {testOutput.failed_tests || 0} failed (Total: {testOutput.total_tests || 0})
              </span>
              <span className={`px-2 py-0.5 rounded font-bold ${testOutput.passed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                {testOutput.passed ? 'ALL PASSED' : 'FAILURES DETECTED'}
              </span>
            </div>
            {testOutput.stdout && (
              <pre className="p-2.5 bg-black/40 rounded-lg font-mono text-[11px] text-honey-text max-h-36 overflow-y-auto whitespace-pre-wrap">
                {testOutput.stdout}
              </pre>
            )}
            {testOutput.stderr && (
              <pre className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-lg font-mono text-[11px] text-rose-400 max-h-36 overflow-y-auto whitespace-pre-wrap">
                {testOutput.stderr}
              </pre>
            )}
          </div>
        )}
      </div>

      {/* 6-Point Criteria Checklist */}
      <div className="space-y-3 relative z-10">
        <h3 className="text-xs font-bold text-honey-text uppercase tracking-wider flex items-center gap-2">
          <span>Quality & Compliance Checklist</span>
          <span className="text-[10px] text-honey-muted font-normal lowercase">(toggle to verify)</span>
        </h3>

        <div className="grid sm:grid-cols-2 gap-3">
          {CHECKLIST_ITEMS.map((item) => {
            const isChecked = !!checklist[item.key];
            return (
              <div
                key={item.key}
                onClick={() => toggleCheck(item.key)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                  isChecked
                    ? 'bg-emerald-500/5 border-emerald-500/30 text-honey-text'
                    : 'bg-honey-sidebar/10 border-honey-border hover:border-honey-accent/50 text-honey-muted'
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {isChecked ? (
                    <CheckSquare className="h-4.5 w-4.5 text-emerald-500" />
                  ) : (
                    <Square className="h-4.5 w-4.5 text-honey-muted/60" />
                  )}
                </div>
                <div>
                  <h4 className={`text-xs font-bold leading-tight ${isChecked ? 'text-honey-text' : 'text-honey-muted'}`}>
                    {item.label}
                  </h4>
                  <p className="text-[11px] text-honey-muted/80 mt-1 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Validation Notes Area */}
      <div className="space-y-2 relative z-10">
        <label className="text-xs font-bold text-honey-text uppercase tracking-wider flex items-center gap-2">
          <FileText className="h-4 w-4 text-honey-accent" />
          <span>Developer Validation Notes (Optional)</span>
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Record observations, boundary test notes, or specific validation remarks..."
          className="w-full h-24 p-3 bg-honey-sidebar/20 border border-honey-border rounded-xl text-xs font-mono text-honey-text focus:outline-none focus:border-honey-accent resize-none placeholder:text-honey-muted/50"
        />
      </div>

      {/* Request Changes Inline Box (if toggled) */}
      {showChangeBox && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-3 relative z-10 animate-fade-in">
          <h4 className="text-xs font-bold text-amber-500 uppercase tracking-wider flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            <span>Specify Changes Required in Workspace</span>
          </h4>
          <textarea
            value={changeNotes}
            onChange={(e) => setChangeNotes(e.target.value)}
            placeholder="Explain what needs to be changed or fixed in the workspace..."
            className="w-full h-20 p-2.5 bg-honey-sidebar/30 border border-amber-500/30 rounded-lg text-xs font-mono text-honey-text focus:outline-none focus:border-amber-500 resize-none"
          />
          <div className="flex items-center gap-3 justify-end">
            <button
              onClick={() => setShowChangeBox(false)}
              className="px-3 py-1.5 text-xs text-honey-muted hover:text-honey-text cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmitChangeRequest}
              disabled={submitting || !changeNotes.trim()}
              className="px-4 py-1.5 text-xs font-bold rounded-lg bg-amber-500 text-black hover:bg-amber-400 transition-all cursor-pointer disabled:opacity-50"
            >
              Submit Change Request & Return to Workspace
            </button>
          </div>
        </div>
      )}

      {/* Action Decision Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-honey-border/60 relative z-10">
        <div className="flex items-center gap-2">
          <button
            onClick={onReturnToWorkspace}
            disabled={submitting || loading}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl border border-honey-border hover:bg-honey-sidebar/20 text-honey-muted hover:text-honey-text transition-all cursor-pointer disabled:opacity-50"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Return to Workspace</span>
          </button>

          {!showChangeBox && (
            <button
              onClick={() => setShowChangeBox(true)}
              disabled={submitting || loading}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl border border-amber-500/40 text-amber-500 hover:bg-amber-500/10 transition-all cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Request Changes</span>
            </button>
          )}
        </div>

        <button
          onClick={handleProceed}
          disabled={submitting || loading || !allChecked}
          className={`flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl shadow-lg transition-all cursor-pointer ${
            allChecked
              ? 'bg-gradient-to-r from-honey-accent to-amber-500 hover:from-amber-500 hover:to-honey-accent text-honey-bg shadow-honey-accent/25'
              : 'bg-honey-sidebar/30 text-honey-muted border border-honey-border cursor-not-allowed'
          } disabled:opacity-50`}
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          <span>Mark Validation Complete & Proceed</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

    </div>
  );
}
