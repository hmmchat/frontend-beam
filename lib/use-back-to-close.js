import { useEffect, useRef } from 'react';

/**
 * Back button closes the modal instead of navigating away.
 *
 * - Modal opens  → push a dummy history entry
 * - Back pressed → popstate fires → onClose() called (modal closes, dummy entry consumed)
 * - Modal closed manually → replaceState to silently remove the dummy entry
 */
export default function useBackToClose(isOpen, onClose) {
  const onCloseRef = useRef(onClose);
  const didPushRef = useRef(false);

  // Keep onClose ref fresh without re-running the effect
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!isOpen) {
      // Modal just closed — if WE pushed the state, clean it up silently
      if (didPushRef.current) {
        didPushRef.current = false;
        window.history.replaceState(null, '', window.location.href);
      }
      return;
    }

    // Modal is now open — push a dummy entry so back button lands here
    didPushRef.current = true;
    window.history.pushState({ modalOpen: true }, '', window.location.href);

    const handlePopState = () => {
      // Back was pressed — close the modal
      // didPushRef already consumed by navigation, reset it
      didPushRef.current = false;
      onCloseRef.current();
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isOpen]);
}
