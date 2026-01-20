import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { apiClient, type BackendStatus, type StatusEvent } from '@/services/apiClient';

interface BackendStatusContextValue {
  status: BackendStatus;
  isWakingUp: boolean;
  isOnline: boolean;
  isOffline: boolean;
  isUnknown: boolean;
  attempt: number | null;
  maxAttempts: number | null;
  elapsedMs: number | null;
  message: string | null;
  checkHealth: () => Promise<boolean>;
}

const BackendStatusContext = createContext<BackendStatusContextValue | null>(null);

export function BackendStatusProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<BackendStatus>('unknown');
  const [attempt, setAttempt] = useState<number | null>(null);
  const [maxAttempts, setMaxAttempts] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = apiClient.subscribe((event: StatusEvent) => {
      setStatus(event.status);
      setMessage(event.message ?? null);
      setAttempt(event.attempt ?? null);
      setMaxAttempts(event.maxAttempts ?? null);
      setElapsedMs(event.elapsedMs ?? null);
    });

    // Initial health check
    apiClient.checkHealth();

    return () => {
      unsubscribe();
    };
  }, []);

  const checkHealth = useCallback(async () => {
    return apiClient.checkHealth();
  }, []);

  const value: BackendStatusContextValue = {
    status,
    isWakingUp: status === 'waking_up',
    isOnline: status === 'online',
    isOffline: status === 'offline',
    isUnknown: status === 'unknown',
    attempt,
    maxAttempts,
    elapsedMs,
    message,
    checkHealth,
  };

  return (
    <BackendStatusContext.Provider value={value}>
      {children}
    </BackendStatusContext.Provider>
  );
}

export function useBackendStatus(): BackendStatusContextValue {
  const context = useContext(BackendStatusContext);
  if (!context) {
    throw new Error('useBackendStatus must be used within a BackendStatusProvider');
  }
  return context;
}
