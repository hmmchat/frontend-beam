'use client';
import clsx from 'clsx';
import FaceCard from './FaceCard';
import LocalVideo from './LocalVideo';
import MatchButtons from './MeetSomeoneMatchButtons';
import CityHandoffBar from './CityHandoffBar';
import CityBoxesPanel from './CityBoxesPanel';
import EmptyOrbitPanel from './EmptyOrbitPanel';
import DiscoveryMemeLoader from './DiscoveryMemeLoader';
import { IoIosArrowBack, IoIosArrowForward } from 'react-icons/io';
import { useEffect, useState } from 'react';

/**
 * Mobile matchmaking: top status/card pane + bottom local cam,
 * both framed like desktop video windows.
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

  // Desktop always keeps local cam visible during discovery — same on phone.
  const showBottomVideo = true;
  const topIsCompactCard = showUserCard || showCityHandoff;

  const [scale, setScale] = useState(1);
  const [translateY, setTranslateY] = useState(0);

  useEffect(() => {
    const updateScale = () => {
      // Scale against the top pane (~half viewport) so face cards fit with frames.
      const paneH = window.innerHeight * 0.5;
      const newScale = Math.max(0.55, Math.min(paneH / 720, 0.92));
      const newTranslateY = Math.max(-40, Math.min(8, (paneH - 720) * 0.12));
      setScale(newScale);
      setTranslateY(newTranslateY);
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  return (
    <div className="flex md:hidden flex-col w-full h-full min-h-0 relative z-20">
      {/* Top pane — empty / search / face / city */}
      <div
        className={clsx(
          'relative flex-1 min-h-0 w-full p-2.5 pb-1.5',
          topIsCompactCard ? 'flex-[1.15]' : 'flex-1',
        )}
      >
        <div
          className="relative h-full w-full overflow-hidden rounded-[1.75rem] border-2 border-white/35"
          style={{
            backgroundImage: 'url(/assets/mb.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        >
          <div className="absolute inset-0 overflow-y-auto overflow-x-hidden w-full h-full flex flex-col items-center justify-center pt-3 pb-4 scrollbar-none z-20">
            <div className="w-full flex flex-col items-center">
              {showEmptyOrbit ? (
                <EmptyOrbitPanel />
              ) : showCityBoxes ? (
                <CityBoxesPanel
                  cities={availableCities}
                  onSelectCity={(city) => handleSelectLocation?.(city, { persistPreference: false })}
                />
              ) : isSearchingState ? (
                <div className="w-full h-full min-h-[160px] max-h-full px-2">
                  <DiscoveryMemeLoader />
                </div>
              ) : showCityHandoff ? (
                <div
                  className="relative w-full max-h-full flex flex-col items-center gap-2 overflow-hidden"
                  style={{
                    transform: `translateY(${translateY}px) scale(${scale})`,
                    transformOrigin: 'top center',
                  }}
                >
                  <FaceCard
                    user={discoveryCityFaceUser}
                    hideArrows={true}
                    currentIndex={currentImageIndex}
                    onIndexChange={setCurrentImageIndex}
                  />
                  <CityHandoffBar
                    cityLabel={discoveryCityFaceUser?.username}
                    secondsLeft={handoffSecondsLeft}
                    totalSeconds={handoffCountdownSeconds}
                    onCancel={cancelCityHandoff}
                  />
                </div>
              ) : (
                <div
                  className="relative"
                  style={{
                    transform: `translateY(${translateY}px) scale(${scale})`,
                    transformOrigin: 'top center',
                  }}
                >
                  <FaceCard
                    user={currentCard}
                    hideArrows={true}
                    currentIndex={currentImageIndex}
                    onIndexChange={setCurrentImageIndex}
                  />

                  <div className="relative w-full flex gap-1 items-center justify-between -bottom-2">
                    {!waitingForMatch && (
                      <button
                        onClick={handlePrevImage}
                        className="w-13 h-13 rounded-full border border-white/40 flex items-center justify-center text-white text-2xl hover:text-white transition active:scale-90 shrink-0"
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
                        onClick={handleNextImage}
                        className="relative z-[110] w-13 h-13 rounded-full border border-white/40 flex items-center justify-center text-white text-2xl hover:bg-white/10 transition active:scale-75 cursor-pointer backdrop-blur-sm shrink-0"
                      >
                        <IoIosArrowForward />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom pane — local camera (desktop parity) */}
      {showBottomVideo && (
        <div className="relative flex-1 min-h-0 w-full p-2.5 pt-1.5">
          <div className="relative h-full w-full overflow-hidden rounded-[1.75rem] border-2 border-white/35">
            <LocalVideo
              showSoloCheckbox={false}
              isVideoOn={isVideoOn}
              onSoloChange={(checked) => setMode(checked ? 'solo' : 'squad')}
            />
          </div>
        </div>
      )}
    </div>
  );
}
