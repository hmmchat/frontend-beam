import { useState, useEffect } from 'react';
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
  { coins: 33000, price: 12500, img: '/Coins/coin9.png' }, 
  { coins: 53000, price: 20000, img: '/Coins/coin9.png' }, 
];

export default function CoinModal({ isOpen, onClose }) {
  const [selectedPackage, setSelectedPackage] = useState(coinPackages[2]);

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
      className="fixed inset-0 z-[150] flex items-center justify-center p-4 md:p-6"
      onClick={onClose}
    >
      {/* Backdrop */}
  

      {/* Modal Container */}
      <div 
        className="relative  w-full max-w-[900px] max-h-[90vh] bg-purple-950/40 backdrop-blur-xl rounded-[40px] border-2 border-white/30 overflow-hidden flex flex-col font-[family-name:var(--font-otomanopee)] animate-in fade-in zoom-in duration-300"
        onClick={(e) => e.stopPropagation()}
      >

            <div 
        className="absolute inset-0 bg-[#02004A]/60 backdrop-blur-md"
        style={{
          backgroundImage: "url(/assets/mb.jpg)",
          backgroundRepeat: "no-repeat",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-10 right-10 z-20 text-white/60 hover:text-white transition-colors z-10"
        >
          <IoCloseOutline size={32} />
        </button>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-10 md:pt-8 custom-scrollbar z-10">
          {/* Header Message */}
       

          <h2 className="text-3xl font-bold text-white mb-4 -mt-2">Buy Coins</h2>

          {/* Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {coinPackages.map((pkg, index) => (
              <div 
                key={index}
                onClick={() => setSelectedPackage(pkg)}
                className={`relative group cursor-pointer rounded-2xl border-2 transition-all p-4 py-6 flex flex-col items-center justify-center gap-1 ${
                  selectedPackage === pkg 
                    ? 'border-[#7D40FF] ' 
                    : 'border-white/40'
                }`}
              >
                {/* Popular Tag */}
                {pkg.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#FFD700] text-[#300569] text-[10px] font-bold px-4 py-1.5 rounded-full whitespace-nowrap z-10">
                    Most Popular
                  </div>
                )}

                {/* Coin Image */}
                <div className="relative w-12 h-12 mb-1">
                  <img 
                    src={pkg.img} 
                    alt={`${pkg.coins} coins`}
                    className="w-full h-full object-contain drop-shadow-lg"
                  />
                </div>

                {/* Grouped Info for tighter spacing */}
                <div className="flex-1 flex flex-col items-center justify-center gap-0.5">
                  {/* Price */}
                  <div className="flex items-center gap-2">
                     {pkg.originalPrice && (
                        <span className="text-white/40 text-base line-through font-outfit">
                          ₹ {pkg.originalPrice}
                        </span>
                     )}
                    <span className="text-white text-lg font-outfit">
                      ₹ {pkg.price}
                    </span>
                  </div>

                  {/* Discount Info */}
                  {pkg.discount && (
                    <p className="text-green-400 text-[10px] font-medium text-center leading-tight">
                      {pkg.discount}
                    </p>
                  )}

                  {/* Coin Reward */}
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-5 h-5 rounded-full bg-[#FFD700] flex items-center justify-center p-1 shadow-[0_0_10px_rgba(255,215,0,0.4)]">
                      <img src="/assets/Coin-token.svg" alt="token" className="w-full h-full" />
                    </div>
                    <span className="text-white text-2xl font-light ">
                      {pkg.coins.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
