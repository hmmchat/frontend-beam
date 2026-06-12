import { useEffect, useRef } from 'react';

export default function useBackToClose(isOpen, onClose) {
  const isPopstateRef = useRef(false);
  const hasPushedRef = useRef(false);
  const prevIsOpenRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handlePopState = (event) => {
      if (isOpen) {
        // If the popped state doesn't have modalOpen, it means the back button was clicked
        if (!event.state || !event.state.modalOpen) {
          isPopstateRef.current = true;
          onClose();
        }
      }
    };

    // Only act on transitions of isOpen to avoid pushing state on every render/prop change
    if (isOpen && !prevIsOpenRef.current) {
      isPopstateRef.current = false;
      hasPushedRef.current = true;
      // Push state when modal opens
      const currentUrl = window.location.pathname + window.location.search + window.location.hash;
      window.history.pushState({ modalOpen: true }, '', currentUrl);
      window.addEventListener('popstate', handlePopState);
    } else if (isOpen && prevIsOpenRef.current) {
      // Re-register event listener if effect re-runs (e.g. if onClose changes)
      window.addEventListener('popstate', handlePopState);
    } else if (!isOpen && prevIsOpenRef.current) {
      // Transition from open to closed: pop history if closed manually
      if (hasPushedRef.current) {
        if (!isPopstateRef.current && window.history.state?.modalOpen) {
          window.history.back();
        }
        hasPushedRef.current = false;
      }
      isPopstateRef.current = false;
    }

    prevIsOpenRef.current = isOpen;

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isOpen, onClose]);
}
