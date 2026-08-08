import { useState, useEffect, useCallback } from 'react';
import { IoCloseOutline } from 'react-icons/io5';
import { API, apiRequest } from '@/lib/api';
import useBackToClose from '@/lib/use-back-to-close';
import { loadRazorpay } from '@/lib/load-razorpay';

const coinPackageImages = {
  coin_pack_100: '/Coins/coin1.png',
  coin_pack_200: '/Coins/coin2.png',
  coin_pack_700: '/Coins/coin3.png',
  coin_pack_450: '/Coins/coin4.png',
  coin_pack_2500: '/Coins/coin5.png',
  coin_pack_12600: '/Coins/coin6.png',
  coin_pack_25500: '/Coins/coin7.png',
  coin_pack_33000: '/Coins/coin9.png',
  coin_pack_53000: '/Coins/coin9.png',
};

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeCoinPackage = (pkg, index) => {
  const id = pkg.id || `coin_pack_${pkg.coins || index}`;
  return {
    id,
    coins: toNumber(pkg.coins),
    price: toNumber(pkg.price),
    currency: pkg.currency || 'INR',
    displayPrice: pkg.displayPrice,
    originalPrice: pkg.originalPrice == null ? undefined : toNumber(pkg.originalPrice),
    discount: pkg.discount,
    popular: Boolean(pkg.popular),
    sortOrder: toNumber(pkg.sortOrder || index + 1),
    img: coinPackageImages[id],
  };
};

const checkoutButtonClassName = `
  group
  px-8 py-3
  rounded-2xl
  border border-white/30
  border-b-3
  text-white
  font-bold
  text-base
  active:scale-95
  hover:bg-white/20
  hover:shadow-[0_0_10px_rgba(168,85,247,0.3)]
  transition-all
  duration-300
  z-10
  disabled:opacity-50
  disabled:cursor-not-allowed
  disabled:active:scale-100
`;

