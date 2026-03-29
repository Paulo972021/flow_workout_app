import { useState, useEffect, useRef } from "react";
import { Timer, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function RestTimer({ seconds, onComplete }) {
  const [remaining, setRemaining] = useState(seconds);
  const [running, setRunning] = useState(true);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          setRunning(false);
          onComplete?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [running]);

  const progress = ((seconds - remaining) / seconds) * 100;
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;

  return (
    <div className="flex items-center gap-2 bg-primary/10 border border-primary/30 rounded-xl px-3 py-2 mt-2">
      {/* Circle progress */}
      <div className="relative w-10 h-10 shrink-0">
        <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="3" className="text-primary/20" />
          <circle
            cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="3"
            className="text-primary transition-all duration-1000"
            strokeDasharray={`${progress} 100`}
            strokeLinecap="round"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-primary">
          {mins > 0 ? `${mins}:${String(secs).padStart(2, "0")}` : secs}
        </span>
      </div>

      <div className="flex-1">
        <p className="text-xs font-semibold text-primary">
          {running ? "Descansando..." : "Pronto!"}
        </p>
        <p className="text-xs text-muted-foreground">
          {mins > 0 ? `${mins}min ${secs}s` : `${remaining}s`} restantes
        </p>
      </div>

      <div className="flex gap-1">
        {running && (
          <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg"
            onClick={() => { clearInterval(intervalRef.current); setRunning(false); onComplete?.(); }}>
            <Check className="w-3.5 h-3.5 text-primary" />
          </Button>
        )}
        <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg"
          onClick={() => { clearInterval(intervalRef.current); onComplete?.(); }}>
          <X className="w-3.5 h-3.5 text-muted-foreground" />
        </Button>
      </div>
    </div>
  );
}