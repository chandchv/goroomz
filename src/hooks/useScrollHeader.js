import { useState, useEffect } from 'react';

const useScrollHeader = (threshold = 50) => {
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [isFloatingSearchVisible, setIsFloatingSearchVisible] = useState(false);
  const [scrollDirection, setScrollDirection] = useState('down');

  useEffect(() => {
    let lastScrollY = window.pageYOffset;
    let ticking = false;

    const updateScrollDirection = () => {
      const scrollY = window.pageYOffset;
      
      // Determine scroll direction
      const direction = scrollY > lastScrollY ? 'down' : 'up';
      setScrollDirection(direction);
      
      // Hide header when scrolling down past threshold
      if (scrollY > threshold && direction === 'down') {
        setIsHeaderVisible(false);
        setIsFloatingSearchVisible(true);
      }
      // Show header when scrolling up or at top
      else if (scrollY <= threshold || direction === 'up') {
        setIsHeaderVisible(true);
        setIsFloatingSearchVisible(false);
      }

      lastScrollY = scrollY > 0 ? scrollY : 0;
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(updateScrollDirection);
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });

    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);

  return {
    isHeaderVisible,
    isFloatingSearchVisible,
    scrollDirection,
    setIsFloatingSearchVisible
  };
};

export default useScrollHeader;
