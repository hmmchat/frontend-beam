'use client';

import { useEffect } from 'react';

export default function Modal({ isOpen, onClose, children, className = '', maxWidth = '950px', maxHeight = '85vh' }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-[#0D0048]/50 flex items-center justify-center z-[1000] p-5 animate-fade-in"
      onClick={onClose}
    >
      <div 
        className={`
          rounded-[32px] p-12 
          w-full overflow-y-auto border-2 border-[#35047D] bg-[#4E009399]
          relative
          animate-slide-up
          scrollbar-thin scrollbar-track-white/5 scrollbar-thumb-purple-500/50 hover:scrollbar-thumb-purple-500/70
          ${className}
        `}
        style={{ maxWidth, maxHeight }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
