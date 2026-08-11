'use client';

import ProfileGuard from '@/components/auth/ProfileGuard';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { API, apiRequest } from '@/lib/api';
import { calculateAge, getFacecardPhotos } from '@/lib/facecard-utils';
import FaceCard from '@/components/Home/FaceCard';
import GiftOverlay from '@/components/VideoChat/GiftOverlay';
import GiftSuccessPopup from '@/components/VideoChat/GiftSuccessPopup';
import PressableActionButton from '@/components/VideoChat/PressableActionButton';
import OfflineHotlineDmOverlay from '@/components/cards/OfflineHotlineDmOverlay';
import CoinModal from '@/components/modals/CoinModal';
import { isInsufficientBalanceError } from '@/lib/walletErrors';
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
  const [isHotlineDmOpen, setIsHotlineDmOpen] = useState(false);
  const [isCoinModalOpen, setIsCoinModalOpen] = useState(false);
  const [purchaseToast, setPurchaseToast] = useState(null);


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
    setIsHotlineDmOpen(false);
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

  const refreshWallet = useCallback(async () => {
    try {
      const b = await apiRequest(API.WALLET.GET_BALANCE);
      setWalletCoins(typeof b?.balance === 'number' ? b.balance : 0);
    } catch {
      setWalletCoins(0);
    }
  }, []);

  // ── load wallet balance ──────────────────────────────────────────────────
  useEffect(() => {
    refreshWallet();
  }, [refreshWallet]);

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
   * `preDelayMs` keeps the current card visible (e.g. green heart ack) before fly-off.
   */
  const swipeThen = async (direction, work, { preDelayMs = 0 } = {}) => {
    if (!card || swiping) return;
    setSwiping(true);
    try {
      if (preDelayMs > 0) {
        await new Promise((r) => setTimeout(r, preDelayMs));
      }
      setSwipeAnim(direction);
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

  // ── message — Hotline DM overlay (stay on offline cards) ─────────────────
  const handleMessage = () => {
    if (!card || swiping) return;
    setIsGiftModalOpen(false);
    setSelectedGift(null);
    setIsHotlineDmOpen(true);
  };

  const handleHotlineDmSent = async () => {
    if (!card?.userId) return;
    setConnectSent(true);
    await markOfflineEngaged(card.userId);
  };

  // ── connect (heart) — green ack, then friend request + swipe to next ────
  const HEART_GREEN_MS = 380;

  const handleConnect = async () => {
    if (!card || swiping || connectSent || isAlreadyFriend) return;
    const userId = card.userId;
    const token = localStorage.getItem('accessToken');

    // Show green heart immediately (previous behavior), then advance.
    setConnectSent(true);
    try {
      await swipeThen(
        'right',
        async () => {
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
            if (errMsg.includes('already friends') || errMsg.includes('already friend')) {
              setIsAlreadyFriend(true);
            }
          }
          await markOfflineEngaged(userId);
          return fetchNextAfterRaincheck(userId);
        },
        { preDelayMs: HEART_GREEN_MS },
      );
    } catch (err) {
      console.error('[OfflineCards] connect error:', err);
      setConnectSent(false);
      alert(err?.message || 'Failed to send friend request. Please try again.');
    }
  };

  // ── send gift ────────────────────────────────────────────────────────────
  const handleSendGift = async (gift) => {
    if (!card || !gift) return;

    const coinCost = Number(gift.price) || 0;
    const diamondAmount = Number(gift.diamonds) || 0;

    // Client pre-check — GiftOverlay shows insufficient UI; keep picker open.
    if (walletCoins < coinCost) {
      setSelectedGift(gift);
      setIsGiftModalOpen(true);
      return;
    }

    // Close immediately so the sheet can't be used for double-sends while the gift flies.
    setIsGiftModalOpen(false);
    setSelectedGift(null);

    try {
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

      // Store sent gift and open success popup
      setSuccessGift(gift);
      setShowSuccessPopup(true);
    } catch (err) {
      console.error('[OfflineCards] gift error:', err);
      if (isInsufficientBalanceError(err)) {
        await refreshWallet();
        setSelectedGift(gift);
        setIsGiftModalOpen(true);
      } else {
        alert(err.message || 'Failed to send gift. Please try again.');
      }
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
                          "w-12 h-12 border border-b-4 rounded-full grid place-items-center transition-all duration-300",
                          isAlreadyFriend
                            ? "border-pink-400/60 bg-pink-500/20 cursor-default"
                            : connectSent
                              ? "border-green-400/60 bg-green-500/20 cursor-default scale-110"
                              : "border-white/40 hover:bg-white/10 active:scale-95"
                        )}
                        title={isAlreadyFriend ? 'Already friends' : connectSent ? 'Friend request sent' : 'Send friend request'}
                      >
                        <img
                          src="/history/heart.svg"
                          alt="heart"
                          className={clsx("w-6 h-6 transition-transform duration-300", connectSent && "scale-110", (connectSent || isAlreadyFriend) && "opacity-90")}
                        />
                      </button>
                    </div>
                    {!isGiftButtonHidden && (
                      <div className={clsx('ml-auto', 'flex', 'items-center')}>
                        <PressableActionButton
                          onPress={() => {
                            if (isGiftModalOpen && selectedGift) {
                              const hasSufficientCoins = walletCoins >= (selectedGift.price || 0);
                              if (hasSufficientCoins) {
                                handleSendGift(selectedGift);
                              } else {
                                // Keep overlay open — footer shows Buy Coins
                                setIsGiftModalOpen(true);
                              }
                            } else {
                              setIsGiftModalOpen(!isGiftModalOpen);
                            }
                          }}
                          className="w-14 h-14"
                          circleClassName="bg-pink-800"
                          iconSrc="/giftboc.png"
                          iconClassName="w-6 h-6 object-contain"
                          alt="gift"
                          aria-label="Send gift"
                        />
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
                        'w-14 h-14 border border-b-4 rounded-full grid place-items-center transition-all duration-300',
                        isAlreadyFriend
                          ? 'border-pink-400/60 bg-pink-500/20 cursor-default'
                          : connectSent
                            ? 'border-green-400/60 bg-green-500/20 cursor-default scale-110'
                            : 'border-white/40 hover:bg-white/10 active:scale-95'
                      )}
                      title={isAlreadyFriend ? 'Already friends' : connectSent ? 'Friend request sent' : 'Send friend request'}
                      aria-label="Connect"
                    >
                      <img
                        src="/history/heart.svg"
                        alt="heart"
                        className={clsx('w-8 h-8 transition-transform duration-300', connectSent && 'scale-110', (connectSent || isAlreadyFriend) && 'opacity-90')}
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

              {/* Right group: Gift — hide external send when insufficient (footer Buy Coins takes over) */}
              {!isGiftButtonHidden && (!isGiftModalOpen || !selectedGift || walletCoins >= (selectedGift.price || 0)) && (
                <div className={clsx('absolute', 'right-12', 'flex', 'items-center')}>
                  <PressableActionButton
                    onPress={() => {
                      if (isGiftModalOpen && selectedGift) {
                        handleSendGift(selectedGift);
                      } else {
                        setIsGiftModalOpen(!isGiftModalOpen);
                      }
                    }}
                    className="w-16 h-16 border-3 border-b-6"
                    circleClassName="bg-pink-800"
                    iconSrc="/giftboc.png"
                    iconClassName="w-8 h-8 object-contain"
                    alt="gift"
                    aria-label="Send gift"
                  />
                </div>
              )}
            </div>

            {/* Gift Overlay positioned relative to the card container */}
            <GiftOverlay
              isOpen={isGiftModalOpen}
              onClose={() => { setIsGiftModalOpen(false); setSelectedGift(null); }}
              onOpenCoinModal={() => setIsCoinModalOpen(true)}
              onSelectGift={(gift) => setSelectedGift(gift)}
              selectedGiftId={selectedGift?.id || null}
              coins={walletCoins}
              onSendGift={handleSendGift}
              className={clsx(
                'bottom-[16vh]',
                // Desktop: clear the insufficient-balance footer without floating too high
                'md:bottom-36',
                'md:right-20',
                'md:left-auto',
                'md:translate-y-0',
              )}
              desktopBottomBarClassName="bottom-8 left-40 flex gap-4 px-6 py-3 rounded-2xl items-center bg-opacity-0 z-50 w-[63%]"
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

            <OfflineHotlineDmOverlay
              open={isHotlineDmOpen}
              onClose={() => setIsHotlineDmOpen(false)}
              toUserId={card?.userId}
              isAlreadyFriend={isAlreadyFriend}
              walletCoins={walletCoins}
              onCoinsUpdated={refreshWallet}
              onOpenCoinModal={() => setIsCoinModalOpen(true)}
              onSent={handleHotlineDmSent}
            />

            <CoinModal
              isOpen={isCoinModalOpen}
              onClose={() => setIsCoinModalOpen(false)}
              onSuccess={async ({ coinsCredited }) => {
                await refreshWallet();
                const credited = Number(coinsCredited) || 0;
                setPurchaseToast(
                  credited > 0
                    ? `Added ${credited.toLocaleString()} coins`
                    : 'Coins added to your wallet'
                );
                window.setTimeout(() => setPurchaseToast(null), 3000);
              }}
              onFailure={(message) => {
                setPurchaseToast(message || 'Payment failed');
                window.setTimeout(() => setPurchaseToast(null), 3000);
              }}
            />
            {purchaseToast && (
              <div className={clsx('fixed', 'top-20', 'left-1/2', '-translate-x-1/2', 'z-[200]', 'bg-slate-900/80', 'backdrop-blur-md', 'border', 'border-white/20', 'text-white', 'px-6', 'py-3', 'rounded-full', 'shadow-2xl', 'flex', 'items-center', 'gap-3', 'animate-in', 'fade-in', 'slide-in-from-top-4')}>
                <div className={clsx('w-2', 'h-2', 'rounded-full', 'bg-green-500', 'animate-pulse')} />
                <span className={clsx('font-outfit', 'text-sm', 'font-semibold')}>{purchaseToast}</span>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}