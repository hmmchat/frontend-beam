'use client';

import { useEffect } from 'react';

export default function Modal({
  isOpen,
  onClose,
  children,
  className = '',
  maxWidth = '125vh',
  maxHeight = '90vh',
  bottom,
  left,
  right,
}) {
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : 'unset';
    return () => (document.body.style.overflow = 'unset');
  }, [isOpen]);

  if (!isOpen) return null;

  // Custom positioning logic
  const customPositionStyles = (bottom !== undefined || left !== undefined || right !== undefined)
    ? { bottom, left, right, top: 'auto', transform: 'none' }
    : {};

  const isBottomSheet = bottom === '0';

  return (
    <div
      className={`fixed inset-0 z-[50] md:p-5 md:animate-fade-in ${isBottomSheet ? 'flex items-end justify-center' : 'flex items-center justify-center'
        }`}
      onClick={onClose}
    >
      <div
        className={`
    relative overflow-y-auto overflow-x-hidden animate-slide-up z-12
    
    /* MOBILE */
    bg-[#4E0093]
    p-3 rounded-none 
    ${isBottomSheet ? 'w-full rounded-t-[32px]' : 'absolute inset-0 h-screen'}
    ${isBottomSheet ? '' : 'md:h-auto'}

    /* DESKTOP – APPLE GLASS */
    md:w-full md:h-auto
    md:inset-auto /* Reset absolute inset for desktop if not bottom sheet, or keep standard modal behavior */

    md:p-12
    md:rounded-[32px]
   

    md:backdrop-blur-[2px]
    md:backdrop-saturate-[120%]
    md:bg-[#4E0093]/70 
    md:border md:border-white/25

    ${className}
  `}
        style={{
          maxWidth: isBottomSheet ? '100%' : maxWidth,
          maxHeight,
          ...customPositionStyles
        }}
        onClick={(e) => e.stopPropagation()}
      >

        <div
          className="
      absolute inset-0
      bg-[url('/test.png')]
      bg-cover bg-center bg-repeat
      opacity-30
      pointer-events-none
    "
        />
        {children}
      </div>
      <div className='absolute inset-0 bg-[#02004A] -z-50 pointer-events-none'
      style={{
                            backgroundImage: 'url(/assets/mb.jpg)',
                            backgroundRepeat: 'repeat',
                            backgroundSize: 'cover',
                        }}></div>

    </div>


  );
}






