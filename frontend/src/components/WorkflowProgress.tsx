import { Check, Loader2, AlertTriangle, UserCheck } from 'lucide-react';
import BeeMascot from './BeeMascot';

export type WorkflowStage = 'PLAN' | 'CODE' | 'TEST' | 'REVIEW' | 'VALIDATION' | 'APPROVAL';
export type StageState = 'pending' | 'active' | 'completed' | 'failed';

interface WorkflowProgressProps {
  status: string;
  filesCount: number;
  testResultsCount: number;
  currentAttempt?: number;
  maxAttempts?: number;
  correctionHistoryCount?: number;
}

const STAGES: { key: WorkflowStage; label: string; isHuman?: boolean }[] = [
  { key: 'PLAN', label: 'Plan' },
  { key: 'CODE', label: 'Workspace', isHuman: true },
  { key: 'TEST', label: 'Test' },
  { key: 'REVIEW', label: 'AI Review' },
  { key: 'VALIDATION', label: 'Validation', isHuman: true },
  { key: 'APPROVAL', label: 'Release', isHuman: true }
];

export function workflowStateToStage(status: string, filesCount: number, testResultsCount: number): { stage: WorkflowStage; state: StageState } {
  if (status === 'FAILED' || status.endsWith('_FAILED')) {
    if (status === 'PLANNING_FAILED') {
      return { stage: 'PLAN', state: 'failed' };
    } else if (status === 'CODING_FAILED') {
      return { stage: 'CODE', state: 'failed' };
    } else if (status === 'TESTING_FAILED' || status === 'CORRECTION_LIMIT_REACHED') {
      return { stage: 'TEST', state: 'failed' };
    } else if (status === 'REVIEW_FAILED') {
      return { stage: 'REVIEW', state: 'failed' };
    }

    if (filesCount === 0) {
      return { stage: 'PLAN', state: 'failed' };
    } else if (filesCount > 0 && testResultsCount === 0) {
      return { stage: 'CODE', state: 'failed' };
    } else {
      return { stage: 'TEST', state: 'failed' };
    }
  }

  switch (status) {
    case 'RECEIVED':
    case 'PLANNING':
    case 'PLAN_READY':
    case 'PLAN_REVIEW':
      return { stage: 'PLAN', state: 'active' };
    case 'PLAN_APPROVED':
    case 'CODING':
      return { stage: 'CODE', state: 'active' };
    case 'CODE_READY':
    case 'DEVELOPER_WORKSPACE':
      return { stage: 'CODE', state: 'active' };
    case 'TEST_GENERATION':
    case 'TESTING':
    case 'DIAGNOSING':
    case 'RETESTING':
      return { stage: 'TEST', state: 'active' };
    case 'CORRECTING':
      return { stage: 'CODE', state: 'active' };
    case 'TEST_RESULTS_READY':
      return { stage: 'TEST', state: 'completed' };
    case 'ANALYSIS':
    case 'REVIEWING':
      return { stage: 'REVIEW', state: 'active' };
    case 'REVIEW_READY':
      return { stage: 'REVIEW', state: 'completed' };
    case 'MANUAL_VALIDATION':
      return { stage: 'VALIDATION', state: 'active' };
    case 'FINAL_APPROVAL':
      return { stage: 'APPROVAL', state: 'active' };
    case 'COMPLETED':
      return { stage: 'APPROVAL', state: 'completed' };
    default:
      return { stage: 'PLAN', state: 'pending' };
  }
}

// Custom Honey Jar SVG Component for final completion reward
function HoneyJar({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect x="11" y="6" width="10" height="4" rx="1.5" fill="#D99000" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 10C12 11.5 13 12 14 12C15 12 15 11 16 11C17 11 17 12 18 12C19 12 20 11 20 10" fill="#FBBF24" />
      <path
        d="M9 12.5C9 11 11 10.5 16 10.5C21 10.5 23 11 23 12.5V23.5C23 26 20.5 27.5 16 27.5C11.5 27.5 9 26 9 23.5V12.5Z"
        fill="currentColor"
        fillOpacity="0.15"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path
        d="M10.5 16C10.5 16 12 17 16 17C20 17 21.5 16 21.5 16V23C21.5 24.5 20 26 16 26C12 26 10.5 24.5 10.5 23V16Z"
        fill="#FBBF24"
        fillOpacity="0.85"
      />
      <rect x="12.5" y="18" width="7" height="4" rx="1" fill="#FFFDF5" stroke="currentColor" strokeWidth="1.2" />
      <line x1="14.5" y1="20" x2="17.5" y2="20" stroke="#171717" strokeWidth="1.2" />
    </svg>
  );
}

