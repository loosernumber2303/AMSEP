import { Play, Loader2, Sparkles } from 'lucide-react';
import React, { useState } from 'react';

interface RequirementInputProps {
  onSubmit: (requirement: string, maxAttempts: number) => Promise<void>;
  loading: boolean;
}

const PRESETS = [
  "Build a simple temperature converter that accepts Celsius as input and returns Fahrenheit and Kelvin.",
  "Build a simple expense tracker that accepts expenses with category and amount and reports which categories have the highest spending.",
  "Build a simple number utility that accepts a list of integers and returns the maximum, minimum, average, and count of even numbers."
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
    <div className="max-w-2xl mx-auto py-12 px-4 animate-fade-in relative">
      
      {/* Background honeycomb visual accent decoration */}
      <div className="absolute -top-6 -right-6 w-32 h-32 honeycomb-bg opacity-10 pointer-events-none rounded-3xl" />
      <div className="absolute -bottom-6 -left-6 w-32 h-32 honeycomb-bg opacity-10 pointer-events-none rounded-3xl" />

      <div className="text-center mb-8 relative z-10">
        <div className="inline-flex p-3 bg-honey-accent/10 border border-honey-accent/20 text-honey-accent rounded-2xl mb-4 shadow-sm">
          <Sparkles className="h-6 w-6 text-honey-accent" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-honey-text">
          From idea to working software.
        </h2>
        <p className="mt-2 text-sm text-honey-muted max-w-lg mx-auto leading-relaxed">
          Input your software requirement in natural language. AMASEP will autonomously plan, write, test in Docker, and refine your codebase.
        </p>
      </div>

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
      </form>

      {/* Preset Suggestions */}
      <div className="mt-8 relative z-10">
        <h3 className="text-xs font-semibold text-honey-muted uppercase tracking-wider text-center mb-3">
          Example Prompts
        </h3>
        <div className="grid gap-3">
          {PRESETS.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => setRequirement(preset)}
              disabled={loading}
              className="p-3 text-xs text-left bg-honey-card/50 hover:bg-honey-sidebar border border-honey-border/60 hover:border-honey-border rounded-xl text-honey-muted hover:text-honey-text transition-all duration-200 cursor-pointer shadow-sm"
            >
              {preset}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
