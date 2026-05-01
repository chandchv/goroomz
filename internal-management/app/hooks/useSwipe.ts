import { useSwipeable, type SwipeableHandlers } from 'react-swipeable';

interface UseSwipeOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number;
}

/**
 * Custom hook for handling swipe gestures on touch devices
 * @param options - Configuration for swipe handlers
 * @returns Swipeable handlers to attach to a component
 */
export function useSwipe(options: UseSwipeOptions): SwipeableHandlers {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    threshold = 50,
  } = options;

  return useSwipeable({
    onSwipedLeft: () => onSwipeLeft?.(),
    onSwipedRight: () => onSwipeRight?.(),
    onSwipedUp: () => onSwipeUp?.(),
    onSwipedDown: () => onSwipeDown?.(),
    delta: threshold,
    preventScrollOnSwipe: false,
    trackMouse: false, // Only track touch, not mouse
  });
}
