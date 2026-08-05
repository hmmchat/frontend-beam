'use client';
import clsx from 'clsx';
import FaceCard from './FaceCard';
import LocalVideo from './LocalVideo';
import MatchButtons from './MeetSomeoneMatchButtons';
import CityHandoffBar from './CityHandoffBar';
import CityBoxesPanel from './CityBoxesPanel';
import EmptyOrbitPanel from './EmptyOrbitPanel';
import { IoIosArrowBack, IoIosArrowForward } from 'react-icons/io';
import { useEffect, useState } from 'react';

/**
 * Mobile top-half (or fullscreen) card + bottom cam preview
 * rendered inside the RIGHT panel during isSearching === true.
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
  handoffSecondsLeft = 5,
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
  const isFaceCardState = showUserCard;
  const isLocationState = showCityHandoff;

  const [scale, setScale] = useState(1);
  const [translateY, setTranslateY] = useState(0);

  useEffect(() => {
    const updateScale = () => {
      const height = window.innerHeight;
      const newScale = Math.max(0.75, Math.min(height / 820, 1));
      const newTranslateY = Math.max(-120, (height - 820) * 0.3) + 40;
      setScale(newScale);
      setTranslateY(newTranslateY);
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  return (
    <>
      <div
        className={clsx(
          'flex md:hidden w-full relative z-20 items-center justify-center md:pt-14 md:pb-4 md:px-4 overflow-hidden transition-all duration-500',
          isFaceCardState || isSearchingState || isLocationState || showEmptyOrbit || showCityBoxes
            ? 'h-full'
            : 'h-1/2',
        )}
        style={{
          backgroundImage: 'url(/assets/mb.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <div
          className={clsx('absolute', 'inset-0', 'rounded-[2rem]', 'pointer-events-none', 'z-30')}
        />

        <div className="absolute inset-0 overflow-y-auto w-full h-full flex flex-col items-center pt-4 pb-20 scrollbar-none z-20">
          <div className={clsx(' transition-transform duration-500 mb-16 sm:mb-0')}>
            {showEmptyOrbit ? (
              <EmptyOrbitPanel />
            ) : showCityBoxes ? (
              <CityBoxesPanel
                cities={availableCities}
                onSelectCity={(city) => handleSelectLocation?.(city, { persistPreference: false })}
              />
            ) : isSearchingState ? (
              <div className={clsx('flex', 'flex-col', 'items-center', 'justify-center', '')} />
            ) : showCityHandoff ? (
              <div
                className={clsx('relative', 'w-full', 'flex', 'flex-col', 'items-center', 'gap-3')}
                style={
                  typeof window !== 'undefined' && window.innerWidth < 768
                    ? {
                        transform: `translateY(${translateY}px) scale(${scale})`,
                        transformOrigin: 'top center',
                      }
                    : undefined
                }
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
                  onCancel={cancelCityHandoff}
                />
              </div>
            ) : (
              <div
                className={clsx('relative')}
                style={
                  typeof window !== 'undefined' && window.innerWidth < 768
                    ? {
                        transform: `translateY(${translateY}px) scale(${scale})`,
                        transformOrigin: 'top center',
                      }
                    : undefined
                }
              >
                <FaceCard
                  user={currentCard}
                  hideArrows={true}
                  currentIndex={currentImageIndex}
                  onIndexChange={setCurrentImageIndex}
                />

                <div
                  className={clsx(
                    'relative',
                    'md:bottom-6',
                    'w-full',
                    'flex',
                    'gap-1',
                    'items-center',
                    'justify-between',
                    '-bottom-2',
                  )}
                >
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
                      className={clsx(
                        'relative',
                        'z-[110]',
                        'w-13',
                        'h-13',
                        'rounded-full',
                        'border',
                        'border-white/40',
                        'flex',
                        'items-center',
                        'justify-center',
                        'text-white',
                        'text-2xl',
                        'hover:bg-white/10',
                        'transition',
                        'active:scale-75',
                        'cursor-pointer',
                        'backdrop-blur-sm',
                        'shrink-0',
                      )}
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

      {!isFaceCardState &&
        !isSearchingState &&
        !isLocationState &&
        !showEmptyOrbit &&
        !showCityBoxes && (
          <div
            className={clsx(
              'flex',
              'md:hidden',
              'h-1/2',
              'w-full',
              'relative',
              'z-[1]',
              'min-h-0',
            )}
          >
            <div className={clsx('absolute', 'inset-2', 'pointer-events-none', 'z-10')} />
            <LocalVideo
              showSoloCheckbox={false}
              isVideoOn={isVideoOn}
              onSoloChange={(checked) => setMode(checked ? 'solo' : 'squad')}
            />
          </div>
        )}
    </>
  );
}
