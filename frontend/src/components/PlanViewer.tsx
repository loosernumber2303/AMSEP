import { FileText, Loader2, Sparkles, Code, CheckSquare, Settings, ArrowRightLeft, Cpu, ShieldAlert } from 'lucide-react';

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
        <div className="flex flex-col items-center justify-center py-20 bg-honey-card border border-honey-border rounded-2xl p-6">
          <Loader2 className="h-8 w-8 animate-spin text-honey-accent mb-3" />
          <p className="text-sm text-honey-text font-semibold">Orchestrating structured development plan...</p>
          <p className="text-xs text-honey-muted mt-1">Analyzing requirement specs and scoping system modules.</p>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-honey-card border border-honey-border rounded-2xl p-6">
        <FileText className="h-8 w-8 text-honey-muted/40 mb-3" />
        <p className="text-sm text-honey-muted font-medium">No plan generated yet</p>
        <p className="text-xs text-honey-muted/60 mt-1">Enter a requirement above and start to review the plan.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left animate-fade-in relative">
      {/* Decorative honeycomb pattern overlay in corners */}
      <div className="absolute -top-4 -right-4 w-24 h-24 honeycomb-bg opacity-5 pointer-events-none rounded-2xl" />

      {/* Project Header Spec */}
      <div className="bg-honey-card border border-honey-border rounded-2xl p-5 shadow-sm relative z-10">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4.5 w-4.5 text-honey-accent" />
          <h3 className="text-sm font-bold text-honey-text uppercase tracking-wider">
            {plan.project_title || "Project Specification"}
          </h3>
        </div>
        <p className="text-sm text-honey-muted leading-relaxed">
          {plan.description || plan.project_description}
        </p>
      </div>

      {/* Technologies Used */}
      {plan.technologies && plan.technologies.length > 0 && (
        <div className="bg-honey-card border border-honey-border rounded-2xl p-5 shadow-sm relative z-10">
          <h4 className="text-xs font-semibold text-honey-muted uppercase tracking-wider mb-3">Technologies & Libraries</h4>
          <div className="flex flex-wrap gap-2">
            {plan.technologies.map((tech: string, i: number) => (
              <span key={i} className="text-xs font-mono px-2.5 py-1 bg-honey-sidebar/20 text-honey-accent rounded-lg border border-honey-border/50">
                {tech}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-5 relative z-10">
        {/* Functional Requirements */}
        <div className="bg-honey-card border border-honey-border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <CheckSquare className="h-4.5 w-4.5 text-honey-accent" />
            <h3 className="text-sm font-bold text-honey-text uppercase tracking-wider">Functional Features</h3>
          </div>
          <ul className="space-y-2.5">
            {(plan.functional_requirements || []).map((req: string, i: number) => (
              <li key={i} className="text-xs text-honey-muted flex items-start gap-2">
                <span className="text-honey-accent font-bold mt-0.5">•</span>
                <span className="leading-relaxed">{req}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Non-Functional Requirements */}
        <div className="bg-honey-card border border-honey-border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Settings className="h-4.5 w-4.5 text-honey-accent" />
            <h3 className="text-sm font-bold text-honey-text uppercase tracking-wider">System Constraints</h3>
          </div>
          <ul className="space-y-2.5">
            {(plan.non_functional_requirements || ["Performance constraints, platform limits, and execution standards."]).map((req: string, i: number) => (
              <li key={i} className="text-xs text-honey-muted flex items-start gap-2">
                <span className="text-honey-accent font-bold mt-0.5">•</span>
                <span className="leading-relaxed">{req}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-5 relative z-10">
        {/* Inputs */}
        <div className="bg-honey-card border border-honey-border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <ArrowRightLeft className="h-4.5 w-4.5 text-honey-accent" />
            <h3 className="text-sm font-bold text-honey-text uppercase tracking-wider">Expected Inputs</h3>
          </div>
          <ul className="space-y-2.5">
            {(plan.inputs || []).map((input: string, i: number) => (
              <li key={i} className="text-xs text-honey-muted flex items-start gap-2">
                <span className="text-honey-accent font-bold mt-0.5">•</span>
                <span className="leading-relaxed">{input}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Outputs */}
        <div className="bg-honey-card border border-honey-border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <ArrowRightLeft className="h-4.5 w-4.5 text-honey-accent" />
            <h3 className="text-sm font-bold text-honey-text uppercase tracking-wider">Expected Outputs</h3>
          </div>
          <ul className="space-y-2.5">
            {(plan.outputs || []).map((output: string, i: number) => (
              <li key={i} className="text-xs text-honey-muted flex items-start gap-2">
                <span className="text-honey-accent font-bold mt-0.5">•</span>
                <span className="leading-relaxed">{output}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-5 relative z-10">
        {/* Modules */}
        <div className="bg-honey-card border border-honey-border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Cpu className="h-4.5 w-4.5 text-honey-accent" />
            <h3 className="text-sm font-bold text-honey-text uppercase tracking-wider">Architecture Modules</h3>
          </div>
          <ul className="space-y-3">
            {(plan.modules || []).map((m: any, i: number) => (
              <li key={i} className="text-xs text-honey-muted flex flex-col gap-0.5 border-b border-honey-border/40 pb-2.5 last:border-b-0 last:pb-0">
                <span className="font-semibold text-honey-text">{m.name}</span>
                <span className="text-[11px] text-honey-muted/80">{m.description}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* File Structure */}
        <div className="bg-honey-card border border-honey-border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Code className="h-4.5 w-4.5 text-honey-accent" />
            <h3 className="text-sm font-bold text-honey-text uppercase tracking-wider">Target File Structure</h3>
          </div>
          <ul className="space-y-3">
            {(plan.file_structure || plan.files_to_create || []).map((f: any, i: number) => (
              <li key={i} className="text-xs text-honey-muted flex flex-col gap-0.5 border-b border-honey-border/40 pb-2.5 last:border-b-0 last:pb-0">
                <span className="font-mono text-honey-text font-semibold break-all">{f.path}</span>
                <span className="text-[11px] text-honey-muted/80">{f.description}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Implementation Sequence */}
      <div className="bg-honey-card border border-honey-border rounded-2xl p-5 shadow-sm relative z-10">
        <h3 className="text-sm font-bold text-honey-text uppercase tracking-wider mb-4">Implementation Steps</h3>
        <div className="space-y-3">
          {(plan.implementation_steps || []).map((step: string, i: number) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-5 w-5 rounded-full bg-honey-accent/10 border border-honey-accent/30 text-[10px] text-honey-accent flex items-center justify-center font-bold font-mono shrink-0">
                {i + 1}
              </div>
              <span className="text-xs text-honey-muted">{step}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-5 relative z-10">
        {/* Edge Cases */}
        <div className="bg-honey-card border border-honey-border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert className="h-4.5 w-4.5 text-honey-accent" />
            <h3 className="text-sm font-bold text-honey-text uppercase tracking-wider">Edge Cases Considered</h3>
          </div>
          <ul className="space-y-2.5">
            {(plan.edge_cases || []).map((edge: string, i: number) => (
              <li key={i} className="text-xs text-honey-muted flex items-start gap-2">
                <span className="text-honey-accent font-bold mt-0.5">•</span>
                <span className="leading-relaxed">{edge}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Testing Requirements */}
        <div className="bg-honey-card border border-honey-border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="h-4.5 w-4.5 text-honey-accent" />
            <h3 className="text-sm font-bold text-honey-text uppercase tracking-wider">Testing Assertions Scope</h3>
          </div>
          <ul className="space-y-2.5">
            {(plan.testing_requirements || []).map((test: string, i: number) => (
              <li key={i} className="text-xs text-honey-muted flex items-start gap-2">
                <span className="text-honey-accent font-bold mt-0.5">•</span>
                <span className="leading-relaxed">{test}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
