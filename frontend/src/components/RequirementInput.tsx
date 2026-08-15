import { Play, Loader2, Sparkles } from 'lucide-react';
import React, { useState } from 'react';

interface RequirementInputProps {
  onSubmit: (requirement: string, maxAttempts: number) => Promise<void>;
  loading: boolean;
}

const PRESETS = [
  "Build student grade calculator with statistical reports and error validations.",
  "Create library manager that logs borrowed books and tracks overdue fine balances.",
  "Write an expense tracker utility summarizing monthly outlays by categories."
];

export default function RequirementInput({ onSubmit, loading }: RequirementInputProps) {
  const [requirement, setRequirement] = useState('');
  const [maxAttempts, setMaxAttempts] = useState(3);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!requirement.trim() || loading) return;
    onSubmit(requirement, maxAttempts);
    setRequirement('');
  };

  return (
    <div className="max-w-2xl mx-auto py-12 px-4 animate-fade-in">
      <div className="text-center mb-8">
        <div className="inline-flex p-3 bg-green-accent/10 border border-green-accent/20 text-green-accent rounded-2xl mb-4">
          <Sparkles className="h-6 w-6 text-green-accent" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-green-text">
          From idea to working software.
        </h2>
        <p className="mt-2 text-sm text-green-muted max-w-lg mx-auto">
          Input your software requirement in natural language. AMASEP will autonomously plan, write, test in Docker, and refine your codebase.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-green-card border border-green-border rounded-2xl p-5 shadow-xl transition-all duration-300">
          <label 
            htmlFor="requirement" 
            className="block text-xs font-semibold text-green-muted uppercase tracking-wider mb-2.5 text-left"
          >
            Describe your software requirement
          </label>
          <textarea
            id="requirement"
            rows={4}
            value={requirement}
            onChange={(e) => setRequirement(e.target.value)}
            placeholder="e.g., Build a command-line student grade calculator that takes a list of scores, calculates statistics (average, max, min), checks boundary limits, and prints a formatted report."
            className="w-full bg-green-sidebar/40 border border-green-border rounded-xl p-3 text-sm text-green-text placeholder-green-muted/50 focus:border-green-accent focus:ring-1 focus:ring-green-accent focus:outline-none transition-all resize-none"
            required
            disabled={loading}
          />
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-t border-green-border/50 pt-4 mt-4 gap-3">
            <div className="flex items-center gap-3">
              <span className="text-xs text-green-muted font-medium">Max Correction Loops:</span>
              <select
                value={maxAttempts}
                onChange={(e) => setMaxAttempts(Number(e.target.value))}
                disabled={loading}
                className="bg-green-card border border-green-border text-xs text-green-text py-1 px-2.5 rounded-lg focus:outline-none focus:border-green-accent"
              >
                <option value={1}>1 Loop (No corrections)</option>
                <option value={2}>2 Loops</option>
                <option value={3}>3 Loops</option>
              </select>
            </div>
            
            <button
              type="submit"
              disabled={loading || !requirement.trim()}
              className="flex items-center justify-center gap-1.5 px-5 py-2.5 bg-green-accent hover:bg-green-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium text-green-bg rounded-xl shadow-lg transition-all"
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
      </form>

      {/* Preset Suggestions */}
      <div className="mt-8">
        <h3 className="text-xs font-semibold text-green-muted uppercase tracking-wider text-center mb-3">
          Example Prompts
        </h3>
        <div className="grid gap-3">
          {PRESETS.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => setRequirement(preset)}
              disabled={loading}
              className="p-3 text-xs text-left bg-green-card/50 hover:bg-green-sidebar border border-green-border/60 hover:border-green-border rounded-xl text-green-muted hover:text-green-text transition-all duration-200"
            >
              {preset}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
