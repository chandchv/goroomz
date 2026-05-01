import { useState, useEffect } from 'react';

/**
 * Custom hook to monitor online/offline status
 * Uses navigator.onLine and listens to online/offline events
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    // Handler for when connection is restored
    const handleOnline = () => {
      console.log('Connection restored');
      setIsOnline(true);
    };

    // Handler for when connection is lost
    const handleOffline = () => {
      console.log('Connection lost');
      setIsOnline(false);
    };

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cleanup event listeners on unmount
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
