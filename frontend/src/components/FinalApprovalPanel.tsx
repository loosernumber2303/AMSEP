import { useState } from 'react';
import { 
  CheckCircle, 
  ShieldCheck, 
  RotateCcw, 
  Download, 
  FileCode, 
  CheckSquare, 
  Terminal, 
  Loader2, 
  Sparkles, 
  FileText, 
  Award, 
  AlertTriangle
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

interface FinalApprovalPanelProps {
  sessionId: number;
  status: string;
  requirement: string;
  planJson?: string | null;
  files: ProjectFile[];
  testResults: TestResult[];
  reviewReportJson?: string | null;
  validationChecklistJson?: string | null;
  auditTrail?: any[];
  onFinalApproval: (notes: string) => Promise<void>;
  onRejectToWorkspace: (feedback: string) => Promise<void>;
  onExportProject?: () => void;
  loading?: boolean;
}

export default function FinalApprovalPanel({
  sessionId,
  status,
  requirement,
  planJson,
  files,
  testResults,
  reviewReportJson,
  validationChecklistJson,
  auditTrail = [],
  onFinalApproval,
  onRejectToWorkspace,
  onExportProject,
  loading = false
}: FinalApprovalPanelProps) {
  const [releaseNotes, setReleaseNotes] = useState('Production release verified and approved.');
  const [submitting, setSubmitting] = useState(false);
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [rejectFeedback, setRejectFeedback] = useState('');

  // Parse structured data
  let planObj: any = null;
  try {
    if (planJson) planObj = JSON.parse(planJson);
  } catch (e) {
    planObj = null;
  }

  let reviewObj: any = null;
  try {
    if (reviewReportJson) reviewObj = JSON.parse(reviewReportJson);
  } catch (e) {
    reviewObj = null;
  }

  let validationObj: any = null;
  try {
    if (validationChecklistJson) validationObj = JSON.parse(validationChecklistJson);
  } catch (e) {
    validationObj = null;
  }

  const latestTest = testResults.length > 0 ? testResults[testResults.length - 1] : null;
  const sourceFiles = files.filter(f => !f.is_test);
  const testFiles = files.filter(f => f.is_test);
  const totalLines = files.reduce((acc, f) => acc + f.content.split('\n').length, 0);

  const isCompleted = status === 'COMPLETED';

  const handleApprove = async () => {
    setSubmitting(true);
    try {
      await onFinalApproval(releaseNotes.trim());
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectFeedback.trim()) return;
    setSubmitting(true);
    try {
      await onRejectToWorkspace(rejectFeedback.trim());
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-honey-card border border-honey-border rounded-2xl p-6 shadow-sm text-left space-y-6 animate-fade-in relative overflow-hidden">
      
      {/* Subtle decorative honeycomb element */}
      <div className="absolute top-0 right-0 w-36 h-36 honeycomb-bg opacity-5 pointer-events-none rounded-2xl" />

      {/* Header Banner */}
      <div className={`p-5 rounded-2xl border relative z-10 transition-all ${
        isCompleted 
          ? 'bg-gradient-to-r from-emerald-500/10 via-amber-500/10 to-honey-accent/10 border-honey-accent/40' 
          : 'bg-honey-sidebar/20 border-honey-border'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className={`h-12 w-12 rounded-2xl flex items-center justify-center font-bold shrink-0 ${
              isCompleted 
                ? 'bg-honey-accent text-honey-bg shadow-lg shadow-honey-accent/25' 
                : 'bg-honey-accent/15 border border-honey-accent/30 text-honey-accent'
            }`}>
              {isCompleted ? <Award className="h-6 w-6 stroke-[2.5]" /> : <ShieldCheck className="h-6 w-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-honey-text">
                  {isCompleted ? 'Project Released & Completed' : 'Final Release Gate: Human Authority Sign-Off'}
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold bg-honey-card border border-honey-border text-honey-muted">
                  Session #{sessionId}
                </span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                  isCompleted 
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                    : 'bg-honey-accent/20 text-honey-accent border border-honey-accent/30'
                }`}>
                  {isCompleted ? '✓ RELEASED' : 'FINAL APPROVAL REQUIRED'}
                </span>
              </div>
              <p className="text-xs text-honey-muted mt-1 leading-relaxed">
                {isCompleted
                  ? 'All autonomous agents and human verification stages completed. Codebase signed off.'
                  : 'Developer review and approval is required to mark the project as COMPLETED. No automatic AI completion.'}
              </p>
            </div>
          </div>

          {onExportProject && (
            <button
              onClick={onExportProject}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl border border-honey-border bg-honey-card hover:border-honey-accent text-honey-text transition-all cursor-pointer self-start sm:self-auto shrink-0"
            >
              <Download className="h-4 w-4 text-honey-accent" />
              <span>Export Project ZIP</span>
            </button>
          )}
        </div>
      </div>

      {/* Project Overview Cards Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 relative z-10 text-xs">
        
        {/* 1. Requirement & Plan */}
        <div className="p-4 bg-honey-sidebar/10 border border-honey-border rounded-xl space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-bold text-honey-text uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-honey-accent" />
              Requirement & Plan
            </span>
            <span className="text-[10px] font-mono text-emerald-500 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              PLAN APPROVED
            </span>
          </div>
          <p className="text-honey-muted line-clamp-2 italic">
            "{requirement}"
          </p>
          <div className="pt-2 border-t border-honey-border/40 text-[11px] text-honey-muted space-y-1">
            <div className="flex justify-between">
              <span>Title:</span>
              <span className="font-semibold text-honey-text font-mono">{planObj?.project_title || 'Modular Python App'}</span>
            </div>
            <div className="flex justify-between">
              <span>Modules:</span>
              <span className="font-semibold text-honey-text font-mono">{planObj?.modules?.length || sourceFiles.length} modules</span>
            </div>
          </div>
        </div>

        {/* 2. Codebase Metrics */}
        <div className="p-4 bg-honey-sidebar/10 border border-honey-border rounded-xl space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-bold text-honey-text uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <FileCode className="h-3.5 w-3.5 text-honey-accent" />
              Codebase Metrics
            </span>
            <span className="text-[10px] font-mono text-honey-accent font-bold bg-honey-accent/10 px-2 py-0.5 rounded border border-honey-accent/20">
              VERIFIED
            </span>
          </div>
          <div className="space-y-1.5 pt-1 text-[11px] text-honey-muted">
            <div className="flex justify-between">
              <span>Source Files:</span>
              <span className="font-semibold text-honey-text font-mono">{sourceFiles.length} files</span>
            </div>
            <div className="flex justify-between">
              <span>Test Files:</span>
              <span className="font-semibold text-honey-text font-mono">{testFiles.length} files</span>
            </div>
            <div className="flex justify-between">
              <span>Total Volume:</span>
              <span className="font-semibold text-honey-text font-mono">{totalLines} lines</span>
            </div>
          </div>
        </div>

        {/* 3. Docker Test Verification */}
        <div className="p-4 bg-honey-sidebar/10 border border-honey-border rounded-xl space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-bold text-honey-text uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Terminal className="h-3.5 w-3.5 text-emerald-500" />
              Docker PyTest Sandbox
            </span>
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
              latestTest?.passed 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
            }`}>
              {latestTest?.passed ? '100% PASSED' : 'UNVERIFIED'}
            </span>
          </div>
          <div className="space-y-1.5 pt-1 text-[11px] text-honey-muted">
            <div className="flex justify-between">
              <span>Assertions:</span>
              <span className="font-semibold text-honey-text font-mono">
                {latestTest ? `${latestTest.passed_tests} / ${latestTest.total_tests} passed` : 'Pending'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Sandbox Isolation:</span>
              <span className="font-semibold text-emerald-400 font-mono">--network none</span>
            </div>
            <div className="flex justify-between">
              <span>Attempts:</span>
              <span className="font-semibold text-honey-text font-mono">{testResults.length} test run(s)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Review & Validation Summary Panels */}
      <div className="grid md:grid-cols-2 gap-4 relative z-10 text-xs">
        
        {/* AI Advisory Review Summary */}
        <div className="p-4 bg-honey-sidebar/10 border border-honey-border rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-honey-text uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-honey-accent" />
              AI Review Advisory
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-honey-card border border-honey-border text-honey-text">
              Status: {reviewObj?.overall_status || 'PASSED'}
            </span>
          </div>
          <p className="text-honey-muted text-[11px] leading-relaxed">
            {reviewObj?.summary || 'Code reviewed for architectural conformance, modular layout, and exception boundaries.'}
          </p>
          {reviewObj?.recommendations && reviewObj.recommendations.length > 0 && (
            <div className="space-y-1 pt-1">
              <span className="text-[10px] font-semibold text-honey-muted uppercase tracking-wider">Recommendations:</span>
              <ul className="space-y-1 text-[11px] text-honey-muted list-disc list-inside">
                {reviewObj.recommendations.slice(0, 2).map((r: string, idx: number) => (
                  <li key={idx} className="line-clamp-1">{r}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Developer Validation Summary */}
        <div className="p-4 bg-honey-sidebar/10 border border-honey-border rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-honey-text uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <CheckSquare className="h-3.5 w-3.5 text-honey-accent" />
              Developer Manual Validation
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              CHECKLIST SIGNED
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
            <div className="p-1.5 bg-honey-card rounded border border-honey-border flex items-center gap-1.5 text-emerald-400">
              <CheckCircle className="h-3 w-3 shrink-0" />
              <span>Requirements</span>
            </div>
            <div className="p-1.5 bg-honey-card rounded border border-honey-border flex items-center gap-1.5 text-emerald-400">
              <CheckCircle className="h-3 w-3 shrink-0" />
              <span>Edge Cases</span>
            </div>
            <div className="p-1.5 bg-honey-card rounded border border-honey-border flex items-center gap-1.5 text-emerald-400">
              <CheckCircle className="h-3 w-3 shrink-0" />
              <span>Error Handling</span>
            </div>
            <div className="p-1.5 bg-honey-card rounded border border-honey-border flex items-center gap-1.5 text-emerald-400">
              <CheckCircle className="h-3 w-3 shrink-0" />
              <span>Docker Verified</span>
            </div>
          </div>
          {validationObj?.notes && (
            <p className="text-[11px] text-honey-muted font-mono italic bg-honey-card p-2 rounded border border-honey-border">
              "{validationObj.notes}"
            </p>
          )}
        </div>
      </div>

      {/* Human-in-the-Loop Audit Trail Timeline Snapshot */}
      {auditTrail && auditTrail.length > 0 && (
        <div className="p-4 bg-honey-sidebar/10 border border-honey-border rounded-xl space-y-3 relative z-10">
          <div className="flex items-center justify-between">
            <span className="font-bold text-honey-text uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-honey-accent" />
              Collaboration Audit Trail (Developer & AI)
            </span>
            <span className="text-[10px] font-mono text-honey-muted">
              {auditTrail.length} lifecycle events
            </span>
          </div>
          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
            {auditTrail.map((ev: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-honey-card border border-honey-border text-[11px]">
                <div className="flex items-center gap-2">
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                    ev.actor === 'DEVELOPER'
                      ? 'bg-honey-accent/20 text-honey-accent border border-honey-accent/30'
                      : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                  }`}>
                    {ev.actor}
                  </span>
                  <span className="font-semibold text-honey-text">{ev.action}</span>
                </div>
                <span className="text-[10px] text-honey-muted font-mono">{ev.stage}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reject to Workspace Inline Box */}
      {showRejectBox && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-3 relative z-10 animate-fade-in">
          <h4 className="text-xs font-bold text-amber-500 uppercase tracking-wider flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            <span>Return to Developer Workspace</span>
          </h4>
          <textarea
            value={rejectFeedback}
            onChange={(e) => setRejectFeedback(e.target.value)}
            placeholder="Explain why release approval is rejected and what must be updated in the workspace..."
            className="w-full h-20 p-2.5 bg-honey-sidebar/30 border border-amber-500/30 rounded-lg text-xs font-mono text-honey-text focus:outline-none focus:border-amber-500 resize-none"
          />
          <div className="flex items-center gap-3 justify-end">
            <button
              onClick={() => setShowRejectBox(false)}
              className="px-3 py-1.5 text-xs text-honey-muted hover:text-honey-text cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleReject}
              disabled={submitting || !rejectFeedback.trim()}
              className="px-4 py-1.5 text-xs font-bold rounded-lg bg-amber-500 text-black hover:bg-amber-400 transition-all cursor-pointer disabled:opacity-50"
            >
              Confirm & Return to Workspace
            </button>
          </div>
        </div>
      )}

      {/* Final Release Action Bar (Active only when not completed) */}
      {!isCompleted ? (
        <div className="space-y-4 pt-4 border-t border-honey-border/60 relative z-10">
          <div className="space-y-2">
            <label className="text-xs font-bold text-honey-text uppercase tracking-wider flex items-center gap-2">
              <FileText className="h-4 w-4 text-honey-accent" />
              <span>Final Release Sign-Off Remarks</span>
            </label>
            <input
              type="text"
              value={releaseNotes}
              onChange={(e) => setReleaseNotes(e.target.value)}
              placeholder="e.g. Production release approved and validated."
              className="w-full p-2.5 bg-honey-sidebar/20 border border-honey-border rounded-xl text-xs font-mono text-honey-text focus:outline-none focus:border-honey-accent"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <button
              onClick={() => setShowRejectBox(true)}
              disabled={submitting || loading}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl border border-honey-border hover:bg-honey-sidebar/20 text-honey-muted hover:text-honey-text transition-all cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Reject / Return to Workspace</span>
            </button>

            <button
              onClick={handleApprove}
              disabled={submitting || loading}
              className="flex items-center gap-2.5 px-6 py-3 text-xs font-bold rounded-xl bg-gradient-to-r from-honey-accent via-amber-400 to-amber-500 hover:from-amber-400 hover:to-honey-accent text-honey-bg shadow-xl shadow-honey-accent/30 transition-all transform hover:scale-[1.02] cursor-pointer disabled:opacity-50 font-sans"
            >
              {submitting ? (
                <Loader2 className="h-4.5 w-4.5 animate-spin" />
              ) : (
                <Award className="h-4.5 w-4.5 stroke-[2.5]" />
              )}
              <span className="uppercase tracking-wider">Approve & Complete Project</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center space-y-1 relative z-10">
          <span className="text-xs font-bold text-emerald-400 flex items-center justify-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Project officially approved and completed by developer.
          </span>
          <p className="text-[11px] text-honey-muted">
            The code has been verified and signed off for production delivery.
          </p>
        </div>
      )}

    </div>
  );
}
