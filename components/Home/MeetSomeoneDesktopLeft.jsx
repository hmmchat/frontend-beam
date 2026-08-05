'use client';
import clsx from 'clsx';
import FaceCard4 from './FaceCard4';
import SearchingPopup from './SearchingPopup';
import MatchButtons from './MeetSomeoneMatchButtons';
import CityHandoffBar from './CityHandoffBar';
import CityBoxesPanel from './CityBoxesPanel';
import EmptyOrbitPanel from './EmptyOrbitPanel';
import { IoIosArrowBack, IoIosArrowForward } from 'react-icons/io';
import { exitDiscovery } from '@/lib/discovery-presence';

export default function MeetSomeoneDesktopLeft({
  isSearching,
  currentCard,
  isResumeLoading,
  discoveryCityFaceUser,
  currentImageIndex,
  setCurrentImageIndex,
  waitingForMatch,
  handlePrevImage,
  handleNextImage,
  activeMeetingCount,
  handleRaincheck,
  handleProceed,
  waitingMessage,
  handleCancelWaiting,
  setIsSearching,
  setCurrentCard,
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

  return (
    <div
      className={clsx(
        'hidden',
        'md:flex',
        'relative',
        'h-full',
        'min-h-0',
        'flex-col',
        'items-center',
        'justify-center',
        'overflow-hidden',
        'bg-gradient-purple-dark',
        'px-6',
        'py-10',
        'md:py-16',
        'lg:py-8',
      )}
    >
      <div
        className={clsx('absolute', 'inset-0', 'z-0')}
        style={{
          backgroundImage: 'url(/assets/mb.jpg)',
          backgroundRepeat: 'repeat',
          backgroundSize: 'cover',
        }}
      />

      <div
        className={clsx(
          'hidden',
          'md:block',
          'absolute',
          'inset-6',
          'border-2',
          'border-white/30',
          'rounded-[60px]',
          'pointer-events-none',
          'z-30',
        )}
      />

      {isSearching ? (
        <div
          className={clsx(
            'relative',
            'flex',
            'h-full',
            'min-h-0',
            'w-full',
            'flex-1',
            'flex-col',
            'items-center',
            'justify-center',
            'p-2',
          )}
        >
          {isResumeLoading && !showEmptyOrbit && !showCityBoxes && !showCityHandoff && !showUserCard ? (
            <div
              className={clsx('relative', 'w-full', 'h-full', 'flex', 'items-center', 'justify-center')}
            >
              <SearchingPopup
                isVisible={true}
                onCancel={() => {
                  setIsSearching(false);
                  setCurrentCard(null);
                  if (typeof window !== 'undefined') {
                    const url = new URL(window.location.href);
                    url.searchParams.delete('searching');
                    window.history.pushState({}, '', url.toString());
                  }
                  void exitDiscovery();
                }}
              />
            </div>
          ) : showEmptyOrbit ? (
            <EmptyOrbitPanel />
          ) : showCityBoxes ? (
            <CityBoxesPanel
              cities={availableCities}
              onSelectCity={(city) => handleSelectLocation?.(city, { persistPreference: false })}
            />
          ) : showCityHandoff ? (
            <div
              className={clsx('relative', 'flex', 'h-full', 'min-h-0', 'w-full', 'flex-col', 'overflow-hidden')}
            >
              <div
                className={clsx(
                  'flex',
                  'w-full',
                  'flex-1',
                  'min-h-0',
                  'flex-col',
                  'items-center',
                  'justify-center',
                  'px-3',
                  'gap-2',
                  'overflow-hidden',
                )}
              >
                <div className={clsx('min-h-0', 'flex-1', 'w-full', 'flex', 'items-center', 'justify-center', 'overflow-hidden')}>
                  <FaceCard4
                    user={discoveryCityFaceUser}
                    hideArrows={true}
                    currentIndex={currentImageIndex}
                    onIndexChange={setCurrentImageIndex}
                  />
                </div>
                <CityHandoffBar
                  cityLabel={discoveryCityFaceUser?.username}
                  secondsLeft={handoffSecondsLeft}
                  totalSeconds={handoffCountdownSeconds}
                  onCancel={cancelCityHandoff}
                />
              </div>
            </div>
          ) : showUserCard ? (
            <div
              className={clsx('relative', 'flex', 'h-full', 'w-full', 'flex-col', 'overflow-hidden')}
            >
              <div
                className={clsx(
                  'flex',
                  'w-full',
                  'flex-col',
                  'items-center',
                  'justify-center',
                  'px-4',
                )}
              >
                <FaceCard4
                  user={currentCard}
                  hideArrows={true}
                  currentIndex={currentImageIndex}
                  onIndexChange={setCurrentImageIndex}
                />
              </div>

              <div className={clsx('absolute', 'bottom-1', 'left-0', 'w-full', 'px-4', 'z-50')}>
                <div
                  className={clsx(
                    'flex',
                    'items-center',
                    'justify-between',
                    'gap-3',
                    'mx-auto',
                  )}
                >
                  {!waitingForMatch && (
                    <button
                      onClick={handlePrevImage}
                      className={clsx(
                        'w-12',
                        'h-12',
                        'flex',
                        'items-center',
                        'justify-center',
                        'rounded-full',
                        'border',
                        'border-white/30',
                        'text-white',
                        'text-2xl',
                        'backdrop-blur-md',
                        'hover:bg-white/10',
                        'transition',
                        'active:scale-90',
                      )}
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
                    isDesktop={false}
                  />

                  {!waitingForMatch && (
                    <button
                      onClick={handleNextImage}
                      className={clsx(
                        'w-12',
                        'h-12',
                        'flex',
                        'items-center',
                        'justify-center',
                        'rounded-full',
                        'border',
                        'border-white/30',
                        'text-white',
                        'text-2xl',
                        'backdrop-blur-md',
                        'hover:bg-white/10',
                        'transition',
                        'active:scale-90',
                      )}
                    >
                      <IoIosArrowForward />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div
              className={clsx('relative', 'w-full', 'h-full', 'flex', 'items-center', 'justify-center')}
            >
              <SearchingPopup
                isVisible={true}
                onCancel={() => {
                  setIsSearching(false);
                  setCurrentCard(null);
                  if (typeof window !== 'undefined') {
                    const url = new URL(window.location.href);
                    url.searchParams.delete('searching');
                    window.history.pushState({}, '', url.toString());
                  }
                  void exitDiscovery();
                }}
              />
            </div>
          )}
        </div>
      ) : (
        <div
          className={clsx(
            'relative',
            'w-full',
            'h-full',
            'flex',
            'items-center',
            'justify-center',
          )}
        >
          <div
            className={clsx(
              'w-full',
              'h-[96vh]',
              'justify-center',
              'items-center',
              'flex',
              'rounded-[3rem]',
              'relative',
            )}
          >
            <div className={clsx('z-10', 'text-center', 'max-w-lg', 'p-2')}>
              <img src="/logo.gif" alt="beam" fetchPriority="high" decoding="async" className={clsx('md:w-60', 'mx-auto', 'w-44')} />
              <p
                className={clsx(
                  'text-white',
                  'text-[21px]',
                  '-mt-2',
                  'font-[family-name:var(--font-otomanopee)]',
                )}
              >
                Meet someone here
              </p>
              <div
                className={clsx(
                  'inline-flex',
                  'gap-1',
                  'mt-5',
                  'font-[family-name:var(--font-otomanopee)]',
                )}
              >
                <img src="/assets/video-on.svg" alt="" className={clsx('w-5', 'h-5')} />
                <p className="text-[14px] font-thin font-outfit ">
                  {activeMeetingCount !== null ? activeMeetingCount.toLocaleString() : '0'} beaming now
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
