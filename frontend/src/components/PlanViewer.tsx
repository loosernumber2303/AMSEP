import { FileText, Loader2, Sparkles, Code, CheckSquare, Settings, ArrowRightLeft, Cpu, ShieldAlert, Edit3, Check, X } from 'lucide-react';
import { useState, useEffect } from 'react';

interface PlanViewerProps {
  planJson: string | null;
  status: string;
  onApprovePlan?: () => void;
  onUpdatePlan?: (updatedJson: string) => Promise<void>;
  loading?: boolean;
}

export default function PlanViewer({ planJson, status, onApprovePlan, onUpdatePlan, loading }: PlanViewerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editRequirements, setEditRequirements] = useState('');
  const [editSteps, setEditSteps] = useState('');
  const [saving, setSaving] = useState(false);

  const parsePlan = (jsonStr: string | null) => {
    if (!jsonStr) return null;
    try {
      return JSON.parse(jsonStr);
    } catch {
      return null;
    }
  };

  const plan = parsePlan(planJson);

  useEffect(() => {
    if (plan) {
      setEditTitle(plan.project_title || '');
      setEditDescription(plan.description || plan.project_description || '');
      setEditRequirements((plan.functional_requirements || []).join('\n'));
      setEditSteps((plan.implementation_steps || []).join('\n'));
    }
  }, [planJson]);

  const handleStartEdit = () => {
    if (!plan) return;
    setEditTitle(plan.project_title || '');
    setEditDescription(plan.description || plan.project_description || '');
    setEditRequirements((plan.functional_requirements || []).join('\n'));
    setEditSteps((plan.implementation_steps || []).join('\n'));
    setIsEditing(true);
  };

  const handleSavePlan = async () => {
    if (!plan || !onUpdatePlan) return;
    setSaving(true);
    try {
      const updated = {
        ...plan,
        project_title: editTitle,
        description: editDescription,
        functional_requirements: editRequirements.split('\n').map(r => r.trim()).filter(Boolean),
        implementation_steps: editSteps.split('\n').map(s => s.trim()).filter(Boolean)
      };
      await onUpdatePlan(JSON.stringify(updated, null, 2));
      setIsEditing(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

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

  const isAwaitingReview = status === 'PLAN_REVIEW' || status === 'PLAN_READY';

  return (
    <div className="space-y-6 text-left animate-fade-in relative">
      {/* Decorative honeycomb pattern overlay in corners */}
      <div className="absolute -top-4 -right-4 w-24 h-24 honeycomb-bg opacity-5 pointer-events-none rounded-2xl" />

      {/* DEVELOPER PLAN REVIEW ACTION BAR */}
      {isAwaitingReview && (
        <div className="bg-honey-card border-2 border-honey-accent/40 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md relative z-20">
          <div className="space-y-1 text-left w-full sm:w-auto">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-honey-accent animate-ping" />
              <h4 className="text-xs font-bold text-honey-text uppercase tracking-wide">Developer Plan Review</h4>
            </div>
            <p className="text-[11px] text-honey-muted leading-relaxed">
              Inspect the AI-generated architecture and implementation steps below. Edit or approve to proceed to code generation.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  disabled={saving}
                  className="px-3.5 py-1.5 border border-honey-border hover:bg-honey-sidebar/40 rounded-xl text-xs font-semibold text-honey-muted hover:text-honey-text transition-all cursor-pointer flex items-center gap-1"
                >
                  <X className="h-3.5 w-3.5" />
                  <span>Cancel</span>
                </button>
                <button
                  type="button"
                  onClick={handleSavePlan}
                  disabled={saving}
                  className="px-4 py-1.5 bg-honey-accent text-honey-bg rounded-xl text-xs font-bold hover:bg-honey-accent-hover transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  <span>Save Plan</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleStartEdit}
                  disabled={loading}
                  className="px-3.5 py-1.5 border border-honey-border hover:border-honey-accent/60 bg-honey-sidebar/20 rounded-xl text-xs font-semibold text-honey-text hover:text-honey-accent transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  <span>Edit Plan</span>
                </button>
                <button
                  type="button"
                  onClick={onApprovePlan}
                  disabled={loading}
                  className="px-4.5 py-1.5 bg-honey-accent text-honey-bg rounded-xl text-xs font-bold hover:bg-honey-accent-hover transition-all shadow-md shadow-honey-accent/15 cursor-pointer flex items-center gap-1.5"
                >
                  {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5 stroke-[2.5]" />}
                  <span>Approve Plan</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* PLAN APPROVED STATUS BADGE */}
      {!isAwaitingReview && (
        <div className="flex items-center justify-between bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-3 px-4 text-xs font-semibold text-emerald-500">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 stroke-[2.5]" />
            <span>Implementation Plan Approved by Developer</span>
          </div>
          <span className="text-[10px] font-mono opacity-80 uppercase">Locked</span>
        </div>
      )}

      {/* EDITING FORM */}
      {isEditing ? (
        <div className="bg-honey-card border border-honey-border rounded-2xl p-5 shadow-sm space-y-4 relative z-10 text-left">
          <div>
            <label className="text-xs font-semibold text-honey-muted uppercase tracking-wider block mb-1.5">Project Title</label>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full bg-honey-sidebar/15 border border-honey-border rounded-xl p-2.5 text-xs text-honey-text focus:border-honey-accent focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-honey-muted uppercase tracking-wider block mb-1.5">Description & Scope</label>
            <textarea
              rows={3}
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              className="w-full bg-honey-sidebar/15 border border-honey-border rounded-xl p-2.5 text-xs text-honey-text focus:border-honey-accent focus:outline-none resize-none"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-honey-muted uppercase tracking-wider block mb-1.5">
                Functional Requirements (one per line)
              </label>
              <textarea
                rows={5}
                value={editRequirements}
                onChange={(e) => setEditRequirements(e.target.value)}
                className="w-full bg-honey-sidebar/15 border border-honey-border rounded-xl p-2.5 text-xs text-honey-text focus:border-honey-accent focus:outline-none resize-none font-mono text-[11px]"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-honey-muted uppercase tracking-wider block mb-1.5">
                Implementation Steps (one per line)
              </label>
              <textarea
                rows={5}
                value={editSteps}
                onChange={(e) => setEditSteps(e.target.value)}
                className="w-full bg-honey-sidebar/15 border border-honey-border rounded-xl p-2.5 text-xs text-honey-text focus:border-honey-accent focus:outline-none resize-none font-mono text-[11px]"
              />
            </div>
          </div>
        </div>
      ) : (
        /* READ-ONLY DISPLAY */
        <>
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
        </>
      )}
    </div>
  );
}
