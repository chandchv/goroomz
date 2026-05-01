import { useCallback, useRef, useState } from 'react';

interface UseLongPressOptions {
  onLongPress: () => void;
  onClick?: () => void;
  delay?: number;
}

interface LongPressHandlers {
  onMouseDown: (event: React.MouseEvent) => void;
  onMouseUp: (event: React.MouseEvent) => void;
  onMouseLeave: (event: React.MouseEvent) => void;
  onTouchStart: (event: React.TouchEvent) => void;
  onTouchEnd: (event: React.TouchEvent) => void;
}

/**
 * Custom hook for handling long-press gestures
 * @param options - Configuration for long-press behavior
 * @returns Event handlers to attach to a component
 */
export function useLongPress(options: UseLongPressOptions): LongPressHandlers {
  const { onLongPress, onClick, delay = 500 } = options;
  const [longPressTriggered, setLongPressTriggered] = useState(false);
  const timeout = useRef<NodeJS.Timeout | null>(null);
  const target = useRef<EventTarget | null>(null);

  const start = useCallback(
    (event: React.MouseEvent | React.TouchEvent) => {
      if (event.target) {
        target.current = event.target;
      }
      timeout.current = setTimeout(() => {
        onLongPress();
        setLongPressTriggered(true);
      }, delay);
    },
    [onLongPress, delay]
  );

  const clear = useCallback(
    (event: React.MouseEvent | React.TouchEvent, shouldTriggerClick = true) => {
      if (timeout.current) {
        clearTimeout(timeout.current);
      }
      if (shouldTriggerClick && !longPressTriggered && onClick) {
        onClick();
      }
      setLongPressTriggered(false);
    },
    [onClick, longPressTriggered]
  );

  return {
    onMouseDown: (event: React.MouseEvent) => start(event),
    onMouseUp: (event: React.MouseEvent) => clear(event),
    onMouseLeave: (event: React.MouseEvent) => clear(event, false),
    onTouchStart: (event: React.TouchEvent) => start(event),
    onTouchEnd: (event: React.TouchEvent) => clear(event),
  };
}
