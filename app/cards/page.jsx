'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { API, apiRequest } from '@/lib/api';
import { calculateAge, getFacecardPhotos } from '@/lib/facecard-utils';
import FaceCard2 from '@/components/Home/FaceCard2';
import GiftOverlay from '@/components/VideoChat/GiftOverlay';
import GiftSuccessPopup from '@/components/VideoChat/GiftSuccessPopup';
import clsx from 'clsx';
import { IoIosArrowBack, IoIosArrowForward } from 'react-icons/io';

// Stable session ID for this page visit (backend adds offline- prefix)
function makeSessionId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function OfflineCardsPage() {
  const router = useRouter();

  const [sessionId] = useState(() => makeSessionId());
  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exhausted, setExhausted] = useState(false);
  const [swiping, setSwiping] = useState(false);
  const [connectSent, setConnectSent] = useState(false);
  const [error, setError] = useState('');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isGiftModalOpen, setIsGiftModalOpen] = useState(false);
  const [selectedGift, setSelectedGift] = useState(null);
  const [walletCoins, setWalletCoins] = useState(0);
  const [successGift, setSuccessGift] = useState(null);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);

  // ── fetch next card ──────────────────────────────────────────────────────
  const fetchCard = useCallback(async () => {
    setLoading(true);
    setError('');
    setConnectSent(false);
    setCurrentImageIndex(0);
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) { router.push('/'); return; }

      const url = `${API.DISCOVERY.GET_OFFLINE_CARD}?sessionId=${encodeURIComponent(sessionId)}`;
      const data = await apiRequest(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (data.exhausted || !data.card) {
        setExhausted(true);
        setCard(null);
      } else {
        setCard(data.card);
        setExhausted(false);
      }
    } catch (err) {
      console.error('[OfflineCards] fetch error:', err);
      setError('Failed to load card. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [sessionId, router]);

  useEffect(() => { fetchCard(); }, [fetchCard]);

  // ── load wallet balance ──────────────────────────────────────────────────
  useEffect(() => {
    const loadWallet = async () => {
      try {
        const b = await apiRequest(API.WALLET.GET_BALANCE);
        setWalletCoins(typeof b?.balance === 'number' ? b.balance : 0);
      } catch { setWalletCoins(0); }
    };
    loadWallet();
  }, []);

  // ── photo navigation ─────────────────────────────────────────────────────
  const allPhotos = getFacecardPhotos(card);

  const handlePrevImage = (e) => {
    e?.stopPropagation();
    if (!allPhotos.length) return;
    setCurrentImageIndex((prev) => (prev - 1 + allPhotos.length) % allPhotos.length);
  };

  const handleNextImage = (e) => {
    e?.stopPropagation();
    if (!allPhotos.length) return;
    setCurrentImageIndex((prev) => (prev + 1) % allPhotos.length);
  };

  // ── X / pass ─────────────────────────────────────────────────────────────
  const handlePass = async () => {
    if (!card || swiping) return;
    setSwiping(true);
    try {
      const token = localStorage.getItem('accessToken');
      const data = await apiRequest(API.DISCOVERY.RAINCHECK_OFFLINE, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ sessionId, raincheckedUserId: card.userId }),
      });
      if (data.nextCard) {
        setCard(data.nextCard);
        setConnectSent(false);
        setCurrentImageIndex(0);
      } else {
        await fetchCard();
      }
    } catch (err) {
      console.error('[OfflineCards] raincheck error:', err);
      await fetchCard();
    } finally {
      setSwiping(false);
    }
  };

  // ── message ──────────────────────────────────────────────────────────────
  const handleMessage = () => {
    if (!card) return;
    const q = new URLSearchParams({
      userId: card.userId,
      username: card.username || 'User',
      friend: '0',
    });
    if (card.displayPictureUrl) q.set('photo', card.displayPictureUrl);
    router.push(`/inbox?${q.toString()}`);
  };

  // ── connect (send friend request / heart) ────────────────────────────────
  const handleConnect = async () => {
    if (!card || connectSent) return;
    try {
      const token = localStorage.getItem('accessToken');
      await apiRequest(API.FRIENDS.SEND_FRIEND_REQUEST, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ toUserId: card.userId }),
      });
      setConnectSent(true);
    } catch (err) {
      console.error('[OfflineCards] connect error:', err);
    }
  };

  // ── send gift ────────────────────────────────────────────────────────────
  const handleSendGift = async (gift) => {
    if (!card || !gift) return;
    try {
      const coinCost = Number(gift.price) || 0;
      const diamondAmount = Number(gift.diamonds) || 0;

      // Check coin balance
      if (walletCoins < coinCost) {
        alert(`Insufficient balance. Gift costs 🪙 ${coinCost} coins. You have 🪙 ${walletCoins} coins.`);
        return;
      }

      // 1. Purchase diamonds with coins first (so existing diamonds are not deducted)
      await apiRequest(API.WALLET.PURCHASE_DIAMONDS, {
        method: "POST",
        body: JSON.stringify({ diamondAmount }),
      });

      // 2. Send the gift
      await apiRequest(API.STREAMING.SEND_OFFLINE_GIFT, {
        method: 'POST',
        body: JSON.stringify({
          toUserId: card.userId,
          amount: diamondAmount,
          giftId: gift.id,
        }),
      });

      // 3. Automatically send friend request if not already sent
      if (!connectSent) {
        try {
          const token = localStorage.getItem('accessToken');
          await apiRequest(API.FRIENDS.SEND_FRIEND_REQUEST, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: JSON.stringify({ toUserId: card.userId }),
          });
          setConnectSent(true);
        } catch (friendErr) {
          console.error('[OfflineCards] auto friend request error:', friendErr);
        }
      }

      // Deduct coins locally
      setWalletCoins((prev) => Math.max(0, prev - coinCost));

      // Close modal and reset selection
      setIsGiftModalOpen(false);

      // Store sent gift and open success popup
      setSuccessGift(gift);
      setShowSuccessPopup(true);
      setSelectedGift(null);
    } catch (err) {
      console.error('[OfflineCards] gift error:', err);
      alert(err.message || 'Failed to send gift. Please try again.');
    }
  };

  // ── new session (refresh after exhausted) ───────────────────────────────
  const handleRefresh = () => {
    router.replace('/cards');
  };

  const age = card ? calculateAge(card.dateOfBirth) ?? card.age : null;

  // ── render ───────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden"
      style={{
        backgroundImage: "url('/assets/mb.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center gap-4 text-white/60">
          <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          <p className="text-sm tracking-widest uppercase">Loading cards…</p>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="flex flex-col items-center gap-4 text-white text-center px-8">
          <p className="text-white/60">{error}</p>
          <button
            onClick={fetchCard}
            className="px-6 py-2 rounded-xl border border-white/30 text-sm hover:bg-white/10 transition"
          >
            Try again
          </button>
        </div>
      )}

      {/* Exhausted */}
      {!loading && !error && exhausted && (
        <div className="flex flex-col items-center gap-6 text-white text-center px-8">
          <div className="text-5xl">🃏</div>
          <p className="text-xl font-bold">You've seen everyone!</p>
          <p className="text-white/50 text-sm">Check back later or refresh for new faces.</p>
          <button
            onClick={handleRefresh}
            className="px-8 py-3 rounded-xl border border-white/30 text-sm hover:bg-white/10 transition"
          >
            Refresh
          </button>
        </div>
      )}

      {/* Card */}
      {!loading && !error && !exhausted && card && (
        <div
          className="relative w-full h-full flex flex-col items-center justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="relative z-10 flex flex-col items-center gap-4 border-0 md:border md:border-white/40 h-[92vh] rounded-[60px] w-[98vw] md:w-[750px]">

            {/* FaceCard */}
            <div className="origin-top w-full flex justify-center transition-transform mt-3 sm:mt-0
        

       [@media(max-height:1000px)]:scale-[0.90] 
          
    [@media(max-height:800px)]:scale-[0.80] 
       
       
            ">
              <FaceCard2
                user={{
                  ...card,
                  age: age ?? card.age,
                  city: card.preferredCity || card.city,
                }}
                currentIndex={currentImageIndex}
                onIndexChange={setCurrentImageIndex}
                onClose={null}
                onDownload={null}
                onShare={null}
              />
            </div>

            {/* ── DESKTOP BOTTOM BAR ── */}
            <div className="absolute bottom-8 left-0 right-0 w-full px-12 z-50 hidden md:flex items-center h-16">
              {!isGiftModalOpen && (
                <>
                  {/* Left group: X · Message · Heart */}
                  <div className="absolute left-12 flex gap-3 items-center">
                    <button
                      type="button"
                      onClick={handlePass}
                      disabled={swiping}
                      className="w-14 h-14 border border-white/40 border-b-4 rounded-full grid place-items-center hover:bg-white/10 transition-colors text-2xl disabled:opacity-40 active:scale-95"
                      aria-label="Pass"
                    >
                      ✕
                    </button>

                    <button
                      type="button"
                      onClick={handleMessage}
                      className="w-14 h-14 border border-white/40 border-b-4 rounded-full grid place-items-center hover:bg-white/10 transition-colors"
                      aria-label="Message"
                    >
                      <img src="/history/mail.svg" alt="message" className="w-8 h-8" />
                    </button>

                    <button
                      type="button"
                      onClick={handleConnect}
                      disabled={connectSent}
                      className={clsx(
                        'w-14 h-14 border border-b-4 rounded-full grid place-items-center transition-colors',
                        connectSent
                          ? 'border-green-400/60 bg-green-500/20 cursor-default'
                          : 'border-white/40 hover:bg-white/10 active:scale-95'
                      )}
                      title={connectSent ? 'Friend request sent' : 'Send friend request'}
                      aria-label="Connect"
                    >
                      <img
                        src="/history/heart.svg"
                        alt="heart"
                        className={clsx('w-8 h-8', connectSent && 'opacity-60')}
                      />
                    </button>
                  </div>

                  {/* Center group: ← → photo nav */}
                  <div className="absolute left-1/2 flex gap-3 items-center hidden " style={{ transform: 'translateX(-50%)' }}>
                    <button
                      onClick={handlePrevImage}
                      disabled={allPhotos.length <= 1}
                      className="w-14 h-14 rounded-full border border-white/40 flex items-center justify-center text-white text-3xl hover:bg-white/10 transition active:scale-90 disabled:opacity-30"
                      aria-label="Previous photo"
                    >
                      <IoIosArrowBack />
                    </button>
                    <button
                      onClick={handleNextImage}
                      disabled={allPhotos.length <= 1}
                      className="w-14 h-14 rounded-full border border-white/40 flex items-center justify-center text-white text-3xl hover:bg-white/10 transition active:scale-90 disabled:opacity-30"
                      aria-label="Next photo"
                    >
                      <IoIosArrowForward />
                    </button>
                  </div>
                </>
              )}

              {/* Right group: Gift */}
              <div className="absolute right-12 flex items-center">
                <button
                  type="button"
                  onClick={() => {
                    if (isGiftModalOpen && selectedGift) {
                      const hasSufficientCoins = walletCoins >= (selectedGift.price || 0);
                      if (hasSufficientCoins) {
                        handleSendGift(selectedGift);
                      }
                    } else {
                      setIsGiftModalOpen(!isGiftModalOpen);
                    }
                  }}
                  className={clsx('w-16 h-16 flex items-center justify-center border-3 border-b-6 border-[#13133b] rounded-full active:scale-95 transition-transform relative group')}
                  aria-label="Send gift"
                >
                  <img
                    src="/circle.png"
                    alt=""
                    className="absolute inset-0 w-full h-full bg-pink-700 rounded-full object-contain group-hover:scale-105 transition-transform opacity-100"
                  />
                  <img
                    src="/giftboc.png"
                    alt="gift"
                    className="relative w-8 h-8 object-contain group-hover:rotate-12 transition-transform"
                  />
                </button>
              </div>
            </div>

            {/* ── MOBILE BOTTOM BAR ── */}
            <div className="md:hidden absolute bottom-6 left-0 right-0 w-full px-4 z-50 flex items-center h-14">
              {!isGiftModalOpen && (
                <>
                  {/* Left group: X · Message · Heart */}
                  <div className="absolute left-4 flex gap-2 items-center">
                    <button
                      type="button"
                      onClick={handlePass}
                      disabled={swiping}
                      className="w-12 h-12 border border-white/40 border-b-4 rounded-full grid place-items-center hover:bg-white/10 transition-colors text-xl disabled:opacity-40 active:scale-95"
                      aria-label="Pass"
                    >
                      ✕
                    </button>

                    <button
                      type="button"
                      onClick={handleMessage}
                      className="w-12 h-12 border border-white/40 border-b-4 rounded-full grid place-items-center hover:bg-white/10 transition-colors"
                      aria-label="Message"
                    >
                      <img src="/history/mail.svg" alt="message" className="w-6 h-6" />
                    </button>

                    <button
                      type="button"
                      onClick={handleConnect}
                      disabled={connectSent}
                      className={clsx(
                        'w-12 h-12 border border-b-4 rounded-full grid place-items-center transition-colors',
                        connectSent
                          ? 'border-green-400/60 bg-green-500/20 cursor-default'
                          : 'border-white/40 hover:bg-white/10 active:scale-95'
                      )}
                      title={connectSent ? 'Friend request sent' : 'Send friend request'}
                      aria-label="Connect"
                    >
                      <img
                        src="/history/heart.svg"
                        alt="heart"
                        className={clsx('w-6 h-6', connectSent && 'opacity-60')}
                      />
                    </button>
                  </div>

                  {/* Center: ← → photo nav */}

                </>
              )}

              {/* Right: Gift */}
              <div className="absolute right-4 flex items-center">
                <button
                  type="button"
                  onClick={() => setIsGiftModalOpen(!isGiftModalOpen)}
                  className={clsx('w-14 h-14 flex items-center justify-center border-2  border-[#13133b] border-b-4 border-2 active:scale-95 transition-transform relative group rounded-full')}
                  aria-label="Send gift"
                >
                  <img
                    src="/circle.png"
                    alt=""
                    className="absolute inset-0 w-full h-full bg-pink-700 rounded-full object-contain group-hover:scale-105 transition-transform opacity-100"
                  />
                  <img
                    src="/giftboc.png"
                    alt="gift"
                    className="relative w-6 h-6 object-contain group-hover:rotate-12 transition-transform"
                  />
                </button>
              </div>
            </div>

            {/* Gift Overlay positioned relative to the card container */}
            <GiftOverlay
              isOpen={isGiftModalOpen}
              onClose={() => { setIsGiftModalOpen(false); setSelectedGift(null); }}
              onOpenCoinModal={() => { }}
              onSelectGift={(gift) => setSelectedGift(gift)}
              selectedGiftId={selectedGift?.id || null}
              coins={walletCoins}
              onSendGift={handleSendGift}
              className="bottom-24 right-4 left-4 md:right-20 md:left-auto md:bottom-28 md:translate-y-0"
              desktopBottomBarClassName="bottom-8 left-40 flex gap-4 px-6 py-3 rounded-2xl  items-center z-50"
              mobileBottomBarClassName="bottom-4"
              hideSendButton={true}
            />

            <GiftSuccessPopup
              isOpen={showSuccessPopup}
              onClose={() => { setShowSuccessPopup(false); setSuccessGift(null); }}
              gift={successGift}
              recipientName={card?.name}
            />

          </div>
        </div>
      )}
    </div>
  );
}