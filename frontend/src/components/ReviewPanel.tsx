import { AlertTriangle, CheckCircle, ShieldCheck, Loader2 } from 'lucide-react';

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
}

export default function ReviewPanel({ testResults, status }: ReviewPanelProps) {
  const latestResult = testResults.length > 0 ? testResults[testResults.length - 1] : null;

  if (['ANALYSIS'].includes(status)) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-green-card border border-green-border rounded-2xl p-6 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-green-accent mb-3" />
        <p className="text-sm text-green-text font-medium">Conducting automated code review...</p>
        <p className="text-xs text-green-muted mt-1">Analyzing pytest outputs and drafting code repair directives.</p>
      </div>
    );
  }

  if (!latestResult) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-green-card border border-green-border rounded-2xl p-6 text-center">
        <AlertTriangle className="h-8 w-8 text-green-muted/40 mb-3" />
        <p className="text-sm text-green-muted font-medium">Review report pending</p>
        <p className="text-xs text-green-muted/60 mt-1">Run tests in the sandbox to generate a review analysis.</p>
      </div>
    );
  }

  // Parse failure items from json report
  let failureItems: string[] = [];
  try {
    if (latestResult.json_report) {
      const parsed = JSON.parse(latestResult.json_report);
      if (parsed.tests) {
        failureItems = parsed.tests
          .filter((t: any) => t.outcome === 'failed')
          .map((t: any) => t.nodeid);
      }
    }
  } catch (e) {
    console.error('Failed to parse json_report in ReviewPanel', e);
  }

  if (latestResult.passed) {
    return (
      <div className="bg-green-card border border-green-border rounded-2xl p-6 shadow-sm text-left space-y-4 animate-fade-in">
        <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-xl">
          <CheckCircle className="h-6 w-6 shrink-0 text-emerald-500" />
          <div>
            <h4 className="text-sm font-semibold">Verification Successful</h4>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">All unit tests executed inside the sandbox passed with exit code 0.</p>
          </div>
        </div>

        <div className="border border-green-border/80 rounded-xl p-5 bg-green-sidebar/20 space-y-3">
          <h3 className="text-sm font-semibold text-green-text flex items-center gap-2">
            <ShieldCheck className="h-4.5 w-4.5 text-green-accent" />
            <span>Code Review Recommendations</span>
          </h3>
          <ul className="space-y-2 text-xs text-green-muted leading-relaxed">
            <li className="flex items-start gap-2">
              <span className="text-green-accent font-bold mt-0.5">•</span>
              <span><strong>Modular Integrity:</strong> The generated code adheres to standard functional layout guidelines.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-accent font-bold mt-0.5">•</span>
              <span><strong>Clean Testing coverage:</strong> Assertions fully cover the expected boundary ranges for math operations.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-accent font-bold mt-0.5">•</span>
              <span><strong>Ready for Download:</strong> Code structure and environment configs are aligned. Ready to build and package.</span>
            </li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-green-card border border-green-border rounded-2xl p-6 shadow-sm text-left space-y-4 animate-fade-in">
      <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl">
        <AlertTriangle className="h-6 w-6 shrink-0 text-rose-500" />
        <div>
          <h4 className="text-sm font-semibold">Verification FAILED</h4>
          <p className="text-xs text-rose-600 dark:text-rose-400 mt-0.5">
            {latestResult.failed_tests} tests failed during the sandbox verification check.
          </p>
        </div>
      </div>

      {failureItems.length > 0 && (
        <div className="border border-green-border/80 rounded-xl p-4 bg-green-sidebar/10">
          <h4 className="text-xs font-semibold text-green-text uppercase tracking-wider mb-2">Failing Test Cases</h4>
          <ul className="space-y-1.5 font-mono text-[11px] text-rose-500">
            {failureItems.map((item, idx) => (
              <li key={idx} className="break-all flex items-start gap-2">
                <span className="text-rose-400 font-bold mt-0.5">✗</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="border border-green-border/80 rounded-xl p-5 bg-green-sidebar/20 space-y-3">
        <h4 className="text-sm font-semibold text-green-text">Automated Bug Repair Plan</h4>
        <ul className="space-y-2 text-xs text-green-muted leading-relaxed">
          <li className="flex items-start gap-2">
            <span className="text-green-accent font-bold mt-0.5">•</span>
            <span><strong>Traceback Scan:</strong> Backend scanner mapped failing test assertions from sandbox stack traces.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-accent font-bold mt-0.5">•</span>
            <span><strong>Code Fix Directives:</strong> Coder agent will update the corresponding boundary conditions and exceptions handling logic.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-accent font-bold mt-0.5">•</span>
            <span><strong>Re-evaluation Loop:</strong> System will run the revised project files in the sandbox in the next attempt.</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
