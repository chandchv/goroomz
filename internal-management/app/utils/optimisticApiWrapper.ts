/**
 * Optimistic API Wrapper
 * 
 * Wraps API calls with optimistic update support
 * Automatically handles loading states and error recovery
 * 
 * Requirements: 16.3
 */

import { apiService } from '../services/api';
import type { AxiosRequestConfig } from 'axios';

export interface OptimisticApiOptions<T> {
  /**
   * Function to update local state optimistically before API call
   */
  optimisticUpdate?: () => void;

  /**
   * Function to revert local state if API call fails
   */
  revertUpdate?: () => void;

  /**
   * Function to update local state with actual API response
   */
  onSuccess?: (data: T) => void;

  /**
   * Function to handle errors
   */
  onError?: (error: Error) => void;

  /**
   * Whether to show loading state (default: true)
   */
  showLoading?: boolean;
}

/**
 * Make an API request with optimistic update support
 */
export async function optimisticApiRequest<T = any>(
  config: AxiosRequestConfig,
  options: OptimisticApiOptions<T> = {}
): Promise<T | null> {
  const {
    optimisticUpdate,
    revertUpdate,
    onSuccess,
    onError,
    showLoading = true,
  } = options;

  try {
    // Apply optimistic update immediately if provided
    if (optimisticUpdate) {
      optimisticUpdate();
    }

    // Make the API call
    const data = await apiService.request<T>(config);

    // Call success handler with actual data
    if (onSuccess) {
      onSuccess(data);
    }

    return data;
  } catch (err) {
    const error = err instanceof Error ? err : new Error('API request failed');

    // Revert optimistic update on error
    if (revertUpdate) {
      revertUpdate();
    }

    // Call error handler
    if (onError) {
      onError(error);
    }

    // Re-throw to allow caller to handle if needed
    throw error;
  }
}

/**
 * Create a loading state manager for components
 */
export class LoadingStateManager {
  private loadingStates: Map<string, boolean> = new Map();
  private listeners: Set<() => void> = new Set();

  /**
   * Set loading state for a key
   */
  setLoading(key: string, loading: boolean): void {
    this.loadingStates.set(key, loading);
    this.notifyListeners();
  }

  /**
   * Get loading state for a key
   */
  isLoading(key: string): boolean {
    return this.loadingStates.get(key) || false;
  }

  /**
   * Check if any operation is loading
   */
  isAnyLoading(): boolean {
    return Array.from(this.loadingStates.values()).some((loading) => loading);
  }

  /**
   * Subscribe to loading state changes
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners of state change
   */
  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener());
  }

  /**
   * Clear all loading states
   */
  clear(): void {
    this.loadingStates.clear();
    this.notifyListeners();
  }
}

/**
 * Global loading state manager instance
 */
export const globalLoadingManager = new LoadingStateManager();

/**
 * Wrapper for API calls with automatic loading state management
 */
export async function apiCallWithLoading<T = any>(
  key: string,
  apiCall: () => Promise<T>,
  options: OptimisticApiOptions<T> = {}
): Promise<T | null> {
  globalLoadingManager.setLoading(key, true);

  try {
    // Apply optimistic update if provided
    if (options.optimisticUpdate) {
      options.optimisticUpdate();
    }

    // Make the API call
    const result = await apiCall();

    // Call success handler
    if (options.onSuccess) {
      options.onSuccess(result);
    }

    return result;
  } catch (err) {
    const error = err instanceof Error ? err : new Error('API call failed');

    // Revert optimistic update on error
    if (options.revertUpdate) {
      options.revertUpdate();
    }

    // Call error handler
    if (options.onError) {
      options.onError(error);
    }

    return null;
  } finally {
    globalLoadingManager.setLoading(key, false);
  }
}
