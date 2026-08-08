'use client';
import FaceCard from './FaceCard';
import LocalVideo from './LocalVideo';
import MatchButtons from './MeetSomeoneMatchButtons';
import CityHandoffBar from './CityHandoffBar';
import CityBoxesPanel from './CityBoxesPanel';
import EmptyOrbitPanel from './EmptyOrbitPanel';
import DiscoveryMemeLoader from './DiscoveryMemeLoader';
import { IoIosArrowBack, IoIosArrowForward } from 'react-icons/io';
import { useEffect, useState } from 'react';

/** Rounded pocket stroke — overlay only, never clips the pane beneath. */
function PocketFrame({ className = '' }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute z-10 rounded-[48px] border border-white/30 ${className}`}
    />
  );
}

/**
 * Phone matchmaking (Figma 10945:36928):
 * - Loading: half / half — top loader + bottom video
 * - Frame = stroke overlay on each half (video fills half; frame sits on top)
 * - User facecard / city handoff → full-screen card + footer actions
 */
export default function MeetSomeoneMobileSearch({
  currentCard,
  isResumeLoading,
  discoveryCityFaceUser,
  currentImageIndex,
  setCurrentImageIndex,
  waitingForMatch,
  waitingMessage,
  handleCancelWaiting,
  handleRaincheck,
  handleProceed,
  handlePrevImage,
  handleNextImage,
  isVideoOn,
  setMode,
  deckPhase = 'user',
  availableCities = [],
  handoffSecondsLeft = 10,
  handoffCountdownSeconds = 10,
  cancelCityHandoff,
  handleSelectLocation,
}) {
  const showEmptyOrbit = deckPhase === 'emptyOrbit';
  const showCityBoxes = deckPhase === 'cityBoxes';
  const showCityHandoff =
    deckPhase === 'cityHandoff' &&
    (currentCard?.type === 'LOCATION' || currentCard?.isLocationCard) &&
    discoveryCityFaceUser;
  const showUserCard =
    deckPhase === 'user' &&
    currentCard &&
    currentCard.type !== 'LOCATION' &&
    !currentCard.isLocationCard;
  const isSearchingState =
    isResumeLoading || (!showEmptyOrbit && !showCityBoxes && !showCityHandoff && !showUserCard);

  const isFullScreenCard = showUserCard || showCityHandoff;

  const [scale, setScale] = useState(1);
  const [translateY, setTranslateY] = useState(0);

  useEffect(() => {
    if (!isFullScreenCard) return;
    const updateScale = () => {
      const height = window.innerHeight;
      const newScale = Math.max(0.62, Math.min(height / 860, 1));
      const newTranslateY = Math.max(-80, Math.min(8, (height - 860) * 0.12));
      setScale(newScale);
      setTranslateY(newTranslateY);
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [isFullScreenCard]);

  const bgStyle = {
    backgroundImage: 'url(/assets/mb.jpg)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
  };

  /* ── Full-screen facecard / city ── */
  if (isFullScreenCard) {
    const cardUser = showCityHandoff ? discoveryCityFaceUser : currentCard;

    return (
      <div className="flex lg:hidden flex-col w-full h-full min-h-0 relative z-20" style={bgStyle}>
        <div className="relative flex flex-1 min-h-0 w-full items-center justify-center overflow-hidden px-2 pt-2">
          {/*
            FaceCard uses w-[min(380px,100%)]. A shrink-wrap transform parent
            makes that 100% resolve to 0 (thin vertical line). Give the scale
            shell a real width so the card can size.
          */}
          <div
            className="relative flex w-full max-w-[380px] shrink-0 items-center justify-center"
            style={{
              transform: `translateY(${translateY}px) scale(${scale})`,
              transformOrigin: 'center center',
            }}
          >
            {cardUser ? (
              <FaceCard
                user={cardUser}
                hideArrows={true}
                currentIndex={currentImageIndex}
                onIndexChange={setCurrentImageIndex}
              />
            ) : null}
          </div>
        </div>

        <div className="relative z-40 shrink-0 w-full px-3 pt-1 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {showCityHandoff ? (
            <CityHandoffBar
              cityLabel={discoveryCityFaceUser?.username}
              secondsLeft={handoffSecondsLeft}
              totalSeconds={handoffCountdownSeconds}
              onCancel={cancelCityHandoff}
            />
          ) : (
            <div className="flex items-center justify-center gap-2 w-full max-w-[380px] mx-auto">
              {!waitingForMatch && (
                <button
                  type="button"
                  onClick={handlePrevImage}
                  aria-label="Previous photo"
                  className="w-12 h-12 rounded-full border-[1.2px] border-white/50 flex items-center justify-center text-white text-2xl active:scale-90 shrink-0"
                >
                  <IoIosArrowBack />
                </button>
              )}
              <MatchButtons
                waitingForMatch={waitingForMatch}
                waitingMessage={waitingMessage}
                handleCancelWaiting={handleCancelWaiting}
                handleRaincheck={handleRaincheck}
                handleProceed={handleProceed}
                isDesktop={true}
              />
              {!waitingForMatch && (
                <button
                  type="button"
                  onClick={handleNextImage}
                  aria-label="Next photo"
                  className="w-12 h-12 rounded-full border-[1.2px] border-white/50 flex items-center justify-center text-white text-2xl active:scale-90 shrink-0"
                >
                  <IoIosArrowForward />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ── Loading (Figma 10945:36928)
     Half / half panes. Each pocket stroke overlays its own pane.
     Video fills the bottom half; frame sits on top (does not clip). ── */
  return (
    <div
      className="relative flex lg:hidden flex-col w-full h-full min-h-0 z-20 overflow-hidden"
      style={bgStyle}
    >
      {/* TOP HALF — loader / empty / city */}
      <div className="relative h-1/2 min-h-0 w-full overflow-hidden">
        <div className="absolute inset-0 flex flex-col items-center justify-center overflow-y-auto overflow-x-hidden px-4 pt-4 pb-3 scrollbar-none">
          {showEmptyOrbit ? (
            <EmptyOrbitPanel />
          ) : showCityBoxes ? (
            <CityBoxesPanel
              cities={availableCities}
              onSelectCity={(city) => handleSelectLocation?.(city, { persistPreference: false })}
            />
          ) : isSearchingState ? (
            <div className="h-full max-h-full min-h-[160px] w-full">
              <DiscoveryMemeLoader />
            </div>
          ) : null}
        </div>
        {/* Top pocket overlay — inset creates side + mid randomness gap */}
        <PocketFrame className="inset-x-3 top-3 bottom-1.5" />
      </div>

      {/* BOTTOM HALF — local video fills pane; frame overlays video */}
      <div className="relative h-1/2 min-h-0 w-full overflow-hidden bg-gray-950">
        <LocalVideo
          showSoloCheckbox={false}
          isVideoOn={isVideoOn}
          onSoloChange={(checked) => setMode(checked ? 'solo' : 'squad')}
        />
        <PocketFrame className="inset-x-3 top-1.5 bottom-3" />
      </div>
    </div>
  );
}
