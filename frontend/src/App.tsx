import { useState, useEffect } from 'react';
import { 
  Download, 
  History, 
  Trash2,
  CheckCircle,
  AlertTriangle,
  Play,
  FileText,
  Shield,
  Cpu,
  Zap,
  CheckSquare,
  BarChart3,
  Terminal,
  Loader2
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

interface CorrectionHistoryRecord {
  id: number;
  session_id: number;
  attempt: number;
  test_summary: string;
  failure_details: string;
  diagnosis: string;
  recommended_fix: string;
  corrected_code: string;
  passed_after_fix: boolean;
  created_at: string;
}

interface Session {
  id: number;
  requirement: string;
  status: string;
  current_attempt: number;
  max_attempts: number;
  plan_json: string | null;
  session_type: string;
  analysis_report_json: string | null;
  created_at: string;
  updated_at: string | null;
  files: ProjectFile[];
  test_results: TestResult[];
  logs: ExecutionLog[];
  correction_history?: CorrectionHistoryRecord[];
}

const API_BASE = 'http://localhost:8000/api';

export default function App() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  
  // Tab controller
  const [activeTab, setActiveTab] = useState<'plan' | 'code' | 'logs' | 'history' | 'review'>('plan');

  // Existing Project sub-sections active tab
  const [analysisTab, setAnalysisTab] = useState<'stack' | 'arch' | 'quality' | 'security' | 'perf' | 'tests' | 'recs'>('stack');
  
  // Test execution state
  const [runningTests, setRunningTests] = useState(false);
  const [testExecutionResult, setTestExecutionResult] = useState<any>(null);

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
      return !['COMPLETED', 'FAILED', 'CORRECTION_LIMIT_REACHED'].includes(status);
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
      setSessions(prev => [newSession, ...prev]);
      setSelectedSessionId(newSession.id);
      setActiveSession(newSession);
      setActiveTab('plan');
      setApiError(null);
    } catch (err: any) {
      setApiError('Error generating new development run. Server offline.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Handle project analysis upload
  const handleAnalyzeProject = async (file: File, gitUrl?: string) => {
    setLoading(true);
    setTestExecutionResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (gitUrl) {
        formData.append('git_url', gitUrl);
      }

      const res = await fetch(`${API_BASE}/sessions/analyze`, {
        method: 'POST',
        body: formData
      });
      if (!res.ok) throw new Error('Failed to submit project archive for analysis');
      const newSession = await res.json();
      
      setSessions(prev => [newSession, ...prev]);
      setSelectedSessionId(newSession.id);
      setActiveSession(newSession);
      setAnalysisTab('stack');
      setApiError(null);
    } catch (err: any) {
      setApiError('Error uploading project archive. Verify server connection.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Run optional sandbox tests for existing project
  const handleRunProjectTests = async () => {
    if (!activeSession) return;
    setRunningTests(true);
    setTestExecutionResult(null);
    try {
      const res = await fetch(`${API_BASE}/sessions/${activeSession.id}/run_tests`, {
        method: 'POST'
      });
      if (!res.ok) throw new Error('Test run execution failed');
      const data = await res.json();
      setTestExecutionResult(data);
      fetchSessionDetail(activeSession.id);
    } catch (e) {
      console.error(e);
    } finally {
      setRunningTests(false);
    }
  };

  // Delete a session
  const handleDeleteSession = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this development run?')) return;
    
    try {
      const res = await fetch(`${API_BASE}/sessions/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete session');
      
      setSessions(prev => prev.filter(s => s.id !== id));
      if (selectedSessionId === id) {
        setSelectedSessionId(null);
        setActiveSession(null);
      }
      setApiError(null);
    } catch (err) {
      console.error(err);
      setApiError('Failed to delete run session.');
    }
  };

  const handleDownloadWorkspace = () => {
    if (!activeSession) return;
    
    let fileContents = `==================================================\n`;
    fileContents += `AMASEP WORKSPACE EXPORT\n`;
    fileContents += `SESSION ID: ${activeSession.id}\n`;
    fileContents += `REQUIREMENT: ${activeSession.requirement}\n`;
    fileContents += `STATUS: ${activeSession.status}\n`;
    fileContents += `==================================================\n\n`;

    activeSession.files.forEach(f => {
      fileContents += `--------------------------------------------------\n`;
      fileContents += `FILE: ${f.path} ${f.is_test ? '(Test File)' : ''}\n`;
      fileContents += `--------------------------------------------------\n`;
      fileContents += f.content + `\n\n`;
    });

    const element = document.createElement("a");
    const file = new Blob([fileContents], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `amasep_project_${activeSession.id}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const getStatusBadgeStyles = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border-emerald-500/20';
      case 'FAILED': 
      case 'CORRECTION_LIMIT_REACHED': return 'bg-rose-500/10 text-rose-500 dark:text-rose-400 border-rose-500/20';
      case 'RECEIVED': return 'bg-honey-sidebar/20 text-honey-muted border-honey-border';
      default: return 'bg-honey-accent/15 text-honey-accent border-honey-accent/30 animate-pulse font-semibold';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toUpperCase()) {
      case 'CRITICAL': return 'bg-rose-500/15 text-rose-500 border-rose-500/35';
      case 'HIGH': return 'bg-amber-500/15 text-amber-500 border-amber-500/35';
      case 'MEDIUM': return 'bg-yellow-500/15 text-yellow-500 border-yellow-500/35';
      default: return 'bg-neutral-500/15 text-neutral-500 border-neutral-500/35';
    }
  };

  // Parse analysis JSON safely
  let analysisReport: any = null;
  if (activeSession && activeSession.analysis_report_json) {
    try {
      analysisReport = JSON.parse(activeSession.analysis_report_json);
    } catch {
      analysisReport = null;
    }
  }

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
                    {s.status === 'COMPLETED' && s.session_type === 'ANALYZE_PROJECT' ? 'ANALYZED' : s.status}
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
            <RequirementInput onSubmit={handleStartRun} onAnalyze={handleAnalyzeProject} loading={loading} />
          ) : (
            /* ACTIVE RUN WORKFLOW SCREEN */
            <div className="max-w-4xl mx-auto p-6 space-y-6">
              
              {/* Top Row: Active requirement display & download controls */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-honey-card border border-honey-border rounded-3xl p-5 text-left shadow-sm">
                <div className="space-y-1 flex-1">
                  <span className="text-[9px] font-mono font-semibold px-2 py-0.5 rounded bg-honey-accent/15 text-honey-accent uppercase">
                    {activeSession.session_type === 'ANALYZE_PROJECT' ? 'PROJECT ANALYSIS REQUEST' : 'Active Request'}
                  </span>
                  <h2 className="text-sm font-bold text-honey-text pr-4 leading-relaxed mt-1">
                    {activeSession.requirement}
                  </h2>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button 
                    onClick={handleDownloadWorkspace}
                    disabled={activeSession.files.length === 0}
                    className="px-4 py-2 bg-honey-accent text-honey-bg rounded-xl font-bold text-xs hover:bg-honey-accent-hover transition-all flex items-center gap-1.5 shadow-md shadow-honey-accent/10 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download Workspace</span>
                  </button>
                </div>
              </div>

              {activeSession.session_type === 'ANALYZE_PROJECT' ? (
                /* EXISTING PROJECT ANALYSIS DASHBOARD PANEL */
                <div className="space-y-6 animate-fade-in">
                  
                  {/* HEALTH SCORE OVERVIEW */}
                  {analysisReport && (
                    <div className="grid md:grid-cols-3 gap-5">
                      
                      {/* Health score radial / linear widget */}
                      <div className="bg-honey-card border border-honey-border rounded-3xl p-5 shadow-sm text-center flex flex-col items-center justify-center relative overflow-hidden">
                        <div className="absolute -top-12 -right-12 w-28 h-28 bg-honey-accent/5 rounded-full blur-xl" />
                        <span className="text-[10px] font-bold text-honey-muted uppercase tracking-wider block mb-3">Project Health Score</span>
                        
                        <div className="relative flex items-center justify-center">
                          {/* Radial border indicator */}
                          <div className="h-28 w-28 rounded-full border-4 border-honey-border flex flex-col items-center justify-center shadow-inner relative">
                            <div className="absolute inset-0.5 rounded-full border-2 border-honey-accent border-dashed animate-spin opacity-20" style={{ animationDuration: '20s' }} />
                            <span className="text-3xl font-black text-honey-accent font-mono">
                              {analysisReport.health_scores?.overall ?? 80}
                            </span>
                            <span className="text-[10px] text-honey-muted/60 mt-0.5">/ 100</span>
                          </div>
                        </div>
                        
                        <p className="text-[10px] text-honey-muted mt-3 italic leading-relaxed">
                          Heuristic score calculated from findings + structured AI assessment.
                        </p>
                      </div>

                      {/* Health categories breakdowns */}
                      <div className="bg-honey-card border border-honey-border rounded-3xl p-5 shadow-sm md:col-span-2 text-left space-y-3">
                        <h3 className="text-xs font-bold text-honey-text uppercase tracking-wider mb-2">Category Scorecard</h3>
                        {[
                          { label: 'Architecture & Design', val: analysisReport.health_scores?.architecture ?? 80 },
                          { label: 'Code Quality & Standard', val: analysisReport.health_scores?.code_quality ?? 80 },
                          { label: 'Unit testing coverage', val: analysisReport.health_scores?.testing ?? 80 },
                          { label: 'Credentials & Security', val: analysisReport.health_scores?.security ?? 100 },
                          { label: 'System Maintainability', val: analysisReport.health_scores?.maintainability ?? 80 }
                        ].map((cat, idx) => (
                          <div key={idx} className="space-y-1">
                            <div className="flex justify-between text-[11px] font-medium text-honey-muted">
                              <span>{cat.label}</span>
                              <span className="font-mono font-bold text-honey-text">{cat.val}</span>
                            </div>
                            <div className="h-1.5 w-full bg-honey-border rounded-full overflow-hidden">
                              <div className="h-full bg-honey-accent transition-all duration-500" style={{ width: `${cat.val}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>

                    </div>
                  )}

                  {/* ANALYSIS SECTIONS TAB SWITCHER */}
                  {analysisReport && (
                    <div className="flex flex-wrap gap-1.5 border-b border-honey-border/80 pb-2 text-xs">
                      {[
                        { key: 'stack', label: 'Tech Stack', icon: Cpu },
                        { key: 'arch', label: 'Architecture', icon: FileText },
                        { key: 'quality', label: 'Code Quality', icon: CheckSquare },
                        { key: 'security', label: 'Security', icon: Shield },
                        { key: 'perf', label: 'Performance', icon: Zap },
                        { key: 'tests', label: 'Testing & Exec', icon: BarChart3 },
                        { key: 'recs', label: 'Recommendations', icon: AlertTriangle }
                      ].map(sec => {
                        const Icon = sec.icon;
                        return (
                          <button
                            key={sec.key}
                            onClick={() => setAnalysisTab(sec.key as any)}
                            className={`py-2 px-3 border border-honey-border rounded-xl font-bold tracking-wide uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
                              analysisTab === sec.key
                                ? 'bg-honey-accent text-honey-bg border-honey-accent shadow-md shadow-honey-accent/10'
                                : 'bg-honey-card/50 text-honey-muted hover:bg-honey-sidebar hover:text-honey-text'
                            }`}
                          >
                            <Icon className="h-3.5 w-3.5 shrink-0" />
                            <span>{sec.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* SUB SECTION PANELS DISPLAY */}
                  {analysisReport && (
                    <div className="bg-honey-card border border-honey-border rounded-3xl p-5 shadow-sm min-h-[250px] text-left">
                      
                      {/* Tech stack */}
                      {analysisTab === 'stack' && (
                        <div className="space-y-4">
                          <h4 className="text-xs font-bold text-honey-text uppercase tracking-wider">Project Summary</h4>
                          <p className="text-xs text-honey-muted leading-relaxed">{analysisReport.project_summary}</p>
                          <div className="pt-3 border-t border-honey-border/40">
                            <span className="text-xs font-bold text-honey-text block mb-2 uppercase tracking-wide">Identified Languages & Libraries</span>
                            <div className="flex flex-wrap gap-2">
                              {analysisReport.technology_stack.map((t: string, i: number) => (
                                <span key={i} className="text-xs font-mono px-3 py-1 bg-honey-sidebar/20 text-honey-accent rounded-lg border border-honey-border/50">
                                  {t}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Architecture */}
                      {analysisTab === 'arch' && (
                        <div className="space-y-4">
                          <h4 className="text-xs font-bold text-honey-text uppercase tracking-wider">Architecture Overview</h4>
                          <p className="text-xs text-honey-muted leading-relaxed">{analysisReport.architecture?.description}</p>
                          
                          <div className="grid md:grid-cols-2 gap-5 pt-3 border-t border-honey-border/40">
                            <div>
                              <span className="text-xs font-bold text-honey-text block mb-2 uppercase tracking-wide">Identified Components</span>
                              <ul className="space-y-2">
                                {analysisReport.architecture?.components?.map((c: string, i: number) => (
                                  <li key={i} className="text-xs text-honey-muted flex items-start gap-2">
                                    <span className="text-honey-accent">•</span>
                                    <span>{c}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <span className="text-xs font-bold text-honey-text block mb-2 uppercase tracking-wide">Component Concerns</span>
                              <ul className="space-y-2">
                                {analysisReport.architecture?.concerns?.map((c: string, i: number) => (
                                  <li key={i} className="text-xs text-honey-muted flex items-start gap-2">
                                    <span className="text-amber-500 font-bold">•</span>
                                    <span>{c}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Code Quality */}
                      {analysisTab === 'quality' && (
                        <div className="grid md:grid-cols-2 gap-5">
                          <div className="space-y-3">
                            <span className="text-xs font-bold text-honey-text block uppercase tracking-wide">Code Base Strengths</span>
                            <ul className="space-y-2">
                              {analysisReport.code_quality?.strengths?.map((s: string, i: number) => (
                                <li key={i} className="text-xs text-honey-muted flex items-start gap-2 bg-emerald-500/5 p-2 rounded-xl border border-emerald-500/10">
                                  <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                                  <span>{s}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div className="space-y-3">
                            <span className="text-xs font-bold text-honey-text block uppercase tracking-wide">Code Quality Concerns</span>
                            <ul className="space-y-2">
                              {analysisReport.code_quality?.issues?.map((s: string, i: number) => (
                                <li key={i} className="text-xs text-honey-muted flex items-start gap-2 bg-amber-500/5 p-2 rounded-xl border border-amber-500/10">
                                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                                  <span>{s}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}

                      {/* Security */}
                      {analysisTab === 'security' && (
                        <div className="space-y-4">
                          <div className="space-y-3">
                            <span className="text-xs font-bold text-honey-text block uppercase tracking-wide">Detected Security Concerns</span>
                            {analysisReport.security?.detected_issues?.length === 0 ? (
                              <p className="text-xs text-honey-muted italic">No immediate credentials leaks detected.</p>
                            ) : (
                              <ul className="space-y-2">
                                {analysisReport.security?.detected_issues?.map((s: string, i: number) => (
                                  <li key={i} className="text-xs text-honey-muted flex items-start gap-2 bg-rose-500/5 p-2.5 rounded-xl border border-rose-500/15">
                                    <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                                    <span>{s}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                          <div className="space-y-3 pt-3 border-t border-honey-border/40">
                            <span className="text-xs font-bold text-honey-text block uppercase tracking-wide">Security Recommendations</span>
                            <ul className="space-y-2">
                              {analysisReport.security?.recommendations?.map((s: string, i: number) => (
                                <li key={i} className="text-xs text-honey-muted flex items-start gap-2">
                                  <span className="text-honey-accent font-bold">•</span>
                                  <span>{s}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}

                      {/* Performance */}
                      {analysisTab === 'perf' && (
                        <div className="grid md:grid-cols-2 gap-5">
                          <div className="space-y-3">
                            <span className="text-xs font-bold text-honey-text block uppercase tracking-wide">Performance Bottlenecks</span>
                            {analysisReport.performance?.issues?.length === 0 ? (
                              <p className="text-xs text-honey-muted italic">No performance bottlenecks identified.</p>
                            ) : (
                              <ul className="space-y-2">
                                {analysisReport.performance?.issues?.map((s: string, i: number) => (
                                  <li key={i} className="text-xs text-honey-muted flex items-start gap-2">
                                    <span className="text-amber-500 font-bold">•</span>
                                    <span>{s}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                          <div className="space-y-3">
                            <span className="text-xs font-bold text-honey-text block uppercase tracking-wide">Performance Optimization Tips</span>
                            <ul className="space-y-2">
                              {analysisReport.performance?.recommendations?.map((s: string, i: number) => (
                                <li key={i} className="text-xs text-honey-muted flex items-start gap-2">
                                  <span className="text-honey-accent font-bold">•</span>
                                  <span>{s}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}

                      {/* Testing Section & Sandbox optional runner */}
                      {analysisTab === 'tests' && (
                        <div className="space-y-5">
                          <div className="grid md:grid-cols-2 gap-5">
                            <div className="space-y-3">
                              <span className="text-xs font-bold text-honey-text block uppercase tracking-wide">Existing Unit Tests</span>
                              {analysisReport.testing?.existing_tests?.length === 0 ? (
                                <p className="text-xs text-honey-muted italic">No automated tests modules discovered.</p>
                              ) : (
                                <ul className="space-y-2">
                                  {analysisReport.testing?.existing_tests?.map((s: string, i: number) => (
                                    <li key={i} className="text-xs text-honey-muted flex items-start gap-2">
                                      <span className="text-honey-accent font-bold">•</span>
                                      <span>{s}</span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                            <div className="space-y-3">
                              <span className="text-xs font-bold text-honey-text block uppercase tracking-wide">Missing Test Coverage Areas</span>
                              <ul className="space-y-2">
                                {analysisReport.testing?.missing_coverage?.map((s: string, i: number) => (
                                  <li key={i} className="text-xs text-honey-muted flex items-start gap-2 bg-rose-500/5 p-2 rounded-xl border border-rose-500/10">
                                    <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                                    <span>{s}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>

                          {/* DOCKER SANDBOX OPTIONAL TEST RUNNER */}
                          <div className="pt-4 border-t border-honey-border/40 space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-honey-sidebar/10 p-4.5 border border-honey-border rounded-2xl">
                              <div className="space-y-1">
                                <span className="text-xs font-bold text-honey-text block uppercase tracking-wide">Execute Automated Unit Tests</span>
                                <p className="text-[11px] text-honey-muted leading-relaxed">
                                  Run the project's discovered test suites securely inside the isolated Docker sandbox environment.
                                </p>
                              </div>
                              <button
                                onClick={handleRunProjectTests}
                                disabled={runningTests}
                                className="px-4 py-2 bg-honey-accent hover:bg-honey-accent-hover text-honey-bg rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-honey-accent/15 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                              >
                                {runningTests ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Play className="h-3.5 w-3.5 fill-current" />
                                )}
                                <span>Run Project Tests</span>
                              </button>
                            </div>

                            {/* Live Sandbox Execution Output Console Terminal */}
                            {testExecutionResult && (
                              <div className="bg-neutral-900 border border-neutral-800 text-neutral-200 rounded-2xl p-4.5 font-mono text-xs text-left space-y-3 shadow-lg">
                                <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                                  <div className="flex items-center gap-2">
                                    <Terminal className="h-4 w-4 text-honey-accent" />
                                    <span className="text-[10px] font-bold text-neutral-400">SANDBOX TEST EXECUTION RESULT</span>
                                  </div>
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                    testExecutionResult.passed 
                                      ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                                      : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                                  }`}>
                                    {testExecutionResult.passed ? 'PASSED' : 'FAILED'}
                                  </span>
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-[10px] text-neutral-400 font-bold bg-neutral-950/40 p-2.5 rounded-lg border border-neutral-800/40">
                                  <div>Total Assertions: {testExecutionResult.total_tests}</div>
                                  <div>Passed: {testExecutionResult.passed_tests}</div>
                                  <div>Failed: {testExecutionResult.failed_tests}</div>
                                </div>
                                <div className="space-y-1">
                                  <span className="text-[10px] font-bold text-neutral-400">PyTest Stdout Logs:</span>
                                  <pre className="p-3 bg-neutral-950 border border-neutral-850 rounded-lg text-[10px] leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap text-neutral-300">
                                    {testExecutionResult.stdout || 'No logs captured.'}
                                  </pre>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Prioritised Recommendations list */}
                      {analysisTab === 'recs' && (
                        <div className="space-y-4">
                          <h4 className="text-xs font-bold text-honey-text uppercase tracking-wider mb-2">Priority Improvement Actions</h4>
                          <div className="space-y-3">
                            {analysisReport.improvements?.map((imp: any, i: number) => (
                              <div key={i} className="border border-honey-border/80 rounded-2xl p-4.5 space-y-2 relative overflow-hidden bg-honey-sidebar/5">
                                <div className="flex items-center gap-2">
                                  <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${getPriorityColor(imp.priority)}`}>
                                    {imp.priority} Priority
                                  </span>
                                  <span className="text-[10px] font-bold text-honey-muted font-mono uppercase">{imp.category}</span>
                                </div>
                                <div className="text-xs space-y-1 leading-relaxed text-honey-text">
                                  <p className="font-bold text-honey-text mt-1">{imp.issue}</p>
                                  <p className="text-honey-muted mt-1.5"><strong className="text-honey-accent font-semibold">Recommendation:</strong> {imp.recommendation}</p>
                                  <p className="text-honey-muted/80 text-[11px]"><strong className="text-honey-muted font-semibold">Reason:</strong> {imp.reason}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    </div>
                  )}

                </div>
              ) : (
                /* NEW PROJECT WORKFLOW PANEL */
                <>
                  <WorkflowProgress 
                    status={activeSession.status} 
                    filesCount={activeSession.files.length} 
                    testResultsCount={activeSession.test_results.length}
                    currentAttempt={activeSession.current_attempt}
                    maxAttempts={activeSession.max_attempts}
                    correctionHistoryCount={activeSession.correction_history?.length || 0}
                  />

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
                    {activeSession.correction_history && activeSession.correction_history.length > 0 && (
                      <button
                        onClick={() => setActiveTab('history')}
                        className={`py-3 px-4 border-b-2 text-xs font-bold tracking-wider uppercase transition-all cursor-pointer ${
                          activeTab === 'history'
                            ? 'border-honey-accent text-honey-accent'
                            : 'border-transparent text-honey-muted hover:text-honey-text'
                        }`}
                      >
                        Correction History
                      </button>
                    )}
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
                    {activeTab === 'history' && (
                      <div className="space-y-6 text-left animate-fade-in">
                        <div className="bg-honey-card border border-honey-border rounded-2xl p-5 shadow-sm">
                          <h3 className="text-sm font-bold text-honey-text uppercase tracking-wider mb-2 flex items-center gap-2">
                            <History className="h-4.5 w-4.5 text-honey-accent" />
                            Autonomous Correction History
                          </h3>
                          <p className="text-xs text-honey-muted">
                            Details of iterative error diagnosis and automatic source code refactoring runs.
                          </p>
                        </div>

                        <div className="space-y-4">
                          {activeSession.correction_history && activeSession.correction_history.map((hist: any, index: number) => {
                            let diagObj: any = {};
                            try {
                              diagObj = JSON.parse(hist.diagnosis);
                            } catch (e) {
                              diagObj = {};
                            }

                            return (
                              <div key={hist.id || index} className="bg-honey-card border border-honey-border rounded-2xl p-5 shadow-sm space-y-4 relative overflow-hidden bg-honey-sidebar/5">
                                {/* Header / Attempt number */}
                                <div className="flex items-center justify-between border-b border-honey-border/40 pb-3">
                                  <div className="flex items-center gap-2">
                                    <span className="h-5 w-5 rounded-full bg-honey-accent/15 border border-honey-accent/30 text-[10px] text-honey-accent flex items-center justify-center font-bold font-mono">
                                      {hist.attempt}
                                    </span>
                                    <h4 className="text-xs font-bold text-honey-text uppercase tracking-wider">
                                      Correction Attempt {hist.attempt}
                                    </h4>
                                  </div>
                                  <span className={`text-[10px] font-semibold font-mono px-2.5 py-0.5 rounded-full border ${
                                    hist.passed_after_fix
                                      ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-500'
                                      : 'border-rose-500/30 bg-rose-500/5 text-rose-500'
                                  }`}>
                                    {hist.passed_after_fix ? 'PASSED AFTER FIX' : 'UNRESOLVED'}
                                  </span>
                                </div>

                                {/* Grid detailing failures and diagnosis */}
                                <div className="grid md:grid-cols-2 gap-5 text-xs">
                                  <div className="space-y-3">
                                    {/* Test totals */}
                                    <div>
                                      <span className="font-semibold text-honey-muted block mb-1">Test execution summary:</span>
                                      <span className="font-mono text-rose-500 font-bold px-2 py-0.75 bg-rose-500/10 border border-rose-500/25 rounded-md">
                                        {hist.test_summary}
                                      </span>
                                    </div>
                                    {/* Stacktrace snapshot */}
                                    <div>
                                      <span className="font-semibold text-honey-muted block mb-1">PyTest stacktrace output snippet:</span>
                                      <pre className="p-3 bg-honey-sidebar/35 border border-honey-border rounded-xl font-mono text-[10px] text-honey-text max-h-36 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                                        {hist.failure_details}
                                      </pre>
                                    </div>
                                  </div>

                                  <div className="space-y-3 border-t md:border-t-0 md:border-l border-honey-border/40 pt-4 md:pt-0 md:pl-5">
                                    {/* Diagnosis */}
                                    <div>
                                      <span className="font-bold text-honey-accent block mb-1">Fault Diagnosis:</span>
                                      <div className="space-y-2">
                                        <p className="text-honey-text italic leading-relaxed">
                                          "{diagObj.root_cause || 'Analyzing crash logs...'}"
                                        </p>
                                        {diagObj.affected_files && diagObj.affected_files.length > 0 && (
                                          <div className="text-[10px] font-mono text-honey-muted">
                                            Affected files: {diagObj.affected_files.join(', ')}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    {/* Recommended Fix */}
                                    <div>
                                      <span className="font-bold text-honey-accent block mb-1">Recommended Correction:</span>
                                      <p className="text-honey-text leading-relaxed bg-honey-sidebar/20 p-2.5 rounded-lg border border-honey-border/30">
                                        {hist.recommended_fix || 'Determining repair approach...'}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {activeTab === 'review' && (
                      <ReviewPanel testResults={activeSession.test_results} status={activeSession.status} />
                    )}
                  </div>
                </>
              )}

            </div>
          )}
        </div>

      </div>

    </div>
  );
}
