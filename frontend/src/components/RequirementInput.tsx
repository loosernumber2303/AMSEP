import { Play, Loader2, Sparkles, UploadCloud } from 'lucide-react';
import React, { useState } from 'react';

interface RequirementInputProps {
  onSubmit: (requirement: string, maxAttempts: number) => Promise<void>;
  onAnalyze: (file: File, gitUrl?: string) => Promise<void>;
  loading: boolean;
}

const PRESETS = [
  "Build a simple temperature converter that accepts Celsius as input and returns Fahrenheit and Kelvin.",
  "Build a simple expense tracker that accepts expenses with category and amount and reports which categories have the highest spending.",
  "Build a simple number utility that accepts a list of integers and returns the maximum, minimum, average, and count of even numbers."
];

export default function RequirementInput({ onSubmit, onAnalyze, loading }: RequirementInputProps) {
  const [mode, setMode] = useState<'new' | 'analyze'>('new');
  const [requirement, setRequirement] = useState('');
  const [maxAttempts, setMaxAttempts] = useState(3);
  
  // Upload project state
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [gitUrl, setGitUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!requirement.trim() || loading) return;
    onSubmit(requirement, maxAttempts);
    setRequirement('');
  };

  const handleAnalyzeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (zipFile) {
      onAnalyze(zipFile, gitUrl || undefined);
    } else if (gitUrl.trim()) {
      // Simulate/mock Git archive url download logic
      // Create empty mock file payload to keep API contract happy if only Git is specified
      const mockFile = new File([new Blob([])], "git_repo.zip", { type: "application/zip" });
      onAnalyze(mockFile, gitUrl);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-12 px-4 animate-fade-in relative">
      
      {/* Background honeycomb visual accent decoration */}
      <div className="absolute -top-6 -right-6 w-32 h-32 honeycomb-bg opacity-10 pointer-events-none rounded-3xl" />
      <div className="absolute -bottom-6 -left-6 w-32 h-32 honeycomb-bg opacity-10 pointer-events-none rounded-3xl" />

      {/* Mode Selector Buttons */}
      <div className="flex justify-center gap-2 mb-8 relative z-10">
        <button
          onClick={() => setMode('new')}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer border ${
            mode === 'new'
              ? 'bg-honey-accent text-honey-bg border-honey-accent shadow-md shadow-honey-accent/15'
              : 'bg-honey-card/50 text-honey-muted border-honey-border hover:bg-honey-sidebar hover:text-honey-text'
          }`}
        >
          New Project
        </button>
        <button
          onClick={() => setMode('analyze')}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer border ${
            mode === 'analyze'
              ? 'bg-honey-accent text-honey-bg border-honey-accent shadow-md shadow-honey-accent/15'
              : 'bg-honey-card/50 text-honey-muted border-honey-border hover:bg-honey-sidebar hover:text-honey-text'
          }`}
        >
          Analyze Existing Project
        </button>
      </div>

      <div className="text-center mb-8 relative z-10">
        <div className="inline-flex p-3 bg-honey-accent/10 border border-honey-accent/20 text-honey-accent rounded-2xl mb-4 shadow-sm">
          <Sparkles className="h-6 w-6 text-honey-accent" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-honey-text">
          {mode === 'new' ? 'From idea to working software.' : 'Analyze Existing Projects & Libraries'}
        </h2>
        <p className="mt-2 text-sm text-honey-muted max-w-lg mx-auto leading-relaxed">
          {mode === 'new' 
            ? 'Input your software requirement in natural language. AMASEP will autonomously plan, write, test in Docker, and refine your codebase.'
            : 'Upload a ZIP directory package or enter a repository URL. Our agent will analyze component code architectures, test coverage, static errors, and security keys.'}
        </p>
      </div>

      {mode === 'new' ? (
        <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
          <div className="bg-honey-card border border-honey-border rounded-2xl p-5 shadow-xl transition-all duration-300 relative overflow-hidden">
            
            <label 
              htmlFor="requirement" 
              className="block text-xs font-semibold text-honey-muted uppercase tracking-wider mb-2.5 text-left"
            >
              Describe your software requirement
            </label>
            
            <textarea
              id="requirement"
              rows={4}
              value={requirement}
              onChange={(e) => setRequirement(e.target.value)}
              placeholder="e.g., Build a command-line student grade calculator that takes a list of scores, calculates statistics (average, max, min), checks boundary limits, and prints a formatted report."
              className="w-full bg-honey-sidebar/15 border border-honey-border rounded-xl p-3 text-sm text-honey-text placeholder-honey-muted/50 focus:border-honey-accent focus:ring-1 focus:ring-honey-accent focus:outline-none transition-all resize-none"
              required
              disabled={loading}
            />
            
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-t border-honey-border/50 pt-4 mt-4 gap-3">
              <div className="flex items-center gap-3">
                <span className="text-xs text-honey-muted font-medium">Max Correction Loops:</span>
                <select
                  value={maxAttempts}
                  onChange={(e) => setMaxAttempts(Number(e.target.value))}
                  disabled={loading}
                  className="bg-honey-card border border-honey-border text-xs text-honey-text py-1 px-2.5 rounded-lg focus:outline-none focus:border-honey-accent cursor-pointer"
                >
                  <option value={1}>1 Loop (No corrections)</option>
                  <option value={2}>2 Loops</option>
                  <option value={3}>3 Loops</option>
                </select>
              </div>
              
              <button
                type="submit"
                disabled={loading || !requirement.trim()}
                className="flex items-center justify-center gap-1.5 px-5 py-2.5 bg-honey-accent hover:bg-honey-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold text-honey-bg rounded-xl shadow-lg shadow-honey-accent/15 transition-all cursor-pointer"
              >
                {loading ? (
                  <Loader2 className="h-4.5 w-4.5 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 fill-current" />
                )}
                <span>Start Development</span>
              </button>
            </div>
          </div>

          {/* Preset Suggestions */}
          <div className="mt-8 relative z-10 animate-fade-in">
            <h3 className="text-xs font-semibold text-honey-muted uppercase tracking-wider text-center mb-3">
              Example Prompts
            </h3>
            <div className="grid gap-3">
              {PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setRequirement(preset)}
                  disabled={loading}
                  className="p-3 text-xs text-left bg-honey-card/50 hover:bg-honey-sidebar border border-honey-border/60 hover:border-honey-border rounded-xl text-honey-muted hover:text-honey-text transition-all duration-200 cursor-pointer shadow-sm"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>
        </form>
      ) : (
        <form onSubmit={handleAnalyzeSubmit} className="space-y-4 relative z-10 animate-fade-in">
          <div className="bg-honey-card border border-honey-border rounded-2xl p-5 shadow-xl transition-all duration-300 relative overflow-hidden space-y-4">
            
            {/* Drag & Drop ZIP Area */}
            <div className="border-2 border-dashed border-honey-border hover:border-honey-accent/60 rounded-2xl p-6 text-center cursor-pointer transition-all bg-honey-sidebar/5 relative">
              <input
                type="file"
                accept=".zip"
                disabled={loading}
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    setZipFile(e.target.files[0]);
                  }
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              />
              <UploadCloud className="h-8 w-8 text-honey-muted mx-auto mb-2" />
              <span className="text-xs text-honey-text font-bold block">
                {zipFile ? zipFile.name : 'Upload Project ZIP archive'}
              </span>
              <span className="text-[10px] text-honey-muted mt-1 block">
                Select your package folder zipped archive file (.zip)
              </span>
            </div>

            {/* Git Repository Input */}
            <div className="flex flex-col text-left">
              <label className="text-xs font-semibold text-honey-muted uppercase tracking-wider mb-1.5">
                or Git Repository URL
              </label>
              <input
                type="text"
                placeholder="https://github.com/username/repository.git"
                value={gitUrl}
                onChange={(e) => setGitUrl(e.target.value)}
                disabled={loading}
                className="w-full bg-honey-sidebar/15 border border-honey-border rounded-xl p-3 text-xs text-honey-text placeholder-honey-muted/50 focus:border-honey-accent focus:outline-none transition-all"
              />
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading || (!zipFile && !gitUrl.trim())}
              className="w-full flex items-center justify-center gap-1.5 px-5 py-2.5 bg-honey-accent hover:bg-honey-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold text-honey-bg rounded-xl shadow-lg shadow-honey-accent/15 transition-all cursor-pointer"
            >
              {loading ? (
                <Loader2 className="h-4.5 w-4.5 animate-spin" />
              ) : (
                <Play className="h-4 w-4 fill-current" />
              )}
              <span>Analyze Project</span>
            </button>
          </div>

          {/* Self-Analysis Quick Button */}
          <div className="mt-8 animate-fade-in text-center">
            <span className="text-[10px] font-semibold text-honey-muted uppercase block mb-2">Recommended Demonstration</span>
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                // Mock a self-analysis ZIP upload
                const blob = new Blob(["mock"], { type: "application/zip" });
                const selfFile = new File([blob], "amasep_self_source.zip", { type: "application/zip" });
                onAnalyze(selfFile, "Self-Analysis of AMASEP");
              }}
              className="px-4 py-2 border border-honey-accent/30 bg-honey-accent/10 hover:bg-honey-accent text-honey-accent hover:text-honey-bg text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm"
            >
              Run AMASEP Self-Analysis
            </button>
          </div>
        </form>
      )}

    </div>
  );
}
