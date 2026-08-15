import ThemeToggle from './ThemeToggle';
import TortoiseMascot from './TortoiseMascot';
import { ShieldCheck, ShieldAlert } from 'lucide-react';
import { useState, useEffect } from 'react';

interface HeaderProps {
  onLogoClick: () => void;
}

export default function Header({ onLogoClick }: HeaderProps) {
  const [backendStatus, setBackendStatus] = useState<'ok' | 'error' | 'loading'>('loading');

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/health');
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'ok') {
            setBackendStatus('ok');
            return;
          }
        }
        setBackendStatus('error');
      } catch (err) {
        setBackendStatus('error');
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-16 border-b border-green-border bg-green-card/85 backdrop-blur-md flex items-center justify-between px-6 shrink-0 transition-all duration-300">
      <div 
        onClick={onLogoClick}
        className="flex items-center gap-2.5 cursor-pointer group"
      >
        <TortoiseMascot isMoving={false} className="w-8 h-8 group-hover:scale-110 transition-transform duration-300" />
        <div className="text-left">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-base tracking-wider bg-gradient-to-r from-green-accent to-emerald-500 bg-clip-text text-transparent">
              AMASEP
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.25 bg-green-accent/10 text-green-accent border border-green-accent/25 rounded-md">
              v1.0
            </span>
          </div>
          <p className="text-[10px] text-green-muted font-medium">
            Autonomous Software Engine
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Backend health status pill */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-green-border bg-green-sidebar text-[11px] font-medium">
          {backendStatus === 'loading' && (
            <>
              <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-green-muted">Connecting...</span>
            </>
          )}
          {backendStatus === 'ok' && (
            <>
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-green-text">Sandbox Active</span>
            </>
          )}
          {backendStatus === 'error' && (
            <>
              <ShieldAlert className="h-3.5 w-3.5 text-rose-500" />
              <span className="text-rose-500 font-semibold">Sandbox Offline</span>
            </>
          )}
        </div>

        <ThemeToggle />
      </div>
    </header>
  );
}
