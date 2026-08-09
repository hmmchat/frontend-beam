'use client';

import ProfileGuard from '@/components/auth/ProfileGuard';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { API, apiRequest } from '@/lib/api';
import { calculateAge, getFacecardPhotos } from '@/lib/facecard-utils';
import FaceCard from '@/components/Home/FaceCard';
import GiftOverlay from '@/components/VideoChat/GiftOverlay';
import GiftSuccessPopup from '@/components/VideoChat/GiftSuccessPopup';
import clsx from 'clsx';
import { IoIosArrowBack, IoIosArrowForward } from 'react-icons/io';

// Stable session ID for this page visit (backend adds offline- prefix)
function makeSessionId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function OfflineCardsPage() {
  return (
    <ProfileGuard>
      <OfflineCardsContent />
    </ProfileGuard>
  );
}

function OfflineCardsContent() {
  const router = useRouter();

  const [sessionId, setSessionId] = useState(() => makeSessionId());
  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exhausted, setExhausted] = useState(false);
  const [swiping, setSwiping] = useState(false);
  const [connectSent, setConnectSent] = useState(false);
  const [isAlreadyFriend, setIsAlreadyFriend] = useState(false);
  const [error, setError] = useState('');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isGiftModalOpen, setIsGiftModalOpen] = useState(false);
  const [selectedGift, setSelectedGift] = useState(null);
  const [walletCoins, setWalletCoins] = useState(0);
  const [successGift, setSuccessGift] = useState(null);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [isGiftButtonHidden, setIsGiftButtonHidden] = useState(false);


  const [scale, setScale] = useState(1);
  const [translateY, setTranslateY] = useState(0);
  /** Tinder-style exit: 'left' (X) | 'right' (heart) | null */
  const [swipeAnim, setSwipeAnim] = useState(null);
  const [isEntering, setIsEntering] = useState(false);

  const SWIPE_MS = 320;

  const hydrateFriendship = useCallback(async (next) => {
    setIsAlreadyFriend(false);
    setConnectSent(false);
    if (!next?.userId) return;
    try {
      const status = await apiRequest(API.FRIENDS.CHECK_FRIENDSHIP(next.userId));
      if (status?.areFriends) {
        setIsAlreadyFriend(true);
      } else if (status?.hasPendingRequest || status?.requestPending || status?.requestSent || status?.isPending) {
        setConnectSent(true);
      }
    } catch {
      // fail silently — don't block card display
    }
  }, []);

  const showCard = useCallback(async (next) => {
    // Swap card + clear exit anim in one update so the outgoing card never snaps back
    setCard(next);
    setExhausted(false);
    setCurrentImageIndex(0);
    setIsGiftButtonHidden(false);
    setSwipeAnim(null);
    setIsEntering(true);
    // Next paint: ease from slightly scaled/faded into place (Tinder deck feel)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setIsEntering(false));
    });
    await hydrateFriendship(next);
  }, [hydrateFriendship]);

  // ── fetch next card ──────────────────────────────────────────────────────
  const fetchCard = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) setLoading(true);
    setError('');
    setConnectSent(false);
    setCurrentImageIndex(0);
    setIsGiftButtonHidden(false);
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
        setSwipeAnim(null);
      } else {
        await showCard(data.card);
      }
    } catch (err) {
      console.error('[OfflineCards] fetch error:', err);
      setError('Failed to load card. Please try again.');
      setSwipeAnim(null);
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [sessionId, router, showCard]);

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

  // Persist heart/message/gift so these cards are not recycled after exhaustion
  const markOfflineEngaged = async (engagedUserId) => {
    if (!engagedUserId) return;
    try {
      const token = localStorage.getItem('accessToken');
      await apiRequest(API.DISCOVERY.ENGAGE_OFFLINE, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: JSON.stringify({ engagedUserId }),
      });
    } catch (err) {
      console.error('[OfflineCards] engage error:', err);
    }
  };

  /** Raincheck current card and return the next card (or null if exhausted). */
  const fetchNextAfterRaincheck = async (userId) => {
    const token = localStorage.getItem('accessToken');
    const data = await apiRequest(API.DISCOVERY.RAINCHECK_OFFLINE, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ sessionId, raincheckedUserId: userId }),
    });
    if (data.nextCard) return data.nextCard;
    // Fallback GET in case raincheck response omitted the next card
    const url = `${API.DISCOVERY.GET_OFFLINE_CARD}?sessionId=${encodeURIComponent(sessionId)}`;
    const again = await apiRequest(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (again.exhausted || !again.card) return null;
    return again.card;
  };

  /**
   * Tinder-style fly-off, then swap card.
   * Exit animation runs in parallel with API work; UI updates only after both finish.
   */
  const swipeThen = async (direction, work) => {
    if (!card || swiping) return;
    setSwiping(true);
    setSwipeAnim(direction);
    try {
      const [, next] = await Promise.all([
        new Promise((r) => setTimeout(r, SWIPE_MS)),
        work(),
      ]);
      if (next) {
        await showCard(next);
      } else {
        setSwipeAnim(null);
        setCard(null);
        setExhausted(true);
      }
    } catch (err) {
      console.error('[OfflineCards] swipe advance error:', err);
      setSwipeAnim(null);
      throw err;
    } finally {
      setSwiping(false);
    }
  };

  // ── X / pass — swipe left ────────────────────────────────────────────────
  const handlePass = async () => {
    if (!card || swiping) return;
    const userId = card.userId;
    try {
      await swipeThen('left', () => fetchNextAfterRaincheck(userId));
    } catch {
      await fetchCard({ quiet: true });
    }
  };

  // ── message ──────────────────────────────────────────────────────────────
  const handleMessage = async () => {
    if (!card || swiping) return;
    await markOfflineEngaged(card.userId);
    const q = new URLSearchParams({
      userId: card.userId,
      username: card.username || 'User',
      friend: '0',
    });
    if (card.displayPictureUrl) q.set('photo', card.displayPictureUrl);
    router.push(`/inbox?${q.toString()}`);
  };

  // ── connect (heart) — friend request + engage + swipe right to next ─────
  const handleConnect = async () => {
    if (!card || swiping || connectSent || isAlreadyFriend) return;
    const userId = card.userId;
    const token = localStorage.getItem('accessToken');

    try {
      await swipeThen('right', async () => {
        try {
          await apiRequest(API.FRIENDS.SEND_FRIEND_REQUEST, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: JSON.stringify({ toUserId: userId }),
          });
        } catch (err) {
          const errMsg = (err?.message || '').toLowerCase();
          const isKnownDupe =
            errMsg.includes('already sent') ||
            errMsg.includes('already friends') ||
            errMsg.includes('already friend') ||
            errMsg.includes('request already') ||
            errMsg.includes('already pending') ||
            errMsg.includes('duplicate');
          if (!isKnownDupe) throw err;
        }
        await markOfflineEngaged(userId);
        return fetchNextAfterRaincheck(userId);
      });
    } catch (err) {
      console.error('[OfflineCards] connect error:', err);
      alert(err?.message || 'Failed to send friend request. Please try again.');
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
        setIsGiftButtonHidden(true);
        setIsGiftModalOpen(false);
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
          const errMsg = friendErr?.message || '';
          const lowerMsg = errMsg.toLowerCase();
          if (lowerMsg.includes('already sent') || lowerMsg.includes('already friends')) {
            setConnectSent(true);
          }
        }
      }

      // Gift counts as engagement — do not recycle this card after exhaustion
      await markOfflineEngaged(card.userId);

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
  // New session clears X-only rainchecks; heart/message/gift engagements persist server-side.
  const handleRefresh = () => {
    const newSessionId = makeSessionId();
    setSessionId(newSessionId);
    setExhausted(false);
    setCard(null);
    setIsGiftButtonHidden(false);
  };

  const age = card ? calculateAge(card.dateOfBirth) ?? card.age : null;



  useEffect(() => {
    const updateScale = () => {
      const h = window.innerHeight;
      // Reserve room for bottom action bar (~64px) + safe area so buttons never kiss the card.
      const buttonReserve = 96; // action bar + gap + safe-area cushion
      const available = h - buttonReserve;
      if (available <= 560) {
        setScale(0.68);
        setTranslateY(0);
      } else if (available <= 620) {
        setScale(0.76);
        setTranslateY(0);
      } else if (available <= 700) {
        setScale(0.86);
        setTranslateY(0);
      } else if (available <= 780) {
        setScale(0.94);
        setTranslateY(0);
      } else {
        setScale(1);
        setTranslateY(0);
      }
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  // ── render ───────────────────────────────────────────────────────────────
  return (
    <div
      className={clsx('fixed', 'inset-0', 'z-[200]', 'flex', 'items-center', 'justify-center', 'overflow-hidden')}
      style={{
        backgroundImage: "url('/assets/mb.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Loading */}
      {loading && (
        <div className={clsx('flex', 'flex-col', 'items-center', 'gap-4', 'text-white/60')}>
          <div className={clsx('w-10', 'h-10', 'border-2', 'border-white/20', 'border-t-white', 'rounded-full', 'animate-spin')} />
          <p className={clsx('text-sm', 'tracking-widest', 'uppercase')}>Loading cards…</p>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className={clsx('flex', 'flex-col', 'items-center', 'gap-4', 'text-white', 'text-center', 'px-8')}>
          <p className="text-white/60">{error}</p>
          <button
            onClick={fetchCard}
            className={clsx('px-6', 'py-2', 'rounded-xl', 'border', 'border-white/30', 'text-sm', 'hover:bg-white/10', 'transition')}
          >
            Try again
          </button>
        </div>
      )}

      {/* Exhausted */}
      {!loading && !error && exhausted && (
        <div className={clsx('flex', 'flex-col', 'items-center', 'gap-6', 'text-white', 'text-center', 'px-8')}>
          <div className="text-5xl">🃏</div>
          <p className={clsx('text-xl', 'font-bold')}>You've seen everyone!</p>
          <p className={clsx('text-white/50', 'text-sm')}>
            Refresh to see people you passed on again. Hearts and messages stay hidden.
          </p>
          <button
            onClick={handleRefresh}
            className={clsx('px-8', 'py-3', 'rounded-xl', 'border', 'border-white/30', 'text-sm', 'hover:bg-white/10', 'transition')}
          >
            Refresh
          </button>
        </div>
      )}

      {/* Card */}
      {!loading && !error && !exhausted && card && (
        <div
          className={clsx('relative', 'w-full', 'h-full', 'flex', 'flex-col', 'items-center', 'justify-center')}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={clsx('relative', 'z-10', 'flex', 'flex-col', 'items-center', 'border-0', 'md:border', 'md:border-white/40', 'h-[92dvh]', 'rounded-none', 'md:rounded-[60px]', 'overflow-hidden', 'w-full', 'md:w-[750px]', 'mx-auto')}>

            {/*
              FaceCard uses w-[min(380px,100%)]. A shrink-wrap parent makes that
              100% resolve to 0 (thin vertical line). Give the scale shell a real width.
              Mobile: collapse unused scaled height so the in-flow bottom bar sits under the card.
            */}
            <div className={clsx('flex', 'min-h-0', 'w-full', 'flex-1', 'flex-col', 'items-center', 'justify-center', 'pt-3', 'pb-2', 'md:pb-24', 'scrollbar-none', 'z-20')}>
              <div
                className={clsx(
                  'relative flex w-full max-w-[380px] shrink-0 items-center justify-center',
                  'origin-top mt-1 md:mt-0',
                )}
                style={
                  typeof window !== "undefined" && window.innerWidth < 768
                    ? {
                      transform: `translateY(${translateY}px) scale(${scale})`,
                      transformOrigin: "top center",
                      marginBottom: `${660 * (scale - 1)}px`,
                    }
                    : undefined
                }
              >
                {/* Tinder-style fly-off / enter layer */}
                <div
                  key={card.userId}
                  className="relative w-full will-change-transform"
                  style={{
                    transform: swipeAnim === 'left'
                      ? 'translateX(-130%) rotate(-18deg)'
                      : swipeAnim === 'right'
                        ? 'translateX(130%) rotate(18deg)'
                        : isEntering
                          ? 'translateX(0) rotate(0deg) scale(0.94)'
                          : 'translateX(0) rotate(0deg) scale(1)',
                    opacity: swipeAnim ? 0 : isEntering ? 0.55 : 1,
                    transition: swipeAnim
                      ? `transform ${SWIPE_MS}ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity ${SWIPE_MS}ms ease-out`
                      : 'transform 280ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 280ms ease-out',
                    pointerEvents: swiping ? 'none' : 'auto',
                  }}
                >
                  <FaceCard
                    user={{
                      ...card,
                      age: age ?? card.age,
                      city: card.preferredCity || card.city,
                    }}
                    currentIndex={currentImageIndex}
                    onIndexChange={setCurrentImageIndex}
                    className="md:[@media(max-height:1200px)]:mt-[1vh] md:[@media(max-height:1200px)]:scale-[0.90]
      md:[@media(max-height:1000px)]:scale-[0.85]
      md:[@media(max-height:800px)]:scale-[0.78] md:[@media(max-height:800px)]:mt-0
      md:[@media(max-height:700px)]:scale-[0.72] md:[@media(max-height:700px)]:mt-0"
                    onBlockOrReportSuccess={handlePass}
                  />
                </div>
              </div>

              {/* MOBILE BOTTOM BAR — in-flow so it stays below the card with a gap */}
              <div className={clsx('md:hidden', 'relative', 'w-full', 'flex', 'shrink-0', 'items-center', 'justify-between', 'h-16', 'px-4', 'max-w-[90vw]', 'mx-auto', 'z-30', 'mt-3', 'mb-[max(0.75rem,env(safe-area-inset-bottom))]')}>
                {!isGiftModalOpen && (
                  <>
                    <div className={clsx('flex', 'gap-2', 'items-center')}>
                      <button
                        type="button"
                        onClick={handlePass}
                        disabled={swiping}
                        className={clsx('w-12', 'h-12', 'border', 'border-white/40', 'border-b-4', 'rounded-full', 'grid', 'place-items-center', 'hover:bg-white/10', 'transition-colors', 'text-xl', 'disabled:opacity-40', 'active:scale-95')}
                      >
                        ✕
                      </button>

                      <button
                        type="button"
                        onClick={handleMessage}
                        className={clsx('w-12', 'h-12', 'border', 'border-white/40', 'border-b-4', 'rounded-full', 'grid', 'place-items-center', 'hover:bg-white/10', 'transition-colors')}
                      >
                        <img src="/history/mail.svg" alt="message" className={clsx('w-6', 'h-6')} />
                      </button>

                      <button
                        type="button"
                        onClick={handleConnect}
                        disabled={swiping || connectSent || isAlreadyFriend}
                        className={clsx(
                          "w-12 h-12 border border-b-4 rounded-full grid place-items-center transition-colors",
                          isAlreadyFriend
                            ? "border-pink-400/60 bg-pink-500/20 cursor-default"
                            : connectSent
                              ? "border-green-400/60 bg-green-500/20 cursor-default"
                              : "border-white/40 hover:bg-white/10 active:scale-95"
                        )}
                        title={isAlreadyFriend ? 'Already friends' : connectSent ? 'Friend request sent' : 'Send friend request'}
                      >
                        <img
                          src="/history/heart.svg"
                          alt="heart"
                          className={clsx("w-6 h-6", (connectSent || isAlreadyFriend) && "opacity-60")}
                        />
                      </button>
                    </div>
                    {!isGiftButtonHidden && (
                      <div className={clsx('ml-auto', 'flex', 'items-center')}>
                        <button
                          type="button"
                          onClick={() => {
                            if (isGiftModalOpen && selectedGift) {
                              const hasSufficientCoins = walletCoins >= (selectedGift.price || 0);
                              if (hasSufficientCoins) {
                                handleSendGift(selectedGift);
                              } else {
                                alert(`Insufficient balance. Gift costs 🪙 ${selectedGift.price || 0} coins. You have 🪙 ${walletCoins} coins.`);
                                setIsGiftButtonHidden(true);
                                setIsGiftModalOpen(false);
                              }
                            } else {
                              setIsGiftModalOpen(!isGiftModalOpen);
                            }
                          }}
                          className={clsx('w-14 h-14 flex items-center justify-center border-2  border-[#13133b] border-b-4 border-2 active:scale-95 transition-transform relative group rounded-full')}
                          aria-label="Send gift"
                        >
                          <img
                            src="/circle.png"
                            alt=""
                            className={clsx('absolute', 'inset-0', 'w-full', 'h-full', 'bg-pink-700', 'rounded-full', 'object-contain', 'group-hover:scale-105', 'transition-transform', 'opacity-100')}
                          />
                          <img
                            src="/giftboc.png"
                            alt="gift"
                            className={clsx('relative', 'w-6', 'h-6', 'object-contain', 'group-hover:rotate-12', 'transition-transform')}
                          />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>














            {/* ── DESKTOP BOTTOM BAR ── */}
            <div className={clsx('absolute', 'bottom-6', 'w-full', 'z-50', 'hidden', 'md:flex', 'items-center', 'h-16')}>
              {!isGiftModalOpen && (
                <>
                  {/* Left group: X · Message · Heart */}
                  <div className={clsx('absolute', 'left-12', 'flex', 'gap-3', 'items-center')}>
                    <button
                      type="button"
                      onClick={handlePass}
                      disabled={swiping}
                      className={clsx('w-14', 'h-14', 'border', 'border-white/40', 'border-b-4', 'rounded-full', 'grid', 'place-items-center', 'hover:bg-white/10', 'transition-colors', 'text-2xl', 'disabled:opacity-40', 'active:scale-95')}
                      aria-label="Pass"
                    >
                      ✕
                    </button>

                    <button
                      type="button"
                      onClick={handleMessage}
                      className={clsx('w-14', 'h-14', 'border', 'border-white/40', 'border-b-4', 'rounded-full', 'grid', 'place-items-center', 'hover:bg-white/10', 'transition-colors')}
                      aria-label="Message"
                    >
                      <img src="/history/mail.svg" alt="message" className={clsx('w-8', 'h-8')} />
                    </button>

                    <button
                      type="button"
                      onClick={handleConnect}
                      disabled={swiping || connectSent || isAlreadyFriend}
                      className={clsx(
                        'w-14 h-14 border border-b-4 rounded-full grid place-items-center transition-colors',
                        isAlreadyFriend
                          ? 'border-pink-400/60 bg-pink-500/20 cursor-default'
                          : connectSent
                            ? 'border-green-400/60 bg-green-500/20 cursor-default'
                            : 'border-white/40 hover:bg-white/10 active:scale-95'
                      )}
                      title={isAlreadyFriend ? 'Already friends' : connectSent ? 'Friend request sent' : 'Send friend request'}
                      aria-label="Connect"
                    >
                      <img
                        src="/history/heart.svg"
                        alt="heart"
                        className={clsx('w-8 h-8', (connectSent || isAlreadyFriend) && 'opacity-60')}
                      />
                    </button>
                  </div>

                  {/* Center group: ← → photo nav */}
                  <div className={clsx('absolute', 'left-1/2', 'flex', 'gap-3', 'items-center', 'hidden', 'md:flex')} style={{ transform: 'translateX(-50%)' }}>
                    <button
                      onClick={handlePrevImage}
                      disabled={allPhotos.length <= 1}
                      className={clsx('w-14', 'h-14', 'rounded-full', 'border', 'border-white/40', 'flex', 'items-center', 'justify-center', 'text-white', 'text-3xl', 'hover:bg-white/10', 'transition', 'active:scale-90', 'disabled:opacity-30')}
                      aria-label="Previous photo"
                    >
                      <IoIosArrowBack />
                    </button>
                    <button
                      onClick={handleNextImage}
                      disabled={allPhotos.length <= 1}
                      className={clsx('w-14', 'h-14', 'rounded-full', 'border', 'border-white/40', 'flex', 'items-center', 'justify-center', 'text-white', 'text-3xl', 'hover:bg-white/10', 'transition', 'active:scale-90', 'disabled:opacity-30')}
                      aria-label="Next photo"
                    >
                      <IoIosArrowForward />
                    </button>
                  </div>
                </>
              )}

              {/* Right group: Gift */}
              {!isGiftButtonHidden && (!isGiftModalOpen || !selectedGift || walletCoins >= (selectedGift.price || 0)) && (
                <div className={clsx('absolute', 'right-12', 'flex', 'items-center')}>
                  <button
                    type="button"
                    onClick={() => {
                      if (isGiftModalOpen && selectedGift) {
                        const hasSufficientCoins = walletCoins >= (selectedGift.price || 0);
                        if (hasSufficientCoins) {
                          handleSendGift(selectedGift);
                        } else {
                          alert(`Insufficient balance. Gift costs 🪙 ${selectedGift.price || 0} coins. You have 🪙 ${walletCoins} coins.`);
                          setIsGiftButtonHidden(true);
                          setIsGiftModalOpen(false);
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
                      className={clsx('absolute', 'inset-0', 'w-full', 'h-full', 'rounded-full', 'object-contain', 'transition-none', 'rounded-full', 'bg-pink-800', 'group-active:rotate-180')}
                    />
                    <img
                      src="/giftboc.png"
                      alt="gift"
                      className={clsx('relative', 'w-8', 'h-8', 'transition-none', 'group-active:scale-80')}
                    />
                  </button>
                </div>
              )}
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
              className={clsx('bottom-[16vh]', 'md:bottom-24', 'md:right-4', 'md:left-4', 'md:right-20', 'md:left-auto', 'md:bottom-28', 'md:translate-y-0')}
              desktopBottomBarClassName="bottom-8 left-40 flex gap-4 px-6 py-3 rounded-2xl  items-center  bg-opacity-0 z-50 w-[63%]"
              mobileBottomBarClassName=""
              hideSendButton={true}
            />

            <GiftSuccessPopup
              isOpen={showSuccessPopup}
              onClose={() => {
                setShowSuccessPopup(false);
                setSuccessGift(null);
              }}
              gift={successGift}
              recipientName={card?.name}
            />

          </div>
        </div>
      )}
    </div>
  );
}