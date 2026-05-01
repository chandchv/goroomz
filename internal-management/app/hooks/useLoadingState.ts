/**
 * Loading State Hook
 * 
 * Hook to access global loading state manager
 * Provides loading indicators for API operations
 */

import { useState, useEffect } from 'react';
import { globalLoadingManager } from '../utils/optimisticApiWrapper';

/**
 * Hook to check if a specific operation is loading
 */
export function useLoadingState(key: string): boolean {
  const [isLoading, setIsLoading] = useState(
    globalLoadingManager.isLoading(key)
  );

  useEffect(() => {
    const unsubscribe = globalLoadingManager.subscribe(() => {
      setIsLoading(globalLoadingManager.isLoading(key));
    });

    return unsubscribe;
  }, [key]);

  return isLoading;
}

/**
 * Hook to check if any operation is loading
 */
export function useAnyLoading(): boolean {
  const [isLoading, setIsLoading] = useState(
    globalLoadingManager.isAnyLoading()
  );

  useEffect(() => {
    const unsubscribe = globalLoadingManager.subscribe(() => {
      setIsLoading(globalLoadingManager.isAnyLoading());
    });

    return unsubscribe;
  }, []);

  return isLoading;
}
