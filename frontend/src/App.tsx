import { useState, useEffect } from 'react';
import { 
  Download, 
  History, 
  Trash2,
  RefreshCw,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';

import Header from './components/Header';
import BeeMascot from './components/BeeMascot';
import RequirementInput from './components/RequirementInput';
import WorkflowProgress from './components/WorkflowProgress';
import PlanViewer from './components/PlanViewer';
import CodeViewer from './components/CodeViewer';
import TestResults from './components/TestResults';
import ReviewPanel from './components/ReviewPanel';

// Type definitions
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

interface ExecutionLog {
  id: number;
  session_id: number;
  log_text: string;
  created_at: string;
}

interface Session {
  id: number;
  requirement: string;
  status: string;
  current_attempt: number;
  max_attempts: number;
  plan_json: string | null;
  created_at: string;
  updated_at: string | null;
  files: ProjectFile[];
  test_results: TestResult[];
  logs: ExecutionLog[];
}

const API_BASE = 'http://localhost:8000/api';

export default function App() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  
  // Tab controller
  const [activeTab, setActiveTab] = useState<'plan' | 'code' | 'logs' | 'review'>('plan');

  // Load list of sessions on startup
  const fetchSessions = async () => {
    try {
      const res = await fetch(`${API_BASE}/sessions`);
      if (!res.ok) throw new Error('Failed to retrieve history');
      const data = await res.json();
      setSessions(data);
      setApiError(null);
    } catch (err: any) {
      setApiError('Unable to connect to backend server. Make sure FastAPI is running.');
      console.error(err);
    }
  };

  // Fetch full details for the active session
  const fetchSessionDetail = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE}/sessions/${id}`);
      if (!res.ok) throw new Error('Failed to retrieve session details');
      const data = await res.json();
      setActiveSession(data);
      setApiError(null);
    } catch (err: any) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  // Poll for changes when a session is currently running
  useEffect(() => {
    if (selectedSessionId === null) return;
    
    fetchSessionDetail(selectedSessionId);
    
    const isRunning = (status: string) => {
      return !['COMPLETED', 'FAILED'].includes(status);
    };

    const interval = setInterval(() => {
      if (activeSession && isRunning(activeSession.status)) {
        fetchSessionDetail(selectedSessionId);
        fetchSessions(); // update sidebar status badges
      } else if (!activeSession) {
        fetchSessionDetail(selectedSessionId);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [selectedSessionId, activeSession?.status]);

  // Handle run creation
  const handleStartRun = async (requirement: string, maxAttempts: number) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requirement, max_attempts: maxAttempts })
      });
      if (!res.ok) throw new Error('Failed to create run session');
      const newSession = await res.json();
      
      setSelectedSessionId(newSession.id);
      setActiveSession(newSession);
      setActiveTab('plan');
      await fetchSessions();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRetryRun = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE}/sessions/${id}/retry`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to restart run');
      const data = await res.json();
      setActiveSession(data);
      setActiveTab('plan');
      fetchSessions();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteSession = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this session?')) return;
    
    try {
      await fetch(`${API_BASE}/sessions/${id}`, { method: 'DELETE' });
      if (selectedSessionId === id) {
        setSelectedSessionId(null);
        setActiveSession(null);
      }
      fetchSessions();
    } catch (err: any) {
      alert('Delete failed');
    }
  };

  const downloadProject = (session: Session) => {
    const element = document.createElement("a");
    const zipContent = `=== PROJECT SOURCE: ${session.requirement} ===\n\n`;
    const filesContent = session.files.map(f => `--- FILE: ${f.path} ---\n${f.content}\n\n`).join('');
    
    const file = new Blob([zipContent + filesContent], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `amasep_project_${session.id}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const getStatusBadgeStyles = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border-emerald-500/20';
      case 'FAILED': return 'bg-rose-500/10 text-rose-500 dark:text-rose-400 border-rose-500/20';
      case 'RECEIVED': return 'bg-honey-sidebar/20 text-honey-muted border-honey-border';
      default: return 'bg-honey-accent/15 text-honey-accent border-honey-accent/30 animate-pulse font-semibold';
    }
  };

  return (
    <div className="flex h-screen bg-honey-bg text-honey-text transition-all duration-300 overflow-hidden relative">
      
      {/* Decorative background honeycomb pattern over the application */}
      <div className="absolute inset-0 honeycomb-bg opacity-3 pointer-events-none" />

      {/* SIDEBAR */}
      <div className="w-80 border-r border-honey-border bg-honey-sidebar/10 backdrop-blur-xl flex flex-col shrink-0 relative z-10">
        
        {/* Sidebar Header Logo */}
        <div className="p-4.5 border-b border-honey-border flex items-center justify-between bg-honey-card/50">
          <div className="flex items-center gap-2">
            <BeeMascot isMoving={false} className="w-5.5 h-5.5 text-honey-accent" />
            <span className="font-bold text-base tracking-wider bg-gradient-to-r from-honey-accent to-amber-500 bg-clip-text text-transparent">AMASEP</span>
            <span className="text-[9px] font-mono px-1.5 py-0.25 bg-honey-accent/10 text-honey-accent border border-honey-accent/25 rounded-md">IDE</span>
          </div>
          <button 
            onClick={() => { setSelectedSessionId(null); setActiveSession(null); }}
            className="text-xs px-2.5 py-1.5 bg-honey-accent text-honey-bg rounded-lg hover:bg-honey-accent-hover transition-all font-semibold flex items-center gap-1 shadow-md shadow-honey-accent/10 cursor-pointer"
            title="Create New Run"
          >
            <span>New</span>
          </button>
        </div>

        {/* System Error notification */}
        {apiError && (
          <div className="m-3 p-3 bg-rose-500/5 border border-rose-500/20 text-rose-500 text-[11px] rounded-xl flex items-start gap-2 text-left">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>{apiError}</div>
          </div>
        )}

        {/* Sessions list */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-2">
          <div className="flex items-center gap-1.5 px-2 text-[10px] font-semibold text-honey-muted uppercase tracking-wider mb-2 text-left">
            <History className="h-3.5 w-3.5" />
            <span>Development Runs</span>
          </div>
          {sessions.length === 0 ? (
            <div className="text-center py-10 text-xs text-honey-muted/50 border border-dashed border-honey-border/80 rounded-2xl">
              No sessions created yet
            </div>
          ) : (
            sessions.map(s => (
              <div
                key={s.id}
                onClick={() => { setSelectedSessionId(s.id); }}
                className={`group p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                  selectedSessionId === s.id
                    ? 'bg-honey-card border-honey-accent/60 shadow-lg shadow-honey-accent/5'
                    : 'bg-honey-card/35 border-honey-border/60 hover:bg-honey-card hover:border-honey-border'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-semibold text-xs text-honey-text line-clamp-2 leading-relaxed flex-1">
                    {s.requirement}
                  </span>
                  <button 
                    onClick={(e) => handleDeleteSession(s.id, e)}
                    className="opacity-0 group-hover:opacity-100 hover:text-rose-500 text-honey-muted/50 p-1 hover:bg-honey-sidebar rounded-lg transition-all cursor-pointer"
                    title="Delete session"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full border ${getStatusBadgeStyles(s.status)}`}>
                    {s.status}
                  </span>
                  <span className="text-[9px] text-honey-muted/60 font-mono">
                    ID #{s.id}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-3 bg-honey-sidebar/5 border-t border-honey-border text-[9px] text-honey-muted/50 font-mono text-center">
          AMASEP • Autonomous Agent Engine
        </div>
      </div>

      {/* WORKSPACE MAIN PANEL */}
      <div className="flex-1 flex flex-col overflow-hidden bg-honey-bg relative z-10">
        
        {/* Header bar */}
        <Header onLogoClick={() => { setSelectedSessionId(null); setActiveSession(null); }} />

        {/* Content body wrapper */}
        <div className="flex-1 overflow-y-auto">
          {!activeSession ? (
            /* REQUIREMENT REQUEST PANEL */
            <RequirementInput onSubmit={handleStartRun} loading={loading} />
          ) : (
            /* ACTIVE RUN WORKFLOW SCREEN */
            <div className="p-6 space-y-6 max-w-5xl mx-auto pb-12 animate-fade-in">
              
              {/* RUN META CARD HEADER */}
              <div className="bg-honey-card border border-honey-border rounded-3xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 text-left relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-16 honeycomb-bg opacity-5 pointer-events-none" />

                <div className="relative z-10">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-honey-muted mb-1">Active Request</h2>
                  <p className="text-sm font-semibold text-honey-text leading-relaxed">{activeSession.requirement}</p>
                </div>

                <div className="flex items-center gap-3 shrink-0 relative z-10">
                  {['COMPLETED', 'FAILED'].includes(activeSession.status) && (
                    <button
                      onClick={() => handleRetryRun(activeSession.id)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-honey-sidebar/20 border border-honey-border hover:bg-honey-card text-honey-text hover:text-honey-accent text-xs font-medium rounded-xl transition-all cursor-pointer"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      <span>Retry Pipeline</span>
                    </button>
                  )}
                  <button
                    onClick={() => downloadProject(activeSession)}
                    disabled={activeSession.files.length === 0}
                    className="flex items-center gap-1.5 px-4.5 py-2 bg-honey-accent hover:bg-honey-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-honey-bg text-xs font-bold rounded-xl transition-all shadow-md shadow-honey-accent/15 cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download Project</span>
                  </button>
                </div>
              </div>

              {/* MAPPED WORKFLOW PIPELINE PROGRESS TRACKER */}
              <WorkflowProgress 
                status={activeSession.status} 
                filesCount={activeSession.files.length}
                testResultsCount={activeSession.test_results.length}
              />

              {/* SUCCESS BANNER CARD FOR FINAL COMPLETED RESULTS */}
              {activeSession.status === 'COMPLETED' && (
                <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-2xl p-5 text-left flex items-start gap-4 animate-scale-up">
                  <div className="p-2 bg-emerald-500/15 text-emerald-500 rounded-xl mt-0.5">
                    <CheckCircle className="h-5.5 w-5.5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-honey-text">Generation Completed Successfully</h3>
                    <p className="text-xs text-honey-muted mt-1 leading-relaxed">
                      The application modules have been completely generated and successfully validated against all PyTest assertions in the isolated Docker sandbox. You can download the completed workspace directory directly.
                    </p>
                  </div>
                </div>
              )}

              {/* PIPELINE DATA TAB SWITCHER */}
              <div className="flex border-b border-honey-border/80">
                <button
                  onClick={() => setActiveTab('plan')}
                  className={`py-3 px-4 border-b-2 text-xs font-bold tracking-wider uppercase transition-all cursor-pointer ${
                    activeTab === 'plan'
                      ? 'border-honey-accent text-honey-accent'
                      : 'border-transparent text-honey-muted hover:text-honey-text'
                  }`}
                >
                  Plan
                </button>
                <button
                  onClick={() => setActiveTab('code')}
                  className={`py-3 px-4 border-b-2 text-xs font-bold tracking-wider uppercase transition-all cursor-pointer ${
                    activeTab === 'code'
                      ? 'border-honey-accent text-honey-accent'
                      : 'border-transparent text-honey-muted hover:text-honey-text'
                  }`}
                >
                  Workspace
                </button>
                <button
                  onClick={() => setActiveTab('logs')}
                  className={`py-3 px-4 border-b-2 text-xs font-bold tracking-wider uppercase transition-all cursor-pointer ${
                    activeTab === 'logs'
                      ? 'border-honey-accent text-honey-accent'
                      : 'border-transparent text-honey-muted hover:text-honey-text'
                  }`}
                >
                  Tests
                </button>
                <button
                  onClick={() => setActiveTab('review')}
                  className={`py-3 px-4 border-b-2 text-xs font-bold tracking-wider uppercase transition-all cursor-pointer ${
                    activeTab === 'review'
                      ? 'border-honey-accent text-honey-accent'
                      : 'border-transparent text-honey-muted hover:text-honey-text'
                  }`}
                >
                  Review
                </button>
              </div>

              {/* ACTIVE TAB DISPLAY GRID */}
              <div className="min-h-[300px]">
                {activeTab === 'plan' && (
                  <PlanViewer planJson={activeSession.plan_json} status={activeSession.status} />
                )}
                {activeTab === 'code' && (
                  <CodeViewer files={activeSession.files} status={activeSession.status} />
                )}
                {activeTab === 'logs' && (
                  <TestResults 
                    testResults={activeSession.test_results} 
                    logs={activeSession.logs} 
                    status={activeSession.status}
                    attempt={activeSession.current_attempt}
                    maxAttempts={activeSession.max_attempts}
                  />
                )}
                {activeTab === 'review' && (
                  <ReviewPanel testResults={activeSession.test_results} status={activeSession.status} />
                )}
              </div>

            </div>
          )}
        </div>

      </div>

    </div>
  );
}