export default function WorkflowProgress({ 
  status, 
  filesCount, 
  testResultsCount,
  currentAttempt,
  maxAttempts,
  correctionHistoryCount
}: WorkflowProgressProps) {
  
  const getStageStates = (): { states: StageState[]; activeIndex: number } => {
    const states: StageState[] = ['pending', 'pending', 'pending', 'pending', 'pending', 'pending'];
    const current = workflowStateToStage(status, filesCount, testResultsCount);
    
    const stageKeys: WorkflowStage[] = ['PLAN', 'CODE', 'TEST', 'REVIEW', 'VALIDATION', 'APPROVAL'];
    const currentIdx = stageKeys.indexOf(current.stage);
    
    for (let i = 0; i < 6; i++) {
      if (i < currentIdx) {
        states[i] = 'completed';
      } else if (i === currentIdx) {
        states[i] = current.state;
      } else {
        states[i] = 'pending';
      }
    }
    
    let activePosition = currentIdx;
    if (current.state === 'completed' && currentIdx < 5) {
      activePosition = currentIdx + 0.5;
    }
    
    return { states, activeIndex: activePosition };
  };

  const { states, activeIndex } = getStageStates();
  const positionPercentage = (activeIndex / 5) * 100;
  
  const isMoving = !['COMPLETED', 'FAILED', 'RECEIVED', 'CORRECTION_LIMIT_REACHED', 'PLAN_REVIEW', 'DEVELOPER_WORKSPACE', 'REVIEW_READY', 'MANUAL_VALIDATION', 'FINAL_APPROVAL'].includes(status) && status.trim() !== '';
  const isCompleted = status === 'COMPLETED';
  const isRepairing = ['DIAGNOSING', 'CORRECTING', 'RETESTING'].includes(status);

  // Human Checkpoint Badges
  const isHumanCheckpoint = ['PLAN_REVIEW', 'DEVELOPER_WORKSPACE', 'REVIEW_READY', 'MANUAL_VALIDATION', 'FINAL_APPROVAL'].includes(status);
  const getHumanCheckpointLabel = () => {
    switch (status) {
      case 'PLAN_REVIEW': return 'Developer Plan Review';
      case 'DEVELOPER_WORKSPACE': return 'Developer Workspace Active';
      case 'REVIEW_READY': return 'AI Review Ready (Awaiting Approval)';
      case 'MANUAL_VALIDATION': return 'Manual Validation Active';
      case 'FINAL_APPROVAL': return 'Final Sign-Off Required';
      default: return 'Human Authority';
    }
  };

  return (
    <div className="w-full bg-honey-card border border-honey-border rounded-3xl p-6 shadow-xl transition-all duration-300 relative overflow-hidden">
      
      {/* Decorative honeycomb element in background corners */}
      <div className="absolute -top-4 -left-4 w-24 h-24 honeycomb-bg opacity-10 pointer-events-none rounded-2xl" />
      <div className="absolute -bottom-4 -right-4 w-24 h-24 honeycomb-bg opacity-10 pointer-events-none rounded-2xl" />

      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-honey-muted uppercase tracking-wider">
            Human-in-the-Loop Lifecycle
          </span>
          {isHumanCheckpoint && (
            <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-honey-accent/15 border border-honey-accent/30 text-honey-accent font-bold animate-pulse">
              <UserCheck className="h-3 w-3" />
              <span>{getHumanCheckpointLabel()}</span>
            </span>
          )}
        </div>
        <span className="text-[10px] font-mono px-2.5 py-0.75 rounded-full border border-honey-border bg-honey-sidebar/20 text-honey-accent font-semibold">
          {status}
        </span>
      </div>

      <div className="relative py-8 px-4 overflow-x-auto min-w-[580px] sm:min-w-0 z-10">
        
        {/* Progress Line - Honey/Gold path */}
        <div className="absolute top-[52px] left-8 right-8 h-1 bg-honey-border rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-honey-accent via-amber-400 to-amber-500 transition-all duration-700 ease-out"
            style={{ width: `${positionPercentage}%` }}
          />
        </div>

        {/* Bee Mascot container walking directly along the progress track */}
        <div 
          className="absolute top-2 transition-all duration-700 ease-out z-20 -translate-x-1/2"
          style={{ 
            left: `${positionPercentage}%`,
            transform: isCompleted ? 'translate(-30%, 8px)' : 'translate(-50%, 0)'
          }}
        >
          <BeeMascot isMoving={isMoving} className="w-11 h-11" />
        </div>

        {/* Stages Nodes */}
        <div className="flex flex-row flex-nowrap justify-between items-center relative w-full">
          {STAGES.map((stage, idx) => {
            const state = states[idx];
            const isLast = stage.key === 'APPROVAL';
            
            return (
              <div key={stage.key} className="flex flex-col items-center z-10 relative">
                
                {/* Gold Sparkles particles completing effect on final stage */}
                {isLast && isCompleted && (
                  <>
                    <div className="absolute -top-1.5 -left-1.5 h-1.5 w-1.5 rounded-full bg-honey-accent animate-ping" />
                    <div className="absolute -bottom-1 -right-1.5 h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                    <div className="absolute top-1/2 -right-3 h-1.5 w-1.5 rounded-full bg-honey-accent animate-bounce" />
                  </>
                )}

                {/* Node bubble */}
                <div 
                  className={`h-10 w-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 relative ${
                    state === 'completed'
                      ? isLast
                        ? 'bg-honey-card text-honey-accent border-honey-accent shadow-lg shadow-honey-accent/25 honey-glow-active'
                        : 'bg-honey-accent text-honey-bg border-honey-accent shadow-md shadow-honey-accent/15'
                      : state === 'active'
                      ? 'bg-honey-card text-honey-accent border-honey-accent shadow-lg shadow-honey-accent/20 animate-pulse'
                      : state === 'failed'
                      ? 'bg-rose-500/20 text-rose-500 border-rose-500 shadow-md shadow-rose-500/10'
                      : 'bg-honey-sidebar/20 text-honey-muted/60 border-honey-border'
                  }`}
                >
                  {state === 'completed' ? (
                    isLast ? (
                      <HoneyJar className="w-6 h-6 text-honey-accent animate-scale-up" />
                    ) : (
                      <Check className="h-4.5 w-4.5 stroke-[3]" />
                    )
                  ) : state === 'failed' ? (
                    <AlertTriangle className="h-4.5 w-4.5" />
                  ) : state === 'active' ? (
                    isLast ? (
                      <HoneyJar className="w-6 h-6 text-honey-accent animate-pulse opacity-60" />
                    ) : (
                      <Loader2 className="h-4.5 w-4.5 animate-spin" />
                    )
                  ) : (
                    isLast ? (
                      <HoneyJar className="w-5.5 h-5.5 text-honey-muted/50" />
                    ) : (
                      <span className="text-xs font-bold font-mono">{idx + 1}</span>
                    )
                  )}
                </div>

                {/* Stage Label */}
                <span className={`text-[10px] font-bold tracking-wider mt-2.5 uppercase transition-colors duration-300 flex items-center gap-1 ${
                  state === 'active' 
                    ? 'text-honey-accent font-black' 
                    : state === 'completed'
                    ? 'text-honey-text font-medium'
                    : 'text-honey-muted/70'
                }`}>
                  {stage.label}
                  {stage.isHuman && <span className="text-[9px] opacity-75">👩‍💻</span>}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Autonomous Correction Loop status banner */}
      {isRepairing && (
        <div className="mt-4 p-3.5 bg-rose-500/5 border border-rose-500/20 rounded-2xl text-left animate-fade-in relative">
          <div className="flex items-start gap-2.5 text-rose-500">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span className="text-xs font-bold leading-relaxed">
              Test failure detected — AMASEP autonomous diagnosis in progress.
            </span>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[11px] text-honey-muted font-mono">
            <span>Correction Attempt {currentAttempt || 1} / {maxAttempts || 3}</span>
            <span className="flex items-center gap-1.5 font-sans font-semibold text-honey-accent">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {status === 'DIAGNOSING' ? 'Diagnosing PyTest trace...' : status === 'CORRECTING' ? 'Refactoring implementation...' : 'Retesting in Docker...'}
            </span>
          </div>
        </div>
      )}

      {/* Completion congratulations card */}
      {isCompleted && (
        <div className="mt-4 p-3.5 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl text-left animate-fade-in flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-emerald-500">
            <Check className="h-4.5 w-4.5 stroke-[3] shrink-0" />
            <span className="text-xs font-bold leading-relaxed">
              Project successfully validated, approved, and released by developer{correctionHistoryCount && correctionHistoryCount > 0 ? ` after ${correctionHistoryCount} autonomous correction(s)` : ''}.
            </span>
          </div>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            COMPLETED
          </span>
        </div>
      )}

    </div>
  );
}
