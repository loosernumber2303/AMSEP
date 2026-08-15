import TortoiseMascot from './TortoiseMascot';
import { Check, AlertTriangle, Loader2 } from 'lucide-react';

interface WorkflowProgressProps {
  status: string;
  filesCount: number;
  testResultsCount: number;
}

export type StageState = 'pending' | 'active' | 'completed' | 'failed';
export type WorkflowStage = 'PLAN' | 'CODE' | 'TEST' | 'REVIEW';

interface Stage {
  key: WorkflowStage;
  label: string;
}

const STAGES: Stage[] = [
  { key: 'PLAN', label: 'Plan' },
  { key: 'CODE', label: 'Code' },
  { key: 'TEST', label: 'Test' },
  { key: 'REVIEW', label: 'Review' }
];

export function workflowStateToStage(status: string, filesCount: number, testResultsCount: number): { stage: WorkflowStage; state: StageState } {
  // If failed, map to the stage where it failed
  if (status === 'FAILED') {
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
      return { stage: 'PLAN', state: 'active' };
    case 'PLAN_READY':
      return { stage: 'PLAN', state: 'completed' };
    case 'CODING':
      return { stage: 'CODE', state: 'active' };
    case 'CODE_READY':
      return { stage: 'CODE', state: 'completed' };
    case 'TEST_GENERATION':
    case 'TESTING':
      return { stage: 'TEST', state: 'active' };
    case 'TEST_RESULTS_READY':
      return { stage: 'TEST', state: 'completed' };
    case 'ANALYSIS':
      return { stage: 'REVIEW', state: 'active' };
    case 'COMPLETED':
      return { stage: 'REVIEW', state: 'completed' };
    default:
      return { stage: 'PLAN', state: 'pending' };
  }
}

export default function WorkflowProgress({ status, filesCount, testResultsCount }: WorkflowProgressProps) {
  
  // Determine state for each of the 4 stages and calculate active index
  const getStageStates = (): { states: StageState[]; activeIndex: number } => {
    const states: StageState[] = ['pending', 'pending', 'pending', 'pending'];
    
    // Retrieve mapped stage and local state
    const current = workflowStateToStage(status, filesCount, testResultsCount);
    
    const stageKeys: WorkflowStage[] = ['PLAN', 'CODE', 'TEST', 'REVIEW'];
    const currentIdx = stageKeys.indexOf(current.stage);
    
    for (let i = 0; i < 4; i++) {
      if (i < currentIdx) {
        states[i] = 'completed';
      } else if (i === currentIdx) {
        states[i] = current.state;
      } else {
        states[i] = 'pending';
      }
    }
    
    // Position tortoise: if a stage is completed, sit halfway to the next, except on the last stage
    let activePosition = currentIdx;
    if (current.state === 'completed' && currentIdx < 3) {
      activePosition = currentIdx + 0.5;
    }
    
    return { states, activeIndex: activePosition };
  };

  const { states, activeIndex } = getStageStates();
  
  // Calculate tortoise position along the bar (0% to 100%)
  const positionPercentage = (activeIndex / 3) * 100;
  
  const isMoving = !['COMPLETED', 'FAILED', 'RECEIVED'].includes(status) && status.trim() !== '';

  return (
    <div className="w-full bg-green-card border border-green-border rounded-2xl p-6 shadow-md transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-semibold text-green-muted uppercase tracking-wider">
          Orchestration Pipeline
        </span>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-green-border bg-green-sidebar text-green-accent font-semibold animate-pulse">
          {status}
        </span>
      </div>

      {/* Outer wrapper to prevent wrapping on smaller screens, scrollable horizontally if compressed */}
      <div className="relative py-8 px-4 overflow-x-auto min-w-[500px] sm:min-w-0">
        
        {/* Progress Line */}
        <div className="absolute top-[52px] left-8 right-8 h-1 bg-green-border rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-green-accent to-emerald-500 transition-all duration-800 ease-in-out"
            style={{ width: `${positionPercentage}%` }}
          />
        </div>

        {/* Tortoise Mascot container moving along the pipeline */}
        <div 
          className="absolute top-2 transition-all duration-800 ease-in-out z-10 -translate-x-1/2"
          style={{ left: `${positionPercentage}%` }}
        >
          <TortoiseMascot isMoving={isMoving} className="w-11 h-11" />
        </div>

        {/* Stages Nodes */}
        <div className="flex flex-row flex-nowrap justify-between items-center relative w-full">
          {STAGES.map((stage, idx) => {
            const state = states[idx];
            return (
              <div key={stage.key} className="flex flex-col items-center z-10">
                {/* Node bubble */}
                <div 
                  className={`h-10 w-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                    state === 'completed'
                      ? 'bg-green-accent text-green-bg border-green-accent shadow-md shadow-green-accent/15'
                      : state === 'active'
                      ? 'bg-green-card text-green-accent border-green-accent shadow-lg shadow-green-accent/20 animate-pulse'
                      : state === 'failed'
                      ? 'bg-rose-500/20 text-rose-500 border-rose-500 shadow-md shadow-rose-500/10'
                      : 'bg-green-sidebar text-green-muted/60 border-green-border'
                  }`}
                >
                  {state === 'completed' ? (
                    <Check className="h-4.5 w-4.5 stroke-[3]" />
                  ) : state === 'failed' ? (
                    <AlertTriangle className="h-4.5 w-4.5" />
                  ) : state === 'active' ? (
                    <Loader2 className="h-4.5 w-4.5 animate-spin" />
                  ) : (
                    <span className="text-xs font-bold font-mono">{idx + 1}</span>
                  )}
                </div>

                {/* Stage Label */}
                <span className={`text-[10px] font-bold tracking-wider mt-2.5 uppercase transition-colors duration-300 ${
                  state === 'active' 
                    ? 'text-green-accent font-black' 
                    : state === 'completed'
                    ? 'text-green-text font-medium'
                    : 'text-green-muted/70'
                }`}>
                  {stage.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
