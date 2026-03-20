'use client';

import { useState } from 'react';
import Modal from '../ui/Modal';
import { IoCloseOutline } from 'react-icons/io5';

const coinPackages = [
  { coins: 100, price: 50, img: '/Coins/coin1.png' },
  { coins: 200, price: 100, img: '/Coins/coin2.png' },
  { 
    coins: 700, 
    price: 300, 
    originalPrice: 700, 
    discount: '10% off | Save ₹ 100', 
    popular: true, 
    img: '/Coins/coin3.png' 
  },
  { coins: 450, price: 500, img: '/Coins/coin4.png' },
  { coins: 2500, price: 1000, img: '/Coins/coin5.png' },
  { coins: 12600, price: 5000, img: '/Coins/coin6.png' },
  { coins: 25500, price: 10000, img: '/Coins/coin7.png' },
  { coins: 33000, price: 12500, img: '/Coins/coin9.png' }, // Using 9 for chest
  { coins: 53000, price: 20000, img: '/Coins/coin9.png' }, // Using 9 for chest
];

export default function CoinModal({ isOpen, onClose }) {
  const [selectedPackage, setSelectedPackage] = useState(coinPackages[2]);

  if (!isOpen) return null;

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      maxWidth="1000px" 
      className="!p-0 overflow-hidden"
    >
      <div className="relative w-full h-full backdrop-blur-xl rounded-[32px] overflow-hidden flex flex-col font-[family-name:var(--font-otomanopee)]">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 z-20 text-white/60 hover:text-white transition-colors"
        >
          <IoCloseOutline size={32} />
        </button>

        {/* Content Area */}
        <div className="flex-1 p-4 md:p-8">
          {/* Header Message */}
          <div className="flex items-center gap-2 mb-6">
            <img src="/assets/Coin-token.svg" alt="coin" className="w-5 h-5" />
            <p className="text-white text-sm font-medium">
              Hmmm! Insufficient coin balance
            </p>
          </div>

          <h2 className="text-3xl font-bold text-white mb-8">Buy Coins</h2>

          {/* Grid */}
          <div className="grid grid-cols-3 gap-3">
            {coinPackages.map((pkg, index) => (
              <div 
                key={index}
                onClick={() => setSelectedPackage(pkg)}
                className={`relative group cursor-pointer rounded-xl border-2 transition-all p-3 flex flex-col items-center justify-center gap-1 ${
                  selectedPackage === pkg 
                    ? 'border-[#7D40FF] bg-[#7D40FF]/20 shadow-[0_0_20px_rgba(125,64,255,0.3)]' 
                    : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                }`}
              >
                {/* Popular Tag */}
                {pkg.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#FFD700] text-[#300569] text-[10px] font-bold px-3 py-1 rounded-full whitespace-nowrap z-10">
                    Most Popular
                  </div>
                )}

                {/* Coin Image */}
                <div className="relative w-16 h-16 mb-1">
                  <img 
                    src={pkg.img} 
                    alt={`${pkg.coins} coins`}
                    className="w-full h-full object-contain"
                  />
                </div>

                {/* Price */}
                <div className="flex flex-col items-center">
                   {pkg.originalPrice && (
                      <span className="text-white/40 text-[10px] line-through">
                        ₹ {pkg.originalPrice}
                      </span>
                   )}
                  <span className="text-white text-lg font-bold">
                    ₹ {pkg.price}
                  </span>
                </div>

                {/* Discount Info */}
                {pkg.discount && (
                  <p className="text-green-400 text-[10px] font-medium text-center">
                    {pkg.discount}
                  </p>
                )}

                {/* Coin Reward */}
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-6 h-6 rounded-full bg-[#FFD700] flex items-center justify-center p-1 shadow-[0_0_10px_rgba(255,215,0,0.4)]">
                    <img src="/assets/Coin-token.svg" alt="token" className="w-full h-full" />
                  </div>
                  <span className="text-white text-2xl font-bold">
                    {pkg.coins.toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="bg-black/20 backdrop-blur-md border-t border-white/10 p-6 md:p-8 flex items-center justify-between gap-6">
          <div className="flex flex-col gap-0">
            <span className="text-white/60 text-[10px]">Total amount to be debited</span>
            <span className="text-white text-2xl font-bold">₹ {selectedPackage.price}</span>
          </div>

          <button className="bg-white text-[#300569] hover:bg-white/90 px-8 py-3 rounded-full text-md font-bold transition-all shadow-xl active:scale-95">
            Proceed to Pay
          </button>
        </div>
      </div>
    </Modal>
  );
}
