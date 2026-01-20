import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosError } from 'axios';

export type BackendStatus = 'unknown' | 'online' | 'waking_up' | 'offline';

export interface StatusEvent {
  status: BackendStatus;
  message?: string;
  attempt?: number;
  maxAttempts?: number;
  elapsedMs?: number;
}

type StatusListener = (event: StatusEvent) => void;

// Configuration
const PROBE_TIMEOUT_MS = 5000;        // First request: 5s timeout to detect cold start
const WAKEUP_TIMEOUT_MS = 90000;      // During wake-up: 90s timeout per request
const WAKEUP_MAX_ATTEMPTS = 30;       // Max retry attempts during wake-up
const WAKEUP_RETRY_DELAY_MS = 3000;   // Delay between retries
const HEALTH_CHECK_INTERVAL_MS = 30000; // Health check every 30s when online

class ApiClient {
  private axios: AxiosInstance;
  private status: BackendStatus = 'unknown';
  private listeners: Set<StatusListener> = new Set();
  private wakeupStartTime: number | null = null;
  private healthCheckTimer: ReturnType<typeof setInterval> | null = null;
  private isFirstRequest = true;

  constructor() {
    this.axios = axios.create({
      baseURL: '/api/v1',
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  // Subscribe to status changes
  subscribe(listener: StatusListener): () => void {
    this.listeners.add(listener);
    // Immediately notify of current status
    listener({ status: this.status });
    return () => this.listeners.delete(listener);
  }

  private emit(event: StatusEvent) {
    this.status = event.status;
    this.listeners.forEach(listener => listener(event));
  }

  private setOnline() {
    this.wakeupStartTime = null;
    this.emit({ status: 'online', message: 'Backend is online' });
    this.startHealthCheck();
  }

  private setOffline(message: string) {
    this.wakeupStartTime = null;
    this.stopHealthCheck();
    this.emit({ status: 'offline', message });
  }

  private setWakingUp(attempt: number, elapsedMs: number) {
    this.emit({
      status: 'waking_up',
      message: 'Backend is waking up...',
      attempt,
      maxAttempts: WAKEUP_MAX_ATTEMPTS,
      elapsedMs,
    });
  }

  private startHealthCheck() {
    this.stopHealthCheck();
    this.healthCheckTimer = setInterval(() => {
      this.checkHealth().catch(() => {
        // Health check failed - will be handled by the request logic
      });
    }, HEALTH_CHECK_INTERVAL_MS);
  }

  private stopHealthCheck() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }

  // Check if error indicates a hard failure (server truly down vs cold start)
  private isHardFailure(error: AxiosError): boolean {
    // Network errors that indicate server is truly unreachable
    if (!error.response) {
      const code = error.code;
      // DNS failure, connection refused, etc.
      if (code === 'ENOTFOUND' || code === 'ECONNREFUSED' || code === 'ERR_NETWORK') {
        return true;
      }
      // For timeout errors (ECONNABORTED), it could be cold start
      return false;
    }
    // Server errors like 502, 503, 504 could indicate cold start on platform
    if (error.response.status >= 502 && error.response.status <= 504) {
      return false; // Could be cold start
    }
    // Other server errors are hard failures
    if (error.response.status >= 500) {
      return true;
    }
    return false;
  }

  // Check if error is a timeout (potential cold start)
  private isTimeoutError(error: AxiosError): boolean {
    return error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT';
  }

  // Check if error could indicate cold start
  private couldBeColdStart(error: AxiosError): boolean {
    if (this.isTimeoutError(error)) return true;
    if (!error.response) return false;
    // 502/503/504 from reverse proxy often means backend is starting
    return error.response.status >= 502 && error.response.status <= 504;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Health check endpoint
  async checkHealth(): Promise<boolean> {
    try {
      await this.axios.get('/stats', { timeout: PROBE_TIMEOUT_MS });
      if (this.status !== 'online') {
        this.setOnline();
      }
      return true;
    } catch (error) {
      if (this.status === 'online') {
        // Was online, now failing - could be temporary
        this.emit({ status: 'unknown', message: 'Checking backend status...' });
      }
      return false;
    }
  }

  // Main request method with cold start handling
  async request<T>(config: AxiosRequestConfig): Promise<T> {
    // First request uses probe timeout to detect cold start quickly
    const isProbe = this.isFirstRequest || this.status === 'unknown';
    this.isFirstRequest = false;

    try {
      const timeout = isProbe ? PROBE_TIMEOUT_MS : (
        this.status === 'waking_up' ? WAKEUP_TIMEOUT_MS : PROBE_TIMEOUT_MS
      );

      const response = await this.axios.request<T>({
        ...config,
        timeout,
      });

      // Success - backend is online
      if (this.status !== 'online') {
        this.setOnline();
      }

      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;

      // Hard failure - backend is truly down
      if (this.isHardFailure(axiosError)) {
        this.setOffline('Backend is currently unavailable');
        throw error;
      }

      // Could be cold start - enter wake-up mode
      if (this.couldBeColdStart(axiosError)) {
        return this.handleColdStart<T>(config);
      }

      // Other errors (4xx, etc.) - pass through
      throw error;
    }
  }

  private async handleColdStart<T>(config: AxiosRequestConfig): Promise<T> {
    this.wakeupStartTime = Date.now();

    for (let attempt = 1; attempt <= WAKEUP_MAX_ATTEMPTS; attempt++) {
      const elapsedMs = Date.now() - this.wakeupStartTime;
      this.setWakingUp(attempt, elapsedMs);

      try {
        const response = await this.axios.request<T>({
          ...config,
          timeout: WAKEUP_TIMEOUT_MS,
        });

        // Success - backend woke up
        this.setOnline();
        return response.data;
      } catch (error) {
        const axiosError = error as AxiosError;

        // Hard failure during wake-up - give up
        if (this.isHardFailure(axiosError)) {
          this.setOffline('Backend failed to start');
          throw error;
        }

        // Still timing out or getting 5xx - continue retrying
        if (attempt < WAKEUP_MAX_ATTEMPTS) {
          await this.sleep(WAKEUP_RETRY_DELAY_MS);
        }
      }
    }

    // Exhausted retries
    this.setOffline('Backend did not respond after multiple attempts');
    throw new Error('Backend wake-up timeout exceeded');
  }

  // Convenience methods
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'GET', url });
  }

  async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'POST', url, data });
  }

  async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'PUT', url, data });
  }

  async patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'PATCH', url, data });
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'DELETE', url });
  }

  getStatus(): BackendStatus {
    return this.status;
  }

  // Cleanup
  destroy() {
    this.stopHealthCheck();
    this.listeners.clear();
  }
}

// Singleton instance
export const apiClient = new ApiClient();

export default apiClient;
