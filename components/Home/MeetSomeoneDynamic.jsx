'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Button from '@/components/ui/Button';
import FilterButtons from '@/components/ui/FilterButtons';
import GenderModal from '@/components/modals/GenderModal';
import LocationModal from '@/components/modals/LocationModal';
import { IoLogOutOutline } from 'react-icons/io5';
import { API, apiRequest } from '@/lib/api';
import FaceCard from './FaceCard';
import LocalVideo from './LocalVideo';
import LocationCard from './LocationCard';

export default function MeetSomeoneDynamic() {
  const router = useRouter();
  const [currentCard, setCurrentCard] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [swiping, setSwiping] = useState(false);
  const [coins, setCoins] = useState(0);
  const [mode, setMode] = useState('solo');
  const [isGenderModalOpen, setIsGenderModalOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [invited, setInvited] = useState(['Austin']);
  const [myProfile, setMyProfile] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [waitingForMatch, setWaitingForMatch] = useState(false);
  const [waitingMatchedUser, setWaitingMatchedUser] = useState(null);
  const [matchedRoom, setMatchedRoom] = useState(null);
  const pollRef = useRef(null);
  const rescueTimeoutRef = useRef(null);

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userId');
    // Clear any other session data if needed
    window.location.href = '/'; // Using href for a full reload to reset all states
  };

  useEffect(() => {
    fetchMyProfile();
    fetchCard();
    fetchWalletBalance();
  }, []);

  const fetchMyProfile = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      const payload = JSON.parse(atob(token.split('.')[1]));
      const userId = payload.sub || payload.uid || payload.id;

      const response = await fetch(API.USERS.GET_USER(userId), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setMyProfile(data.user);
      }
    } catch (error) {
      console.error('Error fetching my profile:', error);
    }
  };

  const fetchWalletBalance = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      const response = await fetch(API.WALLET.GET_BALANCE, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCoins(data.balance || 0);
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  };

  const fetchCard = async (sid = null) => {
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/');
        return;
      }

      const payload = JSON.parse(atob(token.split('.')[1]));
      const userId = payload.sub || payload.uid || payload.id;

      const currentSid = sid || Date.now().toString();
      // Use the helper for consistent auth and error handling
      const data = await apiRequest(API.DISCOVERY.GET_CARD(userId, currentSid, mode === 'solo'));
      console.log('Got Card:', data);
      setCurrentCard(data.card);
      setSessionId(data.sessionId || currentSid || Date.now().toString());
    } catch (error) {
      console.error('Error fetching card:', error);
      setError('Failed to load card. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSearching) {
      fetchCard(sessionId);
    }
  }, [mode]);

  const toggleInvite = (name) =>
    setInvited((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );

  const handleRaincheck = async () => {
    if (!currentCard || swiping) return;

    // If it's a location card, we don't skip it via raincheck API since there's no user ID
    // We just fetch the next card in the rotation
    if (currentCard.type === 'LOCATION' || currentCard.isLocationCard) {
      await fetchCard(sessionId);
      return;
    }

    setSwiping(true);
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) throw new Error('No token found');
      
      const payload = JSON.parse(atob(token.split('.')[1]));
      const userId = payload.sub || payload.uid || payload.id;

      const data = await apiRequest(API.DISCOVERY.RAINCHECK, {
        method: 'POST',
        body: JSON.stringify({
          userId: userId,
          sessionId: sessionId,
          raincheckedUserId: currentCard.userId
        })
      });

      if (data.nextCard) {
        setCurrentCard(data.nextCard);
      } else {
        await fetchCard(sessionId);
      }
    } catch (error) {
      console.error('Error rainchecking:', error);
      setError('Failed to skip. Please try again.');
    } finally {
      setSwiping(false);
    }
  };

  const handleProceed = async () => {
    if (!currentCard || swiping || waitingForMatch) return;

    // If it's a location card, "proceeding" means selecting that location
    if (currentCard.type === 'LOCATION' || currentCard.isLocationCard) {
      handleSelectLocation(currentCard.city);
      return;
    }

    setSwiping(true);
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) throw new Error('No token found');
      
      const payload = JSON.parse(atob(token.split('.')[1]));
      const userId = payload.sub || payload.uid || payload.id;

      const data = await apiRequest(API.DISCOVERY.PROCEED, {
        method: 'POST',
        body: JSON.stringify({
          userId: userId,
          matchedUserId: currentCard.userId
        })
      });
      
      console.log('Proceed Result:', data);
      
      // Check if it's a mutual match (both users proceeded)
      if (data.roomId) {
        // Perfect case: both accepted AND room created in one shot
        clearInterval(pollRef.current);
        localStorage.setItem('currentRoom', JSON.stringify({
          roomId: data.roomId,
          sessionId: data.sessionId
        }));
        router.push('/video-chat');
      } else if (data.waiting || data.success) {
        // Either:
        // - data.waiting: we liked them, waiting for them to accept
        // - data.success (no roomId): both accepted but room creation had an issue
        // In BOTH cases: show the waiting overlay and poll MY_ROOM instead of proceed.
        // Polling proceed again would re-consume the already-deleted match record = infinite loop!
        setWaitingForMatch(true);
        setWaitingMatchedUser(currentCard);

        // Poll for room assignment every 3s.
        // Two-step check:
        // 1. Discovery's /my-room (Redis) — fast, set when room is created
        // 2. Streaming's /users/:userId/room — ground truth, catches "already in room" cases
        //
        // Race condition rescue: after 4 empty ticks (~12s), retry /proceed once.
        let emptyPollCount = 0;
        const startPollingRoom = () => {
          pollRef.current = setInterval(async () => {
            try {
              // Step 1: Check discovery Redis cache
              const roomData = await apiRequest(API.DISCOVERY.MY_ROOM(userId));
              if (roomData.hasRoom && roomData.roomId) {
                clearInterval(pollRef.current);
                clearTimeout(rescueTimeoutRef.current);
                localStorage.setItem('currentRoom', JSON.stringify({
                  roomId: roomData.roomId,
                  sessionId: roomData.sessionId
                }));
                router.push('/video-chat');
                return;
              }

              // Step 2: Fallback — ask streaming service directly (handles "already in room" case)
              try {
                const streamData = await apiRequest(API.STREAMING.GET_USER_ROOM(userId));
                if (streamData.exists && streamData.roomId) {
                  clearInterval(pollRef.current);
                  clearTimeout(rescueTimeoutRef.current);
                  localStorage.setItem('currentRoom', JSON.stringify({
                    roomId: streamData.roomId,
                    sessionId: streamData.sessionId || streamData.roomId
                  }));
                  router.push('/video-chat');
                  return;
                }
              } catch {}

              // After 4 empty ticks (~12s): fire one rescue /proceed call
              emptyPollCount++;
              if (emptyPollCount === 4) {
                rescueTimeoutRef.current = setTimeout(async () => {
                  try {
                    const retryData = await apiRequest(API.DISCOVERY.PROCEED, {
                      method: 'POST',
                      body: JSON.stringify({ userId, matchedUserId: currentCard.userId })
                    });
                    if (retryData.roomId) {
                      clearInterval(pollRef.current);
                      localStorage.setItem('currentRoom', JSON.stringify({
                        roomId: retryData.roomId,
                        sessionId: retryData.sessionId
                      }));
                      router.push('/video-chat');
                    }
                    // Room will appear in /my-room or streaming on next poll
                  } catch {}
                }, 500);
              }
            } catch {}
          }, 3000);
        };

        startPollingRoom();

      } else {
        // Truly unexpected state — fetch next card as last resort
        await fetchCard(sessionId);
      }

    } catch (error) {
      console.error('Error proceeding:', error);
      setError('Failed to connect. Please try again.');
    } finally {
      setSwiping(false);
    }
  };

  // Cancel waiting / go back to swiping
  const handleCancelWaiting = () => {
    clearInterval(pollRef.current);
    clearTimeout(rescueTimeoutRef.current);
    setWaitingForMatch(false);
    setWaitingMatchedUser(null);
    fetchCard(sessionId);
  };

  const handleSelectLocation = async (city) => {
    setSwiping(true);
    try {
      const token = localStorage.getItem('accessToken');
      const payload = JSON.parse(atob(token.split('.')[1]));
      const userId = payload.sub || payload.uid || payload.id;

      // Use the test select-location endpoint defined in lib/api.js (or implied)
      const url = `${API.DISCOVERY.RAINCHECK.replace('/raincheck', '/select-location')}`;
      
      const data = await apiRequest(url, {
        method: 'POST',
        body: JSON.stringify({
          userId: userId,
          sessionId: sessionId,
          city: city
        })
      });

      if (data.success && data.nextCard) {
        setCurrentCard(data.nextCard);
      } else {
        await fetchCard(sessionId);
      }
    } catch (error) {
      console.error('Error selecting location:', error);
      setError('Failed to select location. Please try again.');
    } finally {
      setSwiping(false);
    }
  };


  if (loading && !currentCard) {
    return (
      <div className="relative min-h-screen w-full overflow-hidden font-[family-name:var(--font-otomanopee)]">
        <main className="grid grid-cols-1 md:grid-cols-2 h-screen overflow-hidden">
          <div
            className="relative flex items-center justify-center px-8 lg:px-24 bg-repeat"
            style={{
              backgroundImage: "url('/assets/mb.jpg')",
              backgroundRepeat: 'repeat',
              backgroundSize: 'auto',
              backgroundPosition: 'top left',
            }}
          >
            <div className="z-10 text-center max-w-lg">
              <img src="/assets/Logo.svg" className="md:w-64 mx-auto w-44" />
              <p className="text-white text-2xl mt-4">Loading profiles...</p>
            </div>
          </div>
          <div className="relative flex items-center justify-center bg-purple-900">
            <div className="text-white text-xl">Finding someone for you...</div>
          </div>
        </main>
      </div>
    );
  }

  const user = currentCard;

  return (
    <div className="relative min-h-screen w-full overflow-hidden font-[family-name:var(--font-otomanopee)]  ">
      <main className="grid grid-cols-1 md:grid-cols-2 h-screen overflow-hidden">

        {/* LEFT SIDE */}
        <div
          className="relative flex items-center justify-center px-8 bg-repeat overflow-hidden"
          style={{
            backgroundImage: "url('/assets/mb.jpg')",
            backgroundRepeat: 'repeat',
            backgroundSize: 'auto',
            backgroundPosition: 'top left',
          }}
        >
          {isSearching && currentCard ? (
            <div className="w-full h-full flex items-center justify-center p-2 relative">
              {currentCard.type === 'LOCATION' || currentCard.isLocationCard ? (
                <LocationCard 
                  city={currentCard.city} 
                  count={currentCard.availableCount}
                  onSelect={() => handleSelectLocation(currentCard.city)}
                  onSkip={handleRaincheck}
                />
              ) : (
                <div className="relative w-full h-full flex items-center justify-center">
                  <FaceCard 
                    user={currentCard} 
                    onRaincheck={waitingForMatch ? null : handleRaincheck}
                    onMeetPerson={waitingForMatch ? null : handleProceed}
                  />
                  {/* Waiting overlay */}
                  {waitingForMatch && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center backdrop-blur-sm bg-black/60 rounded-[2.5rem] z-20">
                      <div className="text-center px-8 space-y-5">
                        <div className="w-16 h-16 mx-auto rounded-full border-4 border-white/20 border-t-white animate-spin" />
                        <div>
                          <p className="text-white font-bold text-xl">Request Sent! 💌</p>
                          <p className="text-white/70 text-sm mt-1">
                            Waiting for <span className="text-white font-semibold">{waitingMatchedUser?.username || 'them'}</span> to accept...
                          </p>
                        </div>
                        <button
                          onClick={handleCancelWaiting}
                          className="mt-4 px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white text-sm font-medium border border-white/20 transition-all"
                        >
                          Keep swiping instead
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className='border-2 border-white/40 w-full h-[96vh] justify-center items-center flex rounded-2xl'>
              <div className="z-10 text-center max-w-lg p-2">
                <img src="/LOGO.png" className="md:w-64 mx-auto w-44" />
                <p className="text-white text-2xl font-[family-name:var(--font-otomanopee)]">Meet someone here,</p>
                <div className="inline-flex gap-2 mt-3 font-[family-name:var(--font-otomanopee)]">
                  <img src="/assets/video-on.svg" alt="" className="w-4 h-4" />
                  <p className='text-xs'>140,567 meeting now</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT SIDE */}
        <div className="relative flex items-center justify-center px-6 md:px-16 overflow-hidden h-full  ">

                           <div
  className="absolute inset-0 z-[1] opacity-70 mix-blend-hard-light md:animate-zoom-slow "
  style={{
    backgroundImage: 'url(/bg.jpg)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'repeat',
  }}
/>

          

      

          {/* Overlay for better text visibility */}



               <div className="absolute top-8 left-8 z-10">
            <Button variant="outline" width="hex" onClick={() => router.push('/facecard')}>
              <img src="/assets/Coin-token.svg" className="w-6 h-6" />
              <div className="text-sm font-semibold">{coins.toLocaleString()}</div>
              <img src="/assets/plus.png" className="w-4 h-4" />
            </Button>
          </div>


          {/* Top Icons */}
          <div className="absolute top-4 md:top-10 left-1/2 -translate-x-1/2 flex gap-5 z-[3] bg-black/40 rounded-full px-12 py-1">
            <button 
              onClick={() => router.push('/inbox')}
              className="w-12 h-12 flex items-center justify-center hover:bg-white/20 rounded-full"
            >
              <img src="/assets/chat-with-indicator.svg" className="w-8 h-8" />
            </button>
            <button 
              onClick={() => router.push('/history')}
              className="w-12 h-12 flex items-center justify-center hover:bg-white/20 rounded-full"
            >
              <img src="/assets/history.svg" className="w-8 h-8" />
            </button>
               {/* Profile */}
    <button 
      onClick={() => router.push('/facecard')}
      className="w-12 h-12 flex items-center justify-center hover:bg-white/20 rounded-full overflow-hidden"
    >
      <img 
        src={myProfile?.displayPictureUrl || "/assets/ico.png"} 
        className="w-full h-full object-cover" 
        alt="My Profile"
      />
    </button>
    
    <button 
      onClick={handleLogout}
      className="w-12 h-12 flex items-center justify-center hover:bg-red-500/20 rounded-full transition-colors"
      title="Logout"
    >
      <IoLogOutOutline className="text-white text-2xl" />
    </button>




        

          </div>


          <div className="absolute top-4 md:top-10 right-8 z-[3] flex gap-2 ">
  <img src="/icones1.png" alt="" className="w-12 h-12" />

  <img src="/icones2.png" alt="" className="w-12 h-12" />
</div>

          

          {/* SOLO / SQUAD TOGGLE */}
       
       
          {/* User Info Card - Floating */}
          {user && mode === 'solo' && (
            <div className="absolute top-32 left-6 z-[3] bg-black/50 backdrop-blur-sm rounded-2xl p-4 max-w-xs">
              <h2 className="text-white text-2xl font-bold">
                {user.username}, {user.age || '?'}
              </h2>
              {user.city && (
                <p className="text-white/80 text-sm">📍 {user.city}</p>
              )}
              {user.intent && (
                <p className="text-white/70 text-sm mt-2">{user.intent}</p>
              )}
              {user.interests && user.interests.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {user.interests.slice(0, 3).map((interest, index) => (
                    <span key={index} className="px-2 py-1 bg-white/20 rounded-full text-xs text-white">
                      {interest.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="absolute top-40 left-1/2 -translate-x-1/2 z-[4] bg-red-500/90 text-white px-6 py-3 rounded-lg max-w-md text-center">
              {error}
            </div>
          )}

          {mode === 'solo' ? (
            /* SOLO VIEW */
            <div className="relative z-10 w-full max-w-[520px] flex flex-col gap-8 h-full justify-center mt-32" style={{ isolation: 'isolate' }}>
              {!isSearching ? (
                <>
                  <button
                    onClick={() => setIsSearching(true)}
                    className="relative z-20 w-full py-6 px-12 text-white font-bold bg-black/30 flex items-center justify-center gap-3 border border-white border-b-4 rounded-2xl hover:bg-black/40 transition-all uppercase tracking-widest"
                  >
                    <img
                      src="/assets/video-off.svg"
                      className="w-8 h-8 filter invert brightness-0"
                      alt="Video icon"
                    />
                    Meet Someone now
                  </button>

                  <FilterButtons
                    onGenderClick={() => setIsGenderModalOpen(true)}
                    onLocationClick={() => setIsLocationModalOpen(true)}
                    className="mt-2 text-white"
                  />
                </>
              ) : (
                <div className="absolute inset-0 z-[-1] overflow-hidden rounded-2xl shadow-2xl border-2 border-white/20">
                  <LocalVideo 
                    showSoloCheckbox={true} 
                    onSoloChange={(checked) => setMode(checked ? 'solo' : 'both')} 
                  />
                </div>
              )}
            </div>
          ) : (
            /* SQUAD VIEW */
            <div className="relative z-10 w-full max-w-3xl text-center mt-auto mb-40">
             
              <div className="flex items-center justify-center gap-4 mb-10 font-sans">
                {['Me', 'Who', 'Who'].map((label, i, arr) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="flex flex-col items-center gap-2">
                      <div className="relative w-20 h-20 rounded-full border border-white/30 flex items-center justify-center overflow-hidden bg-white/5">
                        {label === 'Me' ? (
                          <Image src="/assets/ico.png" alt="me" fill className="object-cover" />
                        ) : (
                          <span className="text-2xl text-white/50">?</span>
                        )}
                      </div>
                      <span className="text-xs">{label}</span>
                    </div>
                    {i < arr.length - 1 && (
                      <div className="mb-6">
                        <img src="/assets/plus.png" alt="+" className="w-4 h-4 opacity-70" />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Share */}
              <div className="inline-flex items-center gap-4 bg-black/20 rounded-full px-6 py-3 mb-8 font-sans">
                <span className="text-white/80 text-sm font-medium mr-2">Share to</span>
                <button className="hover:bg-white/10 p-2 rounded-full transition text-white">
                  <img src="/shareicon1.png" className="w-6 h-6" />
                </button>
                <button className="hover:bg-white/10 p-2 rounded-full transition text-white">
                  <img src="/shareicon2.png" className="w-6 h-6" />
                </button>
                <button className="hover:bg-white/10 p-2 rounded-full transition text-white">
                  <img src="/shareicon3.png" className="w-6 h-6" />
                </button>
                <button className="hover:bg-white/10 p-2 rounded-full transition text-white">
                  <img src="/shareicon4.png" className="w-6 h-6" />
                </button>
              </div>

              {/* Invite */}
              <div className="flex justify-center gap-4">
                <span className="text-white/80 text-sm font-medium mr-2 border-r-2 border-white/60 pr-2 flex items-center gap-2">
                  Invite
                </span>
                <div className="flex justify-center gap-6">
                  {[
                    { name: 'Austin', img: '/assets/ico.png' },
                    { name: 'Rose', img: '/assets/img1.png' },
                    { name: 'Peter', img: '/assets/ico.png' }
                  ].map((person) => (
                    <div key={person.name} className="flex flex-col items-center gap-2">
                      <button
                        onClick={() => toggleInvite(person.name)}
                        className={`relative w-12 h-12 rounded-full border-2 ${
                          invited.includes(person.name)
                            ? 'border-yellow-400'
                            : 'border-white/20'
                        }`}
                      >
                        <Image src={person.img} alt={person.name} fill className="object-cover rounded-full" />
                        {invited.includes(person.name) ? (
                          <span className="absolute -top-2 -right-2 bg-yellow-400 text-black w-5 h-5 text-xs rounded-full flex items-center justify-center font-bold">
                            ✓
                          </span>
                        ) : (
                          <span className="absolute -top-0 -right-0 bg-white text-black w-3 h-3 text-xs rounded-full flex items-center justify-center font-bold shadow-sm">
                            +
                          </span>
                        )}
                      </button>
                      <span className="text-white/70 text-xs font-sans">{person.name}</span>
                    </div>
                  ))}
                  <button className="text-sm underline text-white/70 ml-2 self-center font-sans">
                    See all
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SHARED BOTTOM BAR (ALWAYS VISIBLE) */}
          <div className="absolute px-5 bottom-6 left-6 right-16 flex items-center justify-between z-[10]">
            {mode === 'solo' ? (
              <div>
                <img src="/assets/Frame.png" className="w-9 h-9" />
              </div>
            ) : (
              <div className='flex gap-6'>
                <img src="/assets/search-icon.svg" alt="" className='border rounded-full p-2 border-white/70 w-10 h-10' />
                <img src="/assets/Vector.svg" alt="" className='border rounded-full p-3 border-white/70 w-10 h-10' />
              </div>
            )}

            <div className="w-fit flex gap-2 border-white/40 border-1 rounded-full p-1 bg-black/20 backdrop-blur-sm">
              <button
                onClick={() => setMode('solo')}
                className={`px-6 py-1 rounded-full transition ${
                  mode === 'solo'
                    ? 'text-white bg-black/40 border-[1.5px] border-white/40'
                    : 'text-white hover:bg-white/20'
                }`}
              >
                solo
              </button>

              <button
                onClick={() => setMode('squad')}
                className={`px-6 py-1 rounded-full transition ${
                  mode === 'squad'
                    ? 'bg-black/40 border-[1.5px] border-white/40 text-white'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                squad
              </button>
            </div>
          </div>



          
        </div>
      </main>

      {/* Modals */}
      <GenderModal isOpen={isGenderModalOpen} onClose={() => setIsGenderModalOpen(false)} />
      <LocationModal isOpen={isLocationModalOpen} onClose={() => setIsLocationModalOpen(false)} />
    </div>
  );
}
