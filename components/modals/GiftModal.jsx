'use client';

import { useState } from 'react';
import Modal from '../ui/Modal';
import { IoCloseOutline } from 'react-icons/io5';
import clsx from 'clsx';

const giftItems = [
  { id: 1, name: 'Samosa', price: 10, img: '/circle.png' },
  { id: 2, name: 'Cake', price: 50, img: '/circle.png' },
  { id: 3, name: 'Rocket', price: 200, img: '/circle.png' },
  { id: 4, name: 'Heart', price: 100, img: '/circle.png' },
  { id: 5, name: 'Diamond', price: 500, img: '/circle.png' },
  { id: 6, name: 'Trophy', price: 1000, img: '/circle.png' },
];

export default function GiftModal({ isOpen, onClose }) {
  const [selectedGift, setSelectedGift] = useState(null);

  if (!isOpen) return null;

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      maxWidth="600px" 
      className="!p-0 overflow-hidden"
    >
      <div className="relative w-full h-full bg-[#1A1033]/90 backdrop-blur-3xl rounded-[32px] overflow-hidden flex flex-col font-sans border border-purple-500/30">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 z-20 text-white/60 hover:text-white transition-colors"
        >
          <IoCloseOutline size={32} />
        </button>

        {/* Content Area */}
        <div className="flex-1 p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center">
              <img src="/giftboc.png" className="w-6 h-6 object-contain" alt="" />
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Send a Gift</h2>
          </div>

          {/* Gift Grid */}
          <div className="grid grid-cols-3 gap-4">
            {giftItems.map((gift) => (
              <div 
                key={gift.id}
                onClick={() => setSelectedGift(gift)}
                className={clsx(
                  'group relative rounded-2xl border-2 transition-all p-4 flex flex-col items-center justify-center gap-3 cursor-pointer',
                  selectedGift?.id === gift.id 
                    ? 'border-purple-500 bg-purple-600/20 shadow-[0_0_20px_rgba(168,85,247,0.3)]' 
                    : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                )}
              >
                {/* Gift Image (Placeholder style) */}
                <div className="relative w-16 h-16 transition-transform group-hover:scale-110">
                   <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full blur-md" />
                   <img 
                    src={gift.img} 
                    className={clsx('w-full h-full object-contain', gift.id % 2 === 0 ? 'hue-rotate-90' : 'hue-rotate-180')}
                    alt={gift.name} 
                   />
                </div>

                <div className="flex flex-col items-center">
                  <span className="text-white text-sm font-semibold">{gift.name}</span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <img src="/assets/Coin-token.svg" className="w-3 h-3" alt="" />
                    <span className="text-purple-300 text-xs font-bold">{gift.price}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action area */}
        <div className="p-8 pt-0 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-white/40 text-xs uppercase tracking-widest font-bold">Balance:</span>
            <div className="flex items-center gap-1">
              <img src="/assets/Coin-token.svg" className="w-4 h-4" alt="" />
              <span className="text-white font-bold">0</span>
            </div>
          </div>
          <button 
            disabled={!selectedGift}
            className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-10 py-3 rounded-full text-sm font-black tracking-widest uppercase transition-all shadow-lg active:scale-95"
          >
            Send Gift
          </button>
        </div>
      </div>
    </Modal>
  );
}
