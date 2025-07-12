import { useEffect, useRef } from 'react';

/**
 * Hook for accessibility utilities like focus management and screen reader announcements
 */
export function useAccessibility() {
  const announceRef = useRef<HTMLDivElement | null>(null);

  // Initialize screen reader announcement area
  useEffect(() => {
    if (!announceRef.current) {
      const announceEl = document.createElement('div');
      announceEl.setAttribute('aria-live', 'polite');
      announceEl.setAttribute('aria-atomic', 'true');
      announceEl.setAttribute('id', 'screen-reader-announcements');
      announceEl.style.position = 'absolute';
      announceEl.style.left = '-10000px';
      announceEl.style.width = '1px';
      announceEl.style.height = '1px';
      announceEl.style.overflow = 'hidden';
      document.body.appendChild(announceEl);
      announceRef.current = announceEl;
    }

    return () => {
      if (announceRef.current && document.body.contains(announceRef.current)) {
        document.body.removeChild(announceRef.current);
      }
    };
  }, []);

  // Announce message to screen readers
  const announce = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (announceRef.current) {
      announceRef.current.setAttribute('aria-live', priority);
      announceRef.current.textContent = message;
      
      // Clear after announcing to allow for repeat announcements
      setTimeout(() => {
        if (announceRef.current) {
          announceRef.current.textContent = '';
        }
      }, 1000);
    }
  };

  // Focus management
  const focusElement = (selector: string) => {
    const element = document.querySelector(selector) as HTMLElement;
    if (element) {
      element.focus();
    }
  };

  const focusFirstError = () => {
    const firstError = document.querySelector('[aria-invalid="true"], .error, .alert-error') as HTMLElement;
    if (firstError) {
      firstError.focus();
    }
  };

  const trapFocus = (containerElement: HTMLElement) => {
    const focusableElements = containerElement.querySelectorAll(
      'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select'
    );
    const firstFocusableElement = focusableElements[0] as HTMLElement;
    const lastFocusableElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstFocusableElement) {
          lastFocusableElement.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastFocusableElement) {
          firstFocusableElement.focus();
          e.preventDefault();
        }
      }
    };

    containerElement.addEventListener('keydown', handleTabKey);
    
    // Focus first element initially
    if (firstFocusableElement) {
      firstFocusableElement.focus();
    }

    return () => {
      containerElement.removeEventListener('keydown', handleTabKey);
    };
  };

  // Keyboard navigation helpers
  const handleArrowNavigation = (
    e: KeyboardEvent, 
    items: HTMLElement[], 
    currentIndex: number,
    onNavigate: (newIndex: number) => void
  ) => {
    let newIndex = currentIndex;

    switch (e.key) {
      case 'ArrowDown':
        newIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
        break;
      case 'ArrowUp':
        newIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
        break;
      case 'Home':
        newIndex = 0;
        break;
      case 'End':
        newIndex = items.length - 1;
        break;
      default:
        return;
    }

    e.preventDefault();
    onNavigate(newIndex);
    items[newIndex]?.focus();
  };

  return {
    announce,
    focusElement,
    focusFirstError,
    trapFocus,
    handleArrowNavigation,
  };
}