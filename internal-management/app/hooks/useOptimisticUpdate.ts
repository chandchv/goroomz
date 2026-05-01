/**
 * Optimistic Update Hook
 * 
 * Provides optimistic UI updates that immediately reflect user actions
 * and revert if the API call fails
 * 
 * Requirements: 16.3
 */

import { useState, useCallback } from 'react';

export interface OptimisticUpdateOptions<T> {
  onSuccess?: (result: T) => void;
  onError?: (error: Error) => void;
  onRevert?: () => void;
}

export function useOptimisticUpdate<T = any>() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Execute an optimistic update
   * 
   * @param optimisticUpdate - Function to update UI immediately
   * @param apiCall - Async function that makes the API call
   * @param revertUpdate - Function to revert the UI update if API call fails
   * @param options - Optional callbacks for success/error/revert
   */
  const execute = useCallback(
    async <TResult = T>(
      optimisticUpdate: () => void,
      apiCall: () => Promise<TResult>,
      revertUpdate: () => void,
      options?: OptimisticUpdateOptions<TResult>
    ): Promise<TResult | null> => {
      setIsLoading(true);
      setError(null);

      // Apply optimistic update immediately
      optimisticUpdate();

      try {
        // Make the API call
        const result = await apiCall();
        
        setIsLoading(false);
        
        // Call success callback if provided
        if (options?.onSuccess) {
          options.onSuccess(result);
        }

        return result;
      } catch (err) {
        setIsLoading(false);
        
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);

        // Revert the optimistic update
        revertUpdate();
        
        // Call revert callback if provided
        if (options?.onRevert) {
          options.onRevert();
        }

        // Call error callback if provided
        if (options?.onError) {
          options.onError(error);
        }

        return null;
      }
    },
    []
  );

  return {
    execute,
    isLoading,
    error,
  };
}

/**
 * Hook for managing optimistic state updates
 * Useful for list operations (add, update, delete)
 */
export function useOptimisticState<T>(initialState: T[]) {
  const [state, setState] = useState<T[]>(initialState);
  const [originalState, setOriginalState] = useState<T[]>(initialState);
  const { execute, isLoading, error } = useOptimisticUpdate();

  /**
   * Add an item optimistically
   */
  const addOptimistic = useCallback(
    async (
      item: T,
      apiCall: () => Promise<T>,
      options?: OptimisticUpdateOptions<T>
    ) => {
      return execute(
        () => {
          setOriginalState(state);
          setState((prev) => [...prev, item]);
        },
        apiCall,
        () => {
          setState(originalState);
        },
        {
          ...options,
          onSuccess: (result) => {
            // Update with the actual result from API
            setState((prev) => {
              const index = prev.indexOf(item);
              if (index !== -1) {
                const newState = [...prev];
                newState[index] = result;
                return newState;
              }
              return prev;
            });
            options?.onSuccess?.(result);
          },
        }
      );
    },
    [state, originalState, execute]
  );

  /**
   * Update an item optimistically
   */
  const updateOptimistic = useCallback(
    async (
      predicate: (item: T) => boolean,
      updatedItem: T,
      apiCall: () => Promise<T>,
      options?: OptimisticUpdateOptions<T>
    ) => {
      return execute(
        () => {
          setOriginalState(state);
          setState((prev) =>
            prev.map((item) => (predicate(item) ? updatedItem : item))
          );
        },
        apiCall,
        () => {
          setState(originalState);
        },
        {
          ...options,
          onSuccess: (result) => {
            // Update with the actual result from API
            setState((prev) =>
              prev.map((item) => (predicate(item) ? result : item))
            );
            options?.onSuccess?.(result);
          },
        }
      );
    },
    [state, originalState, execute]
  );

  /**
   * Delete an item optimistically
   */
  const deleteOptimistic = useCallback(
    async (
      predicate: (item: T) => boolean,
      apiCall: () => Promise<void>,
      options?: OptimisticUpdateOptions<void>
    ) => {
      return execute(
        () => {
          setOriginalState(state);
          setState((prev) => prev.filter((item) => !predicate(item)));
        },
        apiCall,
        () => {
          setState(originalState);
        },
        options
      );
    },
    [state, originalState, execute]
  );

  /**
   * Reset state to a new value
   */
  const resetState = useCallback((newState: T[]) => {
    setState(newState);
    setOriginalState(newState);
  }, []);

  return {
    state,
    setState: resetState,
    addOptimistic,
    updateOptimistic,
    deleteOptimistic,
    isLoading,
    error,
  };
}
