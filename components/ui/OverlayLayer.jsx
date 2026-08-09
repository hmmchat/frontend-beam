import { useEffect } from 'react';
import { IoCloseOutline } from 'react-icons/io5';

export default function OverlayLayer({ open, title, url, onClose, showChrome = true }) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onMsg = (e) => {
      if (e?.data === 'overlay:close') onClose?.();
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200]">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-md supports-[backdrop-filter]:bg-black/35" onClick={onClose} role="presentation" />
      <div className="absolute inset-0 p-3 md:p-6 flex items-stretch justify-center">
        <div
          className="relative w-full max-w-6xl h-full rounded-[32px] overflow-hidden border border-white/10 bg-black/25 backdrop-blur-xl"
          onClick={(e) => e.stopPropagation()}
          role="presentation"
        >
          {/* Close button lives inside the card (no extra header / duplicate title). */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 z-20 text-white/70 hover:text-white transition-colors bg-black/25 hover:bg-black/35 backdrop-blur-md border border-white/10 rounded-full p-1.5"
            aria-label="Close"
            title="Close"
          >
            <IoCloseOutline size={28} />
          </button>

          <div className="absolute inset-0">
            <iframe
              title={title || 'overlay'}
              src={url}
              className="h-full w-full"
              style={{ border: 'none' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

