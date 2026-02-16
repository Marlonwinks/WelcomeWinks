import { useEffect, useRef } from 'react';

/**
 * Custom hook for making screen reader announcements
 * Creates a live region that announces changes to screen readers
 */
export const useScreenReaderAnnouncement = () => {
  const announcementRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Create the live region element if it doesn't exist
    if (!announcementRef.current) {
      const liveRegion = document.createElement('div');
      liveRegion.setAttribute('role', 'status');
      liveRegion.setAttribute('aria-live', 'polite');
      liveRegion.setAttribute('aria-atomic', 'true');
      liveRegion.className = 'sr-only'; // Visually hidden but accessible to screen readers
      liveRegion.style.position = 'absolute';
      liveRegion.style.left = '-10000px';
      liveRegion.style.width = '1px';
      liveRegion.style.height = '1px';
      liveRegion.style.overflow = 'hidden';
      document.body.appendChild(liveRegion);
      announcementRef.current = liveRegion;
    }

    // Cleanup on unmount
    return () => {
      if (announcementRef.current && document.body.contains(announcementRef.current)) {
        document.body.removeChild(announcementRef.current);
        announcementRef.current = null;
      }
    };
  }, []);

  const announce = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (announcementRef.current) {
      // Update aria-live priority
      announcementRef.current.setAttribute('aria-live', priority);
      
      // Clear and set new message
      announcementRef.current.textContent = '';
      setTimeout(() => {
        if (announcementRef.current) {
          announcementRef.current.textContent = message;
        }
      }, 100);
    }
  };

  return { announce };
};

/**
 * Component version of the screen reader announcement
 * Can be used directly in JSX
 */
export const ScreenReaderAnnouncement: React.FC<{
  message: string;
  priority?: 'polite' | 'assertive';
}> = ({ message, priority = 'polite' }) => {
  return (
    <div
      role="status"
      aria-live={priority}
      aria-atomic="true"
      className="sr-only"
      style={{
        position: 'absolute',
        left: '-10000px',
        width: '1px',
        height: '1px',
        overflow: 'hidden',
      }}
    >
      {message}
    </div>
  );
};
