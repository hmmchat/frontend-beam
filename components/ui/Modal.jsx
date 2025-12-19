'use client';

import { useEffect } from 'react';

export default function Modal({
  isOpen,
  onClose,
  children,
  className = '',
  maxWidth = '125vh',
  maxHeight = '100vh',
}) {
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : 'unset';
    return () => (document.body.style.overflow = 'unset');
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0  flex items-center justify-center z-[10] md:p-5 md:animate-fade-in"
      onClick={onClose}
    >
      <div
        className={`
    relative w-screen h-screen overflow-y-auto animate-slide-up z-12

    /* MOBILE */
    bg-[#4E0093]
    p-10 rounded-none absolute inset-0

    /* DESKTOP – APPLE GLASS */
    md:w-full md:h-auto

    md:p-12
    md:rounded-[32px]
   

    md:backdrop-blur-[2px]
    md:backdrop-saturate-[120%]
    md:bg-[#4E0093]/80 
    md:border md:border-white/25
    md:shadow-[0_30px_90px_rgba(0,0,0,0.45)]
  `}
        style={{ maxWidth, maxHeight }}
        onClick={(e) => e.stopPropagation()}
      >

        <div
          className="
      absolute inset-0
      bg-[url('/test.png')]
      bg-cover bg-center bg-repeat
      opacity-50
      pointer-events-none
    "
        />
        {children}
      </div>
      <div className='absolute inset-0 bg-[#02004A]/70 -z-50 pointer-events-none'></div>


    </div>


  );
}
