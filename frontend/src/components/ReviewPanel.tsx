import { useState } from 'react';
import { 
  AlertTriangle, 
  CheckCircle, 
  ShieldCheck, 
  Loader2, 
  RotateCcw, 
  ArrowRight, 
  ArrowLeft, 
  FileCode, 
  CheckSquare, 
  Info
} from 'lucide-react';

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

interface ReviewPanelProps {
  testResults: TestResult[];
  status: string;
  reviewReportJson?: string | null;
  onApproveReview?: () => Promise<void>;
  onRequestChanges?: (feedback: string, stage: string) => Promise<void>;
  onReturnToWorkspace?: () => Promise<void>;
  loading?: boolean;
}

export default function ReviewPanel({ 
  testResults, 
  status, 
  reviewReportJson,
  onApproveReview,
  onRequestChanges,
  onReturnToWorkspace,
  loading = false 
}: ReviewPanelProps) {
  const [showChangeBox, setShowChangeBox] = useState(false);
  const [changeNotes, setChangeNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Parse structured review report
  let reviewData: any = null;
  try {
    if (reviewReportJson) {
      reviewData = JSON.parse(reviewReportJson);
    }
  } catch (e) {
    reviewData = null;
  }

  const latestResult = testResults.length > 0 ? testResults[testResults.length - 1] : null;

  if (['ANALYSIS', 'IN_REVIEW', 'REVIEWING'].includes(status)) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-honey-card border border-honey-border rounded-2xl p-6 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-honey-accent mb-3" />
        <p className="text-sm text-honey-text font-semibold">Conducting automated code review...</p>
        <p className="text-xs text-honey-muted mt-1">Evaluating codebase structure, execution traces, and architectural metrics.</p>
      </div>
    );
  }

  const handleApprove = async () => {
    if (!onApproveReview) return;
    setSubmitting(true);
    try {
      await onApproveReview();
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendChanges = async () => {
    if (!onRequestChanges || !changeNotes.trim()) return;
    setSubmitting(true);
    try {
      await onRequestChanges(changeNotes.trim(), 'REVIEW');
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  // Derive report fields (from structured json or fallback)
  const overallStatus = reviewData?.overall_status || (latestResult?.passed ? 'PASSED' : latestResult ? 'NEEDS_IMPROVEMENT' : 'PASSED_WITH_WARNINGS');
  const summaryText = reviewData?.summary || (latestResult?.passed 
    ? 'All test assertions executed and passed inside the isolated Docker sandbox. The implementation adheres to functional requirements.'
    : 'Review completed. Please inspect test results and address outstanding issues.');
  const issuesList: string[] = reviewData?.issues || [];
  const warningsList: string[] = reviewData?.warnings || [];
  const filesList: string[] = reviewData?.files_reviewed || [];
  const recommendationsList: string[] = reviewData?.recommendations || [
    'Ensure edge cases and boundary inputs are validated.',
    'Confirm Docker sandbox execution passes prior to final sign-off.'
  ];
  const testSummary = reviewData?.test_summary || {
    passed: latestResult?.passed_tests || 0,
    failed: latestResult?.failed_tests || 0,
    total: latestResult?.total_tests || 0
  };

  return (
    <div className="bg-honey-card border border-honey-border rounded-2xl p-6 shadow-sm text-left space-y-5 animate-fade-in relative overflow-hidden">
      {/* Subtle decorative honeycomb element */}
      <div className="absolute top-0 right-0 w-32 h-32 honeycomb-bg opacity-5 pointer-events-none rounded-2xl" />

      {/* Prominent Advisory Notice */}
      <div className="p-4 bg-amber-500/10 border border-amber-500/30 text-amber-500 rounded-xl relative z-10 flex items-start gap-3">
        <Info className="h-5 w-5 shrink-0 mt-0.5 text-amber-500" />
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider">
            Advisory Review Notice
          </h4>
          <p className="text-xs text-amber-600 dark:text-amber-400/90 mt-0.5 leading-relaxed">
            This AI assessment is for guidance only. Developer approval is required to proceed to validation and release sign-off.
          </p>
        </div>
      </div>

      {/* Review Header Banner with Overall Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-honey-sidebar/15 border border-honey-border rounded-xl relative z-10">
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold shrink-0 ${
            overallStatus === 'PASSED'
              ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-500'
              : overallStatus === 'NEEDS_IMPROVEMENT'
              ? 'bg-rose-500/15 border border-rose-500/30 text-rose-500'
              : 'bg-amber-500/15 border border-amber-500/30 text-amber-500'
          }`}>
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-honey-text flex items-center gap-2">
              <span>AI Code Review Report</span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border uppercase tracking-wider ${
                overallStatus === 'PASSED'
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  : overallStatus === 'NEEDS_IMPROVEMENT'
                  ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                  : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
              }`}>
                {overallStatus.replace(/_/g, ' ')}
              </span>
            </h3>
            <p className="text-xs text-honey-muted mt-0.5">
              Automated multi-agent inspection of source code, test coverage, and modular metrics.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="px-2.5 py-1 rounded-lg bg-honey-card border border-honey-border text-honey-text">
            Assertions: <strong className="text-emerald-500">{testSummary.passed}</strong> / {testSummary.total}
          </span>
        </div>
      </div>

      {/* Summary Box */}
      <div className="p-4 bg-honey-sidebar/10 border border-honey-border/80 rounded-xl space-y-2 relative z-10">
        <span className="text-[11px] font-bold text-honey-text uppercase tracking-wider block">
          Executive Summary
        </span>
        <p className="text-xs text-honey-muted leading-relaxed">
          {summaryText}
        </p>
      </div>

      {/* Two Column Grid: Issues/Warnings & Files/Recommendations */}
      <div className="grid md:grid-cols-2 gap-4 relative z-10 text-xs">
        
        {/* Issues & Warnings */}
        <div className="space-y-3">
          {issuesList.length > 0 ? (
            <div className="p-3.5 bg-rose-500/5 border border-rose-500/20 rounded-xl space-y-2">
              <span className="font-bold text-rose-500 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" />
                Issues Identified ({issuesList.length})
              </span>
              <ul className="space-y-1.5 text-honey-muted pl-4 list-disc">
                {issuesList.map((iss, i) => (
                  <li key={i} className="text-rose-400">{iss}</li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="p-3.5 bg-emerald-500/5 border border-emerald-500/20 rounded-xl flex items-center gap-2 text-emerald-500">
              <CheckCircle className="h-4 w-4 shrink-0" />
              <span className="text-[11px] font-semibold">Zero critical bugs or unhandled crashes detected.</span>
            </div>
          )}

          {warningsList.length > 0 && (
            <div className="p-3.5 bg-amber-500/5 border border-amber-500/20 rounded-xl space-y-2">
              <span className="font-bold text-amber-500 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5" />
                Code Quality Observations ({warningsList.length})
              </span>
              <ul className="space-y-1.5 text-honey-muted pl-4 list-disc">
                {warningsList.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Recommendations & Files */}
        <div className="space-y-3">
          <div className="p-3.5 bg-honey-sidebar/10 border border-honey-border rounded-xl space-y-2">
            <span className="font-bold text-honey-text uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-honey-accent" />
              Reviewer Recommendations
            </span>
            <ul className="space-y-1.5 text-honey-muted pl-4 list-disc">
              {recommendationsList.map((rec, i) => (
                <li key={i}>{rec}</li>
              ))}
            </ul>
          </div>

          {filesList.length > 0 && (
            <div className="p-3.5 bg-honey-sidebar/10 border border-honey-border rounded-xl space-y-1.5">
              <span className="font-bold text-honey-text uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <FileCode className="h-3.5 w-3.5 text-honey-accent" />
                Files Reviewed ({filesList.length})
              </span>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {filesList.map((fp, i) => (
                  <span key={i} className="px-2 py-0.5 rounded font-mono text-[10px] bg-honey-card border border-honey-border text-honey-text">
                    {fp}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Request Changes Inline Input Box */}
      {showChangeBox && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-3 relative z-10 animate-fade-in">
          <h4 className="text-xs font-bold text-amber-500 uppercase tracking-wider flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            <span>Developer Change Request Notes</span>
          </h4>
          <textarea
            value={changeNotes}
            onChange={(e) => setChangeNotes(e.target.value)}
            placeholder="Describe the modifications or fixes you require before review can be approved..."
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
              onClick={handleSendChanges}
              disabled={submitting || !changeNotes.trim()}
              className="px-4 py-1.5 text-xs font-bold rounded-lg bg-amber-500 text-black hover:bg-amber-400 transition-all cursor-pointer disabled:opacity-50"
            >
              Submit Change Request & Return to Workspace
            </button>
          </div>
        </div>
      )}

      {/* Developer Review Action Bar (Human Authority) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-honey-border/60 relative z-10">
        <div className="flex items-center gap-2">
          {onReturnToWorkspace && (
            <button
              onClick={onReturnToWorkspace}
              disabled={submitting || loading}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl border border-honey-border hover:bg-honey-sidebar/20 text-honey-muted hover:text-honey-text transition-all cursor-pointer disabled:opacity-50"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Return to Workspace</span>
            </button>
          )}

          {!showChangeBox && onRequestChanges && (
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

        {onApproveReview && (
          <button
            onClick={handleApprove}
            disabled={submitting || loading}
            className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl bg-gradient-to-r from-honey-accent to-amber-500 hover:from-amber-500 hover:to-honey-accent text-honey-bg shadow-lg shadow-honey-accent/25 transition-all cursor-pointer disabled:opacity-50 font-sans"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckSquare className="h-4 w-4" />
            )}
            <span>Approve Review & Proceed to Validation</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>

    </div>
  );
}
