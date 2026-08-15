import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Terminal, 
  FileCode, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  Download, 
  History, 
  Plus, 
  Code2, 
  Clipboard,
  Trash2,
  RefreshCw,
  FolderOpen
} from 'lucide-react';

// Define session interface types
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

const STATES_ORDER = [
  'RECEIVED',
  'PLANNING',
  'PLAN_READY',
  'CODING',
  'CODE_READY',
  'TEST_GENERATION',
  'TESTING',
  'TEST_RESULTS_READY',
  'ANALYSIS',
  'COMPLETED'
];

export default function App() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [requirement, setRequirement] = useState('');
  const [maxAttempts, setMaxAttempts] = useState(3);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  
  // Tab control
  const [activeTab, setActiveTab] = useState<'plan' | 'code' | 'logs'>('plan');
  // Selected file in the workspace
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);

  const logsEndRef = useRef<HTMLDivElement>(null);

  // Fetch session history
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

  // Fetch active session detail
  const fetchSessionDetail = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE}/sessions/${id}`);
      if (!res.ok) throw new Error('Failed to retrieve session details');
      const data = await res.json();
      setActiveSession(data);
      
      // Auto select first file if none is selected
      if (data.files && data.files.length > 0 && !selectedFilePath) {
        setSelectedFilePath(data.files[0].path);
      }
      setApiError(null);
    } catch (err: any) {
      console.error(err);
    }
  };

  // Run list polling on load
  useEffect(() => {
    fetchSessions();
  }, []);

  // Poll details if active session is running
  useEffect(() => {
    if (selectedSessionId === null) return;
    
    fetchSessionDetail(selectedSessionId);
    
    // Check if state is terminal
    const isRunning = (status: string) => {
      return !['COMPLETED', 'FAILED'].includes(status);
    };

    const interval = setInterval(() => {
      if (activeSession && isRunning(activeSession.status)) {
        fetchSessionDetail(selectedSessionId);
        fetchSessions(); // Refresh sidebar list to show correct badge status
      } else if (!activeSession) {
        fetchSessionDetail(selectedSessionId);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [selectedSessionId, activeSession?.status]);

  // Scroll to bottom of terminal when logs update
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeSession?.logs]);

  // Handle run creation
  const handleStartRun = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requirement.trim()) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requirement, max_attempts: maxAttempts })
      });
      if (!res.ok) throw new Error('Failed to create run session');
      const newSession = await res.json();
      
      setRequirement('');
      setSelectedSessionId(newSession.id);
      setActiveSession(newSession);
      setSelectedFilePath(null);
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
      setSelectedFilePath(null);
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
        setSelectedFilePath(null);
      }
      fetchSessions();
    } catch (err: any) {
      alert('Delete failed');
    }
  };

  const downloadProject = (session: Session) => {
    // Phase 9 download mockup
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'FAILED': return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
      case 'RECEIVED': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      default: return 'bg-violet-500/20 text-violet-400 border-violet-500/30 animate-pulse';
    }
  };

  const getStepStatus = (stepName: string, currentStatus: string) => {
    const currentIndex = STATES_ORDER.indexOf(currentStatus);
    const stepIndex = STATES_ORDER.indexOf(stepName);

    if (currentStatus === 'FAILED') {
      return 'error';
    }
    if (stepIndex < currentIndex) {
      return 'completed';
    }
    if (stepIndex === currentIndex) {
      return 'active';
    }
    return 'pending';
  };

  const parsePlan = (jsonStr: string | null) => {
    if (!jsonStr) return null;
    try {
      return JSON.parse(jsonStr);
    } catch {
      return null;
    }
  };

  const plan = activeSession ? parsePlan(activeSession.plan_json) : null;
  const currentFile = activeSession?.files.find(f => f.path === selectedFilePath);

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100 font-sans overflow-hidden">
      
      {/* SIDEBAR */}
      <div className="w-80 border-r border-gray-800 bg-gray-900/50 backdrop-blur-xl flex flex-col">
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Code2 className="h-6 w-6 text-violet-500" />
            <span className="font-bold text-lg tracking-wider bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">AMASEP</span>
          </div>
          <button 
            onClick={() => { setSelectedSessionId(null); setActiveSession(null); setSelectedFilePath(null); }}
            className="p-1.5 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
            title="Create New Run"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>

        {apiError && (
          <div className="m-3 p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-lg flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>{apiError}</div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          <div className="flex items-center gap-1.5 px-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            <History className="h-3.5 w-3.5" />
            <span>Session History</span>
          </div>
          {sessions.length === 0 ? (
            <div className="text-center py-8 text-sm text-gray-500">No session runs yet</div>
          ) : (
            sessions.map(s => (
              <div
                key={s.id}
                onClick={() => { setSelectedSessionId(s.id); setSelectedFilePath(null); }}
                className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                  selectedSessionId === s.id
                    ? 'bg-violet-600/10 border-violet-500/50 shadow-lg shadow-violet-500/5'
                    : 'bg-gray-900/30 border-gray-800 hover:bg-gray-800/40 hover:border-gray-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium text-sm text-gray-200 line-clamp-1 flex-1">
                    {s.requirement}
                  </span>
                  <button 
                    onClick={(e) => handleDeleteSession(s.id, e)}
                    className="opacity-0 group-hover:opacity-100 hover:text-rose-400 text-gray-500 p-0.5 rounded transition-opacity"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex items-center justify-between mt-2.5">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${getStatusColor(s.status)}`}>
                    {s.status}
                  </span>
                  <span className="text-[10px] text-gray-500">
                    ID: {s.id}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-3 bg-gray-950 border-t border-gray-800 text-[10px] text-gray-500 text-center">
          AMASEP v1.0 • Academic Team Project
        </div>
      </div>

      {/* MAIN CONTAINER */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* TOP BAR */}
        <div className="h-16 border-b border-gray-800 bg-gray-900/20 backdrop-blur-md flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4">
            <h1 className="text-sm font-semibold text-gray-300">
              {activeSession ? `Session Run #${activeSession.id}` : 'Create Development Request'}
            </h1>
            {activeSession && (
              <span className={`text-xs px-2.5 py-0.5 rounded-full border ${getStatusColor(activeSession.status)}`}>
                {activeSession.status}
              </span>
            )}
          </div>
          {activeSession && (
            <div className="flex items-center gap-3">
              {['COMPLETED', 'FAILED'].includes(activeSession.status) && (
                <button
                  onClick={() => handleRetryRun(activeSession.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded-lg transition-colors border border-gray-700"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Re-run Pipeline</span>
                </button>
              )}
              <button
                onClick={() => downloadProject(activeSession)}
                disabled={activeSession.files.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium rounded-lg transition-colors shadow-lg shadow-violet-600/15"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download Assets</span>
              </button>
            </div>
          )}
        </div>

        {/* WORKSPACE CONTENT */}
        <div className="flex-1 overflow-y-auto bg-gray-950">
          {!activeSession ? (
            /* NEW RUN REQUEST PANEL */
            <div className="max-w-2xl mx-auto py-16 px-4">
              <div className="text-center mb-8">
                <div className="inline-flex p-3 bg-violet-500/10 border border-violet-500/20 text-violet-400 rounded-2xl mb-4">
                  <Code2 className="h-8 w-8" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-white">Generate Code Autonomously</h2>
                <p className="mt-2 text-sm text-gray-400">
                  Input your Python project requirements below. AMASEP will orchestrate planning, coding, and Docker-sandboxed verification loops.
                </p>
              </div>

              <form onSubmit={handleStartRun} className="space-y-4">
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 shadow-xl">
                  <label htmlFor="requirement" className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Describe your software requirement
                  </label>
                  <textarea
                    id="requirement"
                    rows={4}
                    value={requirement}
                    onChange={(e) => setRequirement(e.target.value)}
                    placeholder="e.g., Build a command-line student grade calculator that takes a list of scores, calculates statistics (average, max, min), checks boundary limits, and prints a formatted report."
                    className="w-full bg-transparent border-0 resize-none text-sm text-white placeholder-gray-600 focus:ring-0 focus:outline-none"
                    required
                  />
                  <div className="flex items-center justify-between border-t border-gray-800/80 pt-3 mt-2">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500">Max Auto-Corrections:</span>
                      <select
                        value={maxAttempts}
                        onChange={(e) => setMaxAttempts(Number(e.target.value))}
                        className="bg-gray-950 border border-gray-800 text-xs text-gray-300 py-1 px-2.5 rounded-md focus:outline-none"
                      >
                        <option value={1}>1 Attempt (No correction)</option>
                        <option value={2}>2 Attempts</option>
                        <option value={3}>3 Attempts</option>
                      </select>
                    </div>
                    <button
                      type="submit"
                      disabled={loading || !requirement.trim()}
                      className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium text-white rounded-xl shadow-lg shadow-violet-600/10 transition-all"
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4 fill-white" />
                      )}
                      <span>Initialize Run</span>
                    </button>
                  </div>
                </div>
              </form>

              {/* Mock tasks showcase */}
              <div className="mt-12 grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-900/30 border border-gray-800/80 rounded-xl hover:border-gray-800 transition-colors">
                  <h3 className="text-sm font-semibold text-gray-300 mb-1">Calculator Utility</h3>
                  <p className="text-xs text-gray-500">Computes grade averages, finds boundary scores, and validates inputs.</p>
                </div>
                <div className="p-4 bg-gray-900/30 border border-gray-800/80 rounded-xl hover:border-gray-800 transition-colors">
                  <h3 className="text-sm font-semibold text-gray-300 mb-1">Library Manager</h3>
                  <p className="text-xs text-gray-500">Keeps track of books, checkout dates, and computes fine balances.</p>
                </div>
              </div>
            </div>
          ) : (
            /* ACTIVE RUN PIPELINE */
            <div className="h-full flex flex-col">
              
              {/* STATE TRACKING MAP */}
              <div className="p-6 bg-gray-900/10 border-b border-gray-900 flex justify-center items-center overflow-x-auto">
                <div className="flex items-center gap-2">
                  {STATES_ORDER.map((step, idx) => {
                    const stepStatus = getStepStatus(step, activeSession.status);
                    return (
                      <React.Fragment key={step}>
                        {idx > 0 && (
                          <div className={`h-[1px] w-8 ${
                            stepStatus === 'completed' ? 'bg-violet-500' : 'bg-gray-800'
                          }`} />
                        )}
                        <div className="flex flex-col items-center">
                          <div className={`h-7 w-7 rounded-full flex items-center justify-center border text-xs font-semibold ${
                            stepStatus === 'completed'
                              ? 'bg-violet-500/20 border-violet-500 text-violet-400'
                              : stepStatus === 'active'
                              ? 'bg-violet-600 border-violet-500 text-white shadow-lg shadow-violet-500/30 animate-pulse'
                              : stepStatus === 'error'
                              ? 'bg-rose-500/20 border-rose-500 text-rose-400'
                              : 'bg-gray-950 border-gray-800 text-gray-600'
                          }`}>
                            {stepStatus === 'completed' ? '✓' : idx + 1}
                          </div>
                          <span className={`text-[9px] font-medium tracking-wider mt-1.5 uppercase ${
                            stepStatus === 'active' ? 'text-violet-400 font-bold' : 'text-gray-600'
                          }`}>
                            {step.replace('_', ' ')}
                          </span>
                        </div>
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>

              {/* TABS SELECTOR */}
              <div className="flex border-b border-gray-800 bg-gray-900/10 px-6">
                <button
                  onClick={() => setActiveTab('plan')}
                  className={`py-3 px-4 border-b-2 text-xs font-medium tracking-wide uppercase transition-colors ${
                    activeTab === 'plan'
                      ? 'border-violet-500 text-violet-400'
                      : 'border-transparent text-gray-500 hover:text-gray-300'
                  }`}
                >
                  Implementation Plan
                </button>
                <button
                  onClick={() => setActiveTab('code')}
                  className={`py-3 px-4 border-b-2 text-xs font-medium tracking-wide uppercase transition-colors ${
                    activeTab === 'code'
                      ? 'border-violet-500 text-violet-400'
                      : 'border-transparent text-gray-500 hover:text-gray-300'
                  }`}
                >
                  Workspace Editor
                </button>
                <button
                  onClick={() => setActiveTab('logs')}
                  className={`py-3 px-4 border-b-2 text-xs font-medium tracking-wide uppercase transition-colors ${
                    activeTab === 'logs'
                      ? 'border-violet-500 text-violet-400'
                      : 'border-transparent text-gray-500 hover:text-gray-300'
                  }`}
                >
                  Sandbox Terminal
                </button>
              </div>

              {/* TAB CONTENT PANELS */}
              <div className="flex-1 min-h-0">
                {activeTab === 'plan' && (
                  <div className="p-6 max-w-4xl mx-auto space-y-6">
                    {plan ? (
                      <>
                        <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-5">
                          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-2">Project Goal</h3>
                          <p className="text-sm text-gray-400 leading-relaxed">{plan.project_description}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-5">
                            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-3">Functional Specs</h3>
                            <ul className="space-y-2">
                              {plan.functional_requirements.map((req: string, i: number) => (
                                <li key={i} className="text-xs text-gray-400 flex items-start gap-2">
                                  <span className="text-violet-500 font-bold mt-0.5">•</span>
                                  <span>{req}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-5">
                            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-3">Target Files</h3>
                            <ul className="space-y-2">
                              {plan.files_to_create.map((f: any, i: number) => (
                                <li key={i} className="text-xs text-gray-400 flex items-center gap-2">
                                  <FileCode className="h-3.5 w-3.5 text-violet-400" />
                                  <span className="font-mono text-gray-300">{f.path}</span>
                                  <span className="text-gray-600">— {f.description}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-5">
                          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-3">Implementation Plan Steps</h3>
                          <div className="space-y-3">
                            {plan.implementation_steps.map((step: string, i: number) => (
                              <div key={i} className="flex items-center gap-3">
                                <div className="h-5 w-5 rounded-full bg-violet-950 border border-violet-800 text-[10px] text-violet-400 flex items-center justify-center font-mono">
                                  {i + 1}
                                </div>
                                <span className="text-xs text-gray-400">{step}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-20 text-gray-500 text-sm flex flex-col items-center justify-center gap-2">
                        <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
                        <span>Generating architectural implementation plan...</span>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'code' && (
                  <div className="h-full flex min-h-0">
                    {/* File List Panel */}
                    <div className="w-64 border-r border-gray-900 flex flex-col shrink-0 bg-gray-900/10">
                      <div className="p-3 border-b border-gray-900 text-xs font-semibold text-gray-500 flex items-center gap-1.5 uppercase">
                        <FolderOpen className="h-3.5 w-3.5" />
                        <span>Files Explorer</span>
                      </div>
                      <div className="p-2 space-y-1 overflow-y-auto flex-1">
                        {activeSession.files.length === 0 ? (
                          <div className="text-center text-[11px] text-gray-600 py-6">No files created yet</div>
                        ) : (
                          activeSession.files.map(file => (
                            <button
                              key={file.id}
                              onClick={() => setSelectedFilePath(file.path)}
                              className={`w-full flex items-center gap-2 p-2 rounded-lg text-left text-xs font-mono transition-colors ${
                                selectedFilePath === file.path
                                  ? 'bg-violet-950/40 text-violet-400 border border-violet-500/25'
                                  : 'text-gray-400 hover:bg-gray-900/60 border border-transparent'
                              }`}
                            >
                              <FileCode className={`h-4 w-4 ${file.is_test ? 'text-emerald-400' : 'text-sky-400'}`} />
                              <span className="truncate">{file.path}</span>
                            </button>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Code Editor Screen */}
                    <div className="flex-1 flex flex-col min-w-0 bg-gray-950">
                      {currentFile ? (
                        <>
                          <div className="p-2.5 bg-gray-900/30 border-b border-gray-900 text-xs font-mono text-gray-400 flex justify-between items-center px-4">
                            <span>{currentFile.path}</span>
                            <button 
                              onClick={() => navigator.clipboard.writeText(currentFile.content)}
                              className="p-1 hover:bg-gray-800 text-gray-500 hover:text-white rounded"
                              title="Copy Code"
                            >
                              <Clipboard className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <div className="flex-1 overflow-y-auto p-4 font-mono text-xs text-left leading-relaxed">
                            <pre className="text-gray-300 whitespace-pre">
                              <code>
                                {currentFile.content.split('\n').map((line, i) => (
                                  <div key={i} className="table-row">
                                    <span className="table-cell text-gray-700 text-right pr-4 select-none w-8">{i + 1}</span>
                                    <span className="table-cell">{line}</span>
                                  </div>
                                ))}
                              </code>
                            </pre>
                          </div>
                        </>
                      ) : (
                        <div className="flex-grow flex items-center justify-center text-sm text-gray-600">
                          Select a file to inspect its content
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'logs' && (
                  <div className="h-full flex flex-col p-6 min-h-0 max-w-5xl mx-auto">
                    {/* Execution details */}
                    <div className="grid grid-cols-3 gap-4 mb-4 shrink-0">
                      <div className="bg-gray-900/40 border border-gray-800 p-4 rounded-xl flex flex-col">
                        <span className="text-[10px] text-gray-500 uppercase tracking-wide font-medium">Attempt Iteration</span>
                        <span className="text-lg font-semibold text-white mt-1">
                          Attempt {activeSession.current_attempt} / {activeSession.max_attempts}
                        </span>
                      </div>
                      
                      {activeSession.test_results && activeSession.test_results.length > 0 ? (
                        <>
                          <div className="bg-gray-900/40 border border-gray-800 p-4 rounded-xl flex flex-col">
                            <span className="text-[10px] text-gray-500 uppercase tracking-wide font-medium">Passed Assertions</span>
                            <span className="text-lg font-semibold text-emerald-400 mt-1">
                              {activeSession.test_results[activeSession.test_results.length - 1].passed_tests} / {activeSession.test_results[activeSession.test_results.length - 1].total_tests}
                            </span>
                          </div>
                          <div className="bg-gray-900/40 border border-gray-800 p-4 rounded-xl flex flex-col">
                            <span className="text-[10px] text-gray-500 uppercase tracking-wide font-medium">Docker Exit Status</span>
                            <span className="text-lg font-semibold text-white mt-1 flex items-center gap-1.5">
                              {activeSession.test_results[activeSession.test_results.length - 1].passed ? (
                                <>
                                  <CheckCircle className="h-5 w-5 text-emerald-400" />
                                  <span className="text-emerald-400">PASSED</span>
                                </>
                              ) : (
                                <>
                                  <AlertCircle className="h-5 w-5 text-rose-500" />
                                  <span className="text-rose-500">FAILED</span>
                                </>
                              )}
                            </span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="bg-gray-900/40 border border-gray-800 p-4 rounded-xl flex flex-col col-span-2 items-center justify-center text-xs text-gray-600">
                            Waiting for test sandbox execution to start...
                          </div>
                        </>
                      )}
                    </div>

                    {/* Console log outputs */}
                    <div className="flex-1 border border-gray-800 rounded-xl bg-black flex flex-col min-h-0 shadow-inner">
                      <div className="p-3 border-b border-gray-800 text-[10px] font-mono text-gray-500 flex justify-between items-center px-4 shrink-0">
                        <span className="flex items-center gap-1.5">
                          <Terminal className="h-3.5 w-3.5 text-violet-400" />
                          <span>DOCKER TERMINAL stdout/stderr</span>
                        </span>
                      </div>
                      
                      <div className="flex-1 p-4 font-mono text-xs text-left leading-relaxed overflow-y-auto space-y-3">
                        {activeSession.logs.map((log) => (
                          <div key={log.id} className="text-gray-400">
                            <span className="text-violet-500 font-medium mr-2">
                              [{new Date(log.created_at).toLocaleTimeString()}]
                            </span>
                            {log.log_text}
                          </div>
                        ))}
                        
                        {/* Print PyTest stdout if available */}
                        {activeSession.test_results && activeSession.test_results.length > 0 && (
                          <div className="border-t border-gray-800/80 pt-3 mt-3">
                            <div className="text-emerald-500 font-semibold mb-2">&gt;&gt; PyTest Sandbox Runner output:</div>
                            <pre className="text-gray-300 bg-gray-950 p-3 rounded-lg border border-gray-900 whitespace-pre-wrap overflow-x-auto text-[11px]">
                              {activeSession.test_results[activeSession.test_results.length - 1].stdout || "No stdout captured."}
                            </pre>
                          </div>
                        )}
                        
                        <div ref={logsEndRef} />
                      </div>
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}
        </div>

      </div>

    </div>
  );
}
