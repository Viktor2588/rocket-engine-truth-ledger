import { useEffect, useState } from 'react';
import { useBackendStatus } from '@/context/BackendStatusContext';
import { Loader2, WifiOff, CheckCircle2 } from 'lucide-react';

export function BackendStatusIndicator() {
  const { status, isWakingUp, isOffline, attempt, maxAttempts, elapsedMs } = useBackendStatus();
  const [showOnline, setShowOnline] = useState(false);
  const [prevStatus, setPrevStatus] = useState(status);

  // Show brief "online" banner when transitioning from waking_up/offline to online
  useEffect(() => {
    if (prevStatus !== 'online' && status === 'online' && prevStatus !== 'unknown') {
      setShowOnline(true);
      const timer = setTimeout(() => setShowOnline(false), 3000);
      return () => clearTimeout(timer);
    }
    setPrevStatus(status);
  }, [status, prevStatus]);

  // Format elapsed time
  const formatElapsed = (ms: number | null) => {
    if (ms === null) return '';
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  // Calculate progress percentage
  const progressPercent = attempt && maxAttempts
    ? Math.min((attempt / maxAttempts) * 100, 100)
    : 0;

  // Don't show anything in normal "online" or "unknown" state
  if (!isWakingUp && !isOffline && !showOnline) {
    return null;
  }

  return (
    <div
      className={`
        fixed top-0 left-0 right-0 z-50
        animate-slideDown
        ${isWakingUp ? 'bg-amber-500' : ''}
        ${isOffline ? 'bg-red-500' : ''}
        ${showOnline ? 'bg-green-500 animate-slideUp' : ''}
      `}
    >
      <div className="max-w-7xl mx-auto px-4 py-2">
        <div className="flex items-center justify-center gap-3 text-white text-sm font-medium">
          {isWakingUp && (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Backend is waking up...</span>
              {attempt && maxAttempts && (
                <span className="opacity-80">
                  (attempt {attempt}/{maxAttempts})
                </span>
              )}
              {elapsedMs !== null && (
                <span className="opacity-80">
                  • {formatElapsed(elapsedMs)}
                </span>
              )}
            </>
          )}

          {isOffline && (
            <>
              <WifiOff className="h-4 w-4" />
              <span>Backend is currently unavailable</span>
              <button
                onClick={() => window.location.reload()}
                className="ml-2 px-2 py-0.5 bg-white/20 hover:bg-white/30 rounded text-xs transition-colors"
              >
                Retry
              </button>
            </>
          )}

          {showOnline && (
            <>
              <CheckCircle2 className="h-4 w-4" />
              <span>Backend is online</span>
            </>
          )}
        </div>

        {/* Progress bar for waking up state */}
        {isWakingUp && (
          <div className="mt-2 h-1 bg-amber-600/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-white/80 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