export default function CoinModal({ isOpen, onClose, onSuccess }) {
  useBackToClose(isOpen, onClose);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [coinPackages, setCoinPackages] = useState([]);
  const [packageError, setPackageError] = useState(null);
  const [checkoutError, setCheckoutError] = useState(null);
  const [checkoutBusy, setCheckoutBusy] = useState(false);

  useEffect(() => {
    let resetTimer;

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      resetTimer = window.setTimeout(() => {
        setSelectedPackage(null);
        setCheckoutError(null);
        setCheckoutBusy(false);
      }, 0);
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      if (resetTimer) window.clearTimeout(resetTimer);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    apiRequest(API.PAYMENTS.GET_COIN_PACKAGES)
      .then((data) => {
        const backendPackages = Array.isArray(data?.packages) ? data.packages : [];
        if (!backendPackages.length || cancelled) {
          throw new Error('No coin packages returned from backend');
        }

        const normalizedPackages = backendPackages
          .map(normalizeCoinPackage)
          .filter((pkg) => pkg.id && pkg.coins > 0 && pkg.price > 0)
          .sort((a, b) => a.sortOrder - b.sortOrder);

        if (!normalizedPackages.length) {
          throw new Error('No valid coin packages returned from backend');
        }

        setPackageError(null);
        setCoinPackages(normalizedPackages);
      })
      .catch((error) => {
        console.error('Failed to load coin packages from backend:', error);
        if (!cancelled) {
          setPackageError('Could not load coin packages. Please try again.');
          setCoinPackages([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const handleCheckout = useCallback(async () => {
    if (!selectedPackage || checkoutBusy) return;

    setCheckoutBusy(true);
    setCheckoutError(null);

    try {
      const initiate = await apiRequest(API.PAYMENTS.INITIATE_PURCHASE, {
        method: 'POST',
        body: JSON.stringify({ packageId: selectedPackage.id }),
      });

      const razorpayKeyId =
        initiate?.razorpayKeyId ||
        process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
        '';
      const razorpayOrderId = initiate?.razorpayOrderId;
      const amountInPaise = initiate?.amountInPaise;

      if (!razorpayKeyId || !razorpayOrderId || !amountInPaise) {
        throw new Error('Could not start payment. Please try again.');
      }

      const Razorpay = await loadRazorpay();

      await new Promise((resolve, reject) => {
        const options = {
          key: razorpayKeyId,
          amount: amountInPaise,
          currency: selectedPackage.currency || 'INR',
          name: 'Beam',
          description: `${selectedPackage.coins.toLocaleString()} coins`,
          order_id: razorpayOrderId,
          handler: async (response) => {
            try {
              const verify = await apiRequest(API.PAYMENTS.VERIFY_PURCHASE, {
                method: 'POST',
                body: JSON.stringify({
                  paymentId: response.razorpay_payment_id,
                  orderId: response.razorpay_order_id || razorpayOrderId,
                  signature: response.razorpay_signature,
                }),
              });

              const coinsCredited =
                toNumber(verify?.coinsCredited) || selectedPackage.coins;

              onSuccess?.({
                coinsCredited,
                orderId: verify?.orderId || initiate?.orderId,
                packageId: selectedPackage.id,
              });
              onClose?.();
              resolve();
            } catch (verifyError) {
              console.error('Payment verify failed:', verifyError);
              reject(
                new Error(
                  verifyError?.message ||
                    'Payment received but coin credit failed. Please contact support if coins do not appear.'
                )
              );
            }
          },
          modal: {
            ondismiss: () => {
              reject(new Error('PAYMENT_CANCELLED'));
            },
          },
          theme: {
            color: '#300569',
          },
        };

        const rzp = new Razorpay(options);
        rzp.on('payment.failed', (event) => {
          const description =
            event?.error?.description ||
            event?.error?.reason ||
            'Payment failed. Please try again.';
          reject(new Error(description));
        });
        rzp.open();
      });
    } catch (error) {
      if (error?.message === 'PAYMENT_CANCELLED') {
        setCheckoutError('Payment cancelled');
      } else {
        console.error('Checkout failed:', error);
        setCheckoutError(error?.message || 'Payment failed. Please try again.');
      }
    } finally {
      setCheckoutBusy(false);
    }
  }, [selectedPackage, checkoutBusy, onSuccess, onClose]);

  if (!isOpen) return null;

  const renderCheckoutBar = () => {
    if (!selectedPackage) return null;
    return (
      <>
        <div className="flex flex-col z-10 min-w-0">
          <span className="text-white/90 text-xs font-outfit">Total amount</span>
          <span className="text-white text-lg mt-0.5">₹ {selectedPackage.price}</span>
          {checkoutError && (
            <span className="text-red-300 text-xs font-outfit mt-1 leading-snug">
              {checkoutError}
            </span>
          )}
        </div>
        <button
          type="button"
          disabled={checkoutBusy}
          onClick={handleCheckout}
          className={checkoutButtonClassName}
        >
          <span className="transition-transform duration-300 group-hover:scale-105 inline-block">
            {checkoutBusy ? 'Processing…' : 'Checkout'}
          </span>
        </button>
      </>
    );
  };

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center p-0 md:p-6"
      onClick={checkoutBusy ? undefined : onClose}
    >
      <div
        className="relative w-full h-full md:h-auto max-w-[900px] md:max-h-[90vh] bg-purple-950/40 backdrop-blur-xl md:rounded-[40px] rounded-none border-0 md:border-2 border-white/30 overflow-hidden flex flex-col font-[family-name:var(--font-otomanopee)] animate-in fade-in zoom-in duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="absolute inset-0 bg-[#02004A]/60 backdrop-blur-md"
          style={{
            backgroundImage: 'url(/assets/mb.jpg)',
            backgroundRepeat: 'no-repeat',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />

        <button
          type="button"
          onClick={onClose}
          disabled={checkoutBusy}
          className="absolute top-6 right-6 md:top-10 md:right-10 z-20 text-white/60 hover:text-white transition-colors disabled:opacity-40"
        >
          <IoCloseOutline size={32} />
        </button>

        <div className="flex-1 overflow-hidden md:overflow-y-auto py-6 px-3 md:p-10 md:pt-10 scrollbar-hide z-10 flex flex-col">
          <h2 className="md:text-3xl text-2xl ml-2 font-bold text-white mb-6 md:mb-4 md:-mt-2 shrink-0">
            Buy Coins
          </h2>

          <div className="border md:border-0 md:mb-0 rounded-[30px] border-white/30 overflow-y-auto md:overflow-visible scrollbar-hide">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 px-3 py-4 md:px-0 md:py-0">
              {coinPackages.length === 0 && (
                <div className="col-span-2 md:col-span-3 min-h-[280px] flex items-center justify-center text-center text-white/80 font-outfit text-sm px-6">
                  {packageError || 'Loading coin packages...'}
                </div>
              )}

              {coinPackages.map((pkg) => (
                <div
                  key={pkg.id}
                  onClick={() => {
                    if (checkoutBusy) return;
                    setSelectedPackage(pkg);
                    setCheckoutError(null);
                  }}
                  className={`relative group cursor-pointer rounded-[20px] border-2 transition-all duration-300 hover:scale-[1.03] p-4 md:py-6 flex flex-col items-center justify-center gap-1
  ${
    selectedPackage?.id === pkg.id
      ? 'border-yellow-500'
      : 'border-white/40'
  }
  hover:bg-white/10
  hover:shadow-[0_0_10px_rgba(168,85,247,0.3)]
                    `}
                >
                  {pkg.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#FFD700] text-[#300569] text-[10px] font-bold px-4 py-1.5 rounded-full whitespace-nowrap z-10">
                      Most Popular
                    </div>
                  )}

                  <div className="relative w-12 h-12 mb-1">
                    {pkg.img && (
                      <img
                        src={pkg.img}
                        alt={`${pkg.coins} coins`}
                        className="w-full h-full object-contain drop-shadow-lg"
                      />
                    )}
                  </div>

                  <div className="flex-1 flex flex-col items-center justify-center gap-0.5">
                    <div className="flex items-center gap-2">
                      {pkg.originalPrice && (
                        <span className="text-white/40 text-base line-through font-outfit">
                          ₹ {pkg.originalPrice}
                        </span>
                      )}
                      <span className="text-white md:text-lg text-[12px] font-outfit">
                        ₹ {pkg.price}
                      </span>
                    </div>

                    {pkg.discount && (
                      <p className="text-green-400 text-[10px] font-medium text-center leading-tight">
                        {pkg.discount}
                      </p>
                    )}

                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-5 h-5 rounded-full bg-[#FFD700] flex items-center justify-center p-1 shadow-[0_0_10px_rgba(255,215,0,0.4)]">
                        <img
                          src="/assets/Coin-token.svg"
                          alt="token"
                          className="w-full h-full"
                        />
                      </div>
                      <span className="text-white md:text-2xl text-xl font-light ">
                        {pkg.coins.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sticky footer — outside scroll so Checkout is always visible after selection */}
        {selectedPackage && (
          <div className="w-full p-4 md:p-6 flex items-center justify-between z-20 shrink-0 relative overflow-hidden gap-3 border-t border-white/20">
            <div
              className="absolute inset-0 bg-[#02004A]/90 backdrop-blur-md -z-10"
              style={{
                backgroundImage: 'url(/assets/mb.jpg)',
                backgroundRepeat: 'no-repeat',
                backgroundSize: 'cover',
                backgroundPosition: 'bottom',
              }}
            />
            {renderCheckoutBar()}
          </div>
        )}
      </div>
    </div>
  );
}
