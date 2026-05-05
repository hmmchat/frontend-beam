'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { API, apiRequest } from '@/lib/api';
import { calculateAge } from '@/lib/facecard-utils';
import FaceCard2 from '@/components/Home/FaceCard2';
import clsx from 'clsx';
import { IoIosArrowBack, IoIosArrowForward } from 'react-icons/io';

// Stable session ID for this page visit
function makeSessionId() {
  return `offline-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function OfflineCardsPage() {
  const router = useRouter();

  const [sessionId] = useState(() => makeSessionId());
  const [card, setCard] = useState(null);       // current offline card
  const [loading, setLoading] = useState(true);
  const [exhausted, setExhausted] = useState(false);
  const [swiping, setSwiping] = useState(false);
  const [connectSent, setConnectSent] = useState(false); // friend request sent for current card
  const [error, setError] = useState('');

  // ── fetch next card ──────────────────────────────────────────────────────
  const fetchCard = useCallback(async () => {
    setLoading(true);
    setError('');
    setConnectSent(false);
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

  // ── pass / raincheck ─────────────────────────────────────────────────────
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

  // ── connect (send friend request) ────────────────────────────────────────
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

  // ── new session (refresh after exhausted) ───────────────────────────────
  const handleRefresh = () => {
    // Navigate to same page — new session ID will be generated on mount
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
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="absolute top-5 left-5 z-50 flex items-center gap-2 text-white/70 hover:text-white transition-colors text-sm font-semibold hidden"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>

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
          <div className="relative z-10 flex flex-col items-center gap-4 border-0 md:border md:border-white/40 h-[92vh] rounded-[60px] w-[98vw]  md:w-[800px]   ">
          
              <div className="origin-center w-full flex justify-center  transition-transform mt-3 sm:mt-0      
     origin-top
      md:[@media(max-height:2100px)]:scale-[0.95]
      md:[@media(max-height:2000px)]:scale-[0.90]
      md:[@media(max-height:1900px)]:scale-[0.87]
      md:[@media(max-height:1800px)]:scale-[0.85]
      md:[@media(max-height:1700px)]:scale-[0.88]
      md:[@media(max-height:1500px)]:scale-[0.87]
      md:[@media(max-height:1200px)]:scale-[0.87]
      md:[@media(max-height:1000px)]:scale-[0.86]
      md:[@media(max-height:800px)]:scale-[0.86]
      md:[@media(max-height:700px)]:scale-[0.80]
      md:[@media(max-height:600px)]:scale-[0.80]

 
    ">
                <FaceCard2
                  user={{
                    ...card,
                    age: age ?? card.age,
                    city: card.preferredCity || card.city,
                  }}
                  // No close/download/share — this is browse mode
                  onClose={null}
                  onDownload={null}
                  onShare={null}
                />
              </div>

              {/* desktop button */}

                   <div className="absolute bottom-8 w-full px-12 flex items-center  z-50 flex gap-[210px]  hidden md:flex">

          <div className='flex  gap-3   -mr-24'>

                <button
           type="button"
                className="w-10 h-10 md:w-14 md:h-14 border border-white/40 border-b-4 rounded-full grid place-items-center hover:bg-white/10 transition-colors text-2xl"
         //  onClick={onClose}
           aria-label="Close preview"
         >
           ✕
         </button>


             <button
                type="button"
                

                className="w-10 h-10 md:w-14 md:h-14 border border-white/40 border-b-4 rounded-full grid place-items-center hover:bg-white/10 transition-colors"
              >
                <img
                  src="/history/mail.svg"
                  alt="message"
                  className="w-6 h-6 md:w-8 md:h-8"
                />
              </button>



                     <button
                type="button"


                className={`w-10 h-10 md:w-14 md:h-14 border border-white/40 border-b-4 rounded-full grid place-items-center hover:bg-white/10 transition-colors disabled:opacity-50 `}
              
              >
                <img
                  src="/history/heart.svg"
                  alt="heart"
                  className={`w-6 h-6 md:w-8 md:h-8`}
                />
              </button>

             </div>


          <div className='flex  gap-3    '>

          {/* Left Button */}
          <button
 
            className="w-12 h-12  md:w-14 md:h-14 rounded-full border border-white/40 flex items-center justify-center text-white text-3xl hover:text-white transition active:scale-90"
          >
            <IoIosArrowBack />
          </button>

          {/* Right Button */}
          <button

            className="w-12 h-12 md:w-14 md:h-14 rounded-full border border-white/40 flex items-center justify-center text-white text-3xl hover:border-white transition active:scale-90"
          >
            <IoIosArrowForward />
          </button>

                    </div>
      

                 <div className='flex    '>

       <button
          type="button"

          className={clsx('w-12', 'h-12', 'md:w-16', 'md:h-16', 'flex', 'items-center', 'justify-center', 'active:scale-95', 'transition-transform', 'relative', 'group')}
        >
          <img
            src="/circle.png"
            alt="button-bg"
            className={clsx('absolute', 'inset-0', 'w-full', 'h-full', 'bg-pink-700', 'rounded-full', 'object-contain', 'group-hover:scale-105', 'transition-transform', 'opacity-100')}
          />
          <img
            src="/giftboc.png"
            alt="gift-icon"
            className={clsx('relative', 'w-6', 'h-6', 'md:w-8', 'md:h-8', 'object-contain', 'group-hover:rotate-12', 'transition-transform')}
          />
        </button>
          </div>



           


            {/* Pass */}
          
          </div>




          <div className=" md:hidden flex   w-full justify-between px-4">

          <div className='flex  gap-2 mt-1  '>

                <button
           type="button"
                className="w-12 h-12 md:w-14 md:h-14 border border-white/40 border-b-4 rounded-full grid place-items-center hover:bg-white/10 transition-colors text-2xl"
         //  onClick={onClose}
           aria-label="Close preview"
         >
           ✕
         </button>


             <button
                type="button"
                

                className="w-12 h-12 md:w-14 md:h-14 border border-white/40 border-b-4 rounded-full grid place-items-center hover:bg-white/10 transition-colors"
              >
                <img
                  src="/history/mail.svg"
                  alt="message"
                  className="w-6 h-6 md:w-8 md:h-8"
                />
              </button>



                     <button
                type="button"


                className={`w-12 h-12 md:w-14 md:h-14 border border-white/40 border-b-4 rounded-full grid place-items-center hover:bg-white/10 transition-colors disabled:opacity-50 `}
              
              >
                <img
                  src="/history/heart.svg"
                  alt="heart"
                  className={`w-6 h-6 md:w-8 md:h-8`}
                />
              </button>
             </div>


    

                 <div className='  flex    '>

       <button
          type="button"

          className={clsx('w-14', 'h-14', 'md:w-16', 'md:h-16', 'flex', 'items-center', 'justify-center', 'active:scale-95', 'transition-transform', 'relative', 'group' ,  'border-3 border-black/70 border-b-5' , 'rounded-full')}
        >
          <img
            src="/circle.png"
            alt="button-bg"
            className={clsx('absolute', 'inset-0', 'w-full', 'h-full', 'bg-pink-700', 'rounded-full', 'object-contain', 'group-hover:scale-105', 'transition-transform', 'opacity-100')}
          />
          <img
            src="/giftboc.png"
            alt="gift-icon"
            className={clsx('relative', 'w-6', 'h-6', 'md:w-8', 'md:h-8', 'object-contain', 'group-hover:rotate-12', 'transition-transform')}
          />
        </button>
          </div>



           


            {/* Pass */}
          
          </div>





          </div>

          {/* Action bar */}
     
        </div>
      )}
    </div>
  );
}




  // <button
  //             onClick={handlePass}
  //             disabled={swiping}
  //             className={clsx(
  //               'px-8 py-3 rounded-xl border border-white/30 text-white text-sm font-semibold transition-all',
  //               swiping ? 'opacity-40 cursor-not-allowed' : 'hover:bg-white/10 active:scale-95'
  //             )}
  //           >
  //             Pass 👋
  //           </button>

  //           {/* Connect */}
  //           <button
  //             onClick={handleConnect}
  //             disabled={connectSent}
  //             className={clsx(
  //               'px-8 py-3 rounded-xl text-sm font-semibold transition-all',
  //               connectSent
  //                 ? 'bg-green-500/50 border border-green-400/40 text-white cursor-default'
  //                 : 'bg-white/20 border border-white/40 text-white hover:bg-white/30 active:scale-95'
  //             )}
  //           >
  //             {connectSent ? '✓ Request sent' : 'Connect 🤝'}
  //           </button>