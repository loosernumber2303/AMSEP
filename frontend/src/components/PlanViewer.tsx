import { FileText, Loader2, Sparkles, Code, CheckSquare } from 'lucide-react';

interface PlanViewerProps {
  planJson: string | null;
  status: string;
}

export default function PlanViewer({ planJson, status }: PlanViewerProps) {
  const parsePlan = (jsonStr: string | null) => {
    if (!jsonStr) return null;
    try {
      return JSON.parse(jsonStr);
    } catch {
      return null;
    }
  };

  const plan = parsePlan(planJson);

  if (!plan) {
    if (['PLANNING'].includes(status)) {
      return (
        <div className="flex flex-col items-center justify-center py-20 bg-green-card border border-green-border rounded-2xl p-6">
          <Loader2 className="h-8 w-8 animate-spin text-green-accent mb-3" />
          <p className="text-sm text-green-text font-medium">Orchestrating structured development plan...</p>
          <p className="text-xs text-green-muted mt-1">Analyzing requirement specs and scoping system modules.</p>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-green-card border border-green-border rounded-2xl p-6">
        <FileText className="h-8 w-8 text-green-muted/40 mb-3" />
        <p className="text-sm text-green-muted font-medium">No plan generated yet</p>
        <p className="text-xs text-green-muted/60 mt-1">Enter a requirement above and start to review the plan.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left animate-fade-in">
      {/* Description */}
      <div className="bg-green-card border border-green-border rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4.5 w-4.5 text-green-accent" />
          <h3 className="text-sm font-semibold text-green-text uppercase tracking-wider">Project Specification</h3>
        </div>
        <p className="text-sm text-green-muted leading-relaxed">{plan.project_description}</p>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        {/* Functional Requirements */}
        <div className="bg-green-card border border-green-border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <CheckSquare className="h-4.5 w-4.5 text-green-accent" />
            <h3 className="text-sm font-semibold text-green-text uppercase tracking-wider">Functional Features</h3>
          </div>
          <ul className="space-y-2.5">
            {plan.functional_requirements.map((req: string, i: number) => (
              <li key={i} className="text-xs text-green-muted flex items-start gap-2">
                <span className="text-green-accent font-bold mt-0.5">•</span>
                <span className="leading-relaxed">{req}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Scaffold Target Files */}
        <div className="bg-green-card border border-green-border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Code className="h-4.5 w-4.5 text-green-accent" />
            <h3 className="text-sm font-semibold text-green-text uppercase tracking-wider">Target System Scaffold</h3>
          </div>
          <ul className="space-y-3">
            {plan.files_to_create.map((f: any, i: number) => (
              <li key={i} className="text-xs text-green-muted flex flex-col gap-0.5 border-b border-green-border/40 pb-2.5 last:border-b-0 last:pb-0">
                <span className="font-mono text-green-text font-semibold break-all">{f.path}</span>
                <span className="text-[11px] text-green-muted/80">{f.description}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Implementation Sequence */}
      <div className="bg-green-card border border-green-border rounded-2xl p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-green-text uppercase tracking-wider mb-4">Implementation Steps</h3>
        <div className="space-y-3">
          {plan.implementation_steps.map((step: string, i: number) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-5 w-5 rounded-full bg-green-accent/10 border border-green-accent/30 text-[10px] text-green-accent flex items-center justify-center font-bold font-mono">
                {i + 1}
              </div>
              <span className="text-xs text-green-muted">{step}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
