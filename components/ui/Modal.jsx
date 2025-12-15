'use client';

import { useEffect } from 'react';

export default function Modal({
  isOpen,
  onClose,
  children,
  className = '',
  maxWidth = '950px',
  maxHeight = '100vh',
}) {
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : 'unset';
    return () => (document.body.style.overflow = 'unset');
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 md:bg-[#0D0048]/50 flex items-center justify-center z-[10] md:p-5 md:animate-fade-in"
      onClick={onClose}
    >
      <div
        className={`
          relative w-screen h-screen overflow-y-auto
          border-2 border-[#35047D]
          animate-slide-up
          scrollbar-thin scrollbar-track-white/5
          scrollbar-thumb-purple-500/50 hover:scrollbar-thumb-purple-500/70

          /* MOBILE */
    
          rounded-none p-10 bg-[#4E0093]
          absolute inset-0
         
          bg-cover bg-center bg-no-repeat
           bg-opacity-10
      

          /* DESKTOP */
          md:w-full md:h-auto
          md:max-h-[85vh]
          md:rounded-[32px]
          md:p-12
          md:bg-[#4E009399]
          md:bg-none

          ${className}
        `}
        style={{ maxWidth, maxHeight }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="
      absolute inset-0
      bg-[url('/assets/1.png')]
      bg-cover bg-center bg-repeat
      opacity-20
      pointer-events-none
    "
        />
        {children}
      </div>
    </div>

  );
}
