'use client';
import { useState } from 'react';
import clsx from 'clsx';
import Link from 'next/link';
import { IoMic, IoMicOff, IoVolumeHigh, IoVolumeMute } from 'react-icons/io5';
import MeetNowButton from '@/components/ui/MeetNowButton';
import FilterButtons from '@/components/ui/FilterButtons';
import { AppOverviewToggle, AppOverviewPanel } from '@/components/ui/AppOverviewInfo';
import LocalVideo from './LocalVideo';
import SquadQuickInviteStrip from '@/components/Home/SquadQuickInviteStrip';
import MeetSomeoneMobileSearch from './MeetSomeoneMobileSearch';

export default function MeetSomeoneDesktopRight({
  // General
  isSearching,
  currentCard,
  isResumeLoading,
  mode,
  setMode,
  router,

  // Profile & UI
  myProfile,
  coins,
  setIsCoinModalOpen,
  unreadCount,
  activeMeetingCount,
  genderFilter,
  discoveryBlockedByOtherTab,
  matchPendingInOtherTab,
  overlay,
  setOverlay,
  isVideoOn,
  setIsVideoOn,
  scale,
  translateY,

  // Discovery
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
  beginDiscoverySearch,
  toggleFullscreen,

  // Filter modals
  setIsGenderModalOpen,
  setIsLocationModalOpen,

  // City handoff / empty orbit
  deckPhase = 'user',
  availableCities = [],
  handoffSecondsLeft = 10,
  handoffCountdownSeconds = 10,
  cancelCityHandoff,
  handleSelectLocation,

  // Squad
  squadLobby,
  squadMeetBusy,
  squadShareBusy,
  squadLobbyMicMuted,
  setSquadLobbyMicMuted,
  squadLobbyAudioOff,
  setSquadLobbyAudioOff,
  squadGuestIds,
  guestProfiles,
  canSquadMeet,
  squadHomeInviteMeetSlotActive,
  squadProductMessage,
  squadMemberActionBusyId,
  handleSquadEnterCall,
  handleRemoveSquadMember,
  shareSquadInvite,
  quickInviteFriends,
  quickInviteBusyId,
  quickInvitePendingIds,
  handleQuickSquadInvite,
  handleQuickSquadCancelInvite,
  setSquadInviteOpen,
}) {
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  return (
    <div className={clsx('relative w-full h-full overflow-hidden', !isSearching && 'hidden lg:block')}>
      {/* 🔲 HUD BORDER FRAME (Desktop Right) */}
      <div
        className={clsx(
          'hidden',
          'lg:block',
          'absolute',
          'inset-6',
          'border-2',
          'border-white/30',
          'rounded-[60px]',
          'pointer-events-none',
          'z-30',
        )}
      />

      <div
        className={clsx(
          'absolute',
          'inset-0',
          'opacity-70',
          'mix-blend-hard-light',
          'md:animate-zoom-slow',
        )}
        style={{
          backgroundImage: 'url(/bg.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

      {/* Coins pill */}
      <div className={clsx('absolute', 'top-2', 'md:top-18', 'left-16', 'z-50', isSearching && 'hidden')}>
        <button
          className={clsx(
            'inline-flex',
            'items-center',
            'justify-center',
            'gap-3',
            'px-[20.8px]',
            'py-[15px]',
            'rounded-full',
            'text-base',
            'font-semibold',
            'border-[2px]',
            'border-b-[3px]',
            'border-white/50',
            'transition-all',
            'duration-300',
            'ease-out',
            'relative',
            'overflow-hidden',
            'hover:scale-105',
            'hover:shadow-[0_0_15px_rgba(168,85,247,0.3)]',
            'hover:brightness-110',
          )}
          onClick={() => setIsCoinModalOpen(true)}
        >
          <img src="/assets/Coin-token.svg" className={clsx('w-5', 'h-5')} alt="" />
          <div className={clsx('text-sm', 'font-semibold')}>{coins.toLocaleString()}</div>
          <img src="/assets/plus.png" className={clsx('w-4', 'h-4')} alt="" />
        </button>
      </div>

      {/* Top Icons */}
      <div
        className={clsx(
          'absolute',
          'top-2',
          'md:top-18',
          'left-1/2',
          '-translate-x-1/2',
          'flex',
          'gap-2',
          'md:gap-[28px]',
          'z-50',
          'border-2',
          'border-white/40',
          'rounded-full',
          'px-4',
          'md:px-[26px]',
          'md:py-[9px]',
          isSearching && 'hidden',
        )}
      >
        <button
          onClick={() => {
            if (isSearching) {
              setOverlay({ open: true, url: '/history', title: 'History' });
            } else {
              router.push('/history');
            }
          }}
          className={clsx(
            'group',
            'w-10',
            'md:w-[35.6px]',
            'h-10',
            'md:h-[35px]',
            'flex',
            'items-center',
            'justify-center',
            'hover:bg-white/20',
            'hover:shadow-[0_0_10px_rgba(168,85,247,0.3)]',
            'rounded-full',
            'transition-all',
            'duration-300',
          )}
        >
          <img
            src="/assets/history.svg"
            className={clsx('w-7', 'h-7', 'transition-transform', 'duration-300', 'group-hover:scale-110')}
            alt="History"
          />
        </button>

        <button
          onClick={() => {
            if (isSearching) {
              setOverlay({ open: true, url: '/inbox', title: 'Messages' });
            } else {
              router.push('/inbox');
            }
          }}
          className={clsx(
            'group',
            'w-10',
            'md:w-[35.6px]',
            'h-10',
            'md:h-[35.6px]',
            'flex',
            'items-center',
            'justify-center',
            'hover:bg-white/20',
            'hover:shadow-[0_0_10px_rgba(168,85,247,0.3)]',
            'rounded-full',
            'relative',
            'transition-all',
            'duration-300',
          )}
        >
          <img
            src="/assets/chattopicon.svg"
            className={clsx('w-6', 'h-6', 'transition-transform', 'duration-300', 'group-hover:scale-110')}
            alt="Messages"
          />
          <span className="border rounded-full h-2 w-2 -right-2 absolute top-3"> </span>
          {unreadCount > 0 && (
            <span
              className={clsx(
                'absolute',
                'top-3',
                '-right-2',
                'w-[10px]',
                'h-[10px]',
                'bg-[#ACE723]',
                'border-2',
                'border-[#1ECB00]',
                'rounded-full',
                'shadow-[0_0_16px_8px_rgba(34,197,94,0.9),0_0_24px_8px_rgba(34,197,94,0.6),0_0_40px_12px_rgba(34,197,94,0.4)]',
              )}
            />
          )}
        </button>

        {/* Profile */}
        <button
          type="button"
          title="My profile"
          onClick={() => {
            if (isSearching) {
              setOverlay({ open: true, url: '/profile/', title: 'My Profile' });
            } else {
              router.push('/profile/');
            }
          }}
          className={clsx(
            'group',
            'w-10',
            'md:w-[35.6px]',
            'h-10',
            'md:h-[35.6px]',
            'flex',
            'items-center',
            'justify-center',
            'hover:bg-white/20',
            'hover:shadow-[0_0_10px_rgba(168,85,247,0.3)]',
            'rounded-full',
            'overflow-hidden',
            'my-auto',
            'transition-all',
            'duration-300',
          )}
        >
          {myProfile ? (
            <img
              src={myProfile.displayPictureUrl}
              onError={(e) => e.currentTarget.src}
              className={clsx(
                'w-8',
                'h-8',
                'object-cover',
                'rounded-full',
                'transition-transform',
                'duration-300',
                'group-hover:scale-110',
              )}
            />
          ) : (
            <div className={clsx('w-full', 'h-full', 'bg-white/20', 'animate-pulse', 'rounded-full')} />
          )}
        </button>
      </div>

      {/* Top right icons */}
      <div
        className={clsx(
          'absolute',
          'top-4',
          'md:top-18',
          'right-16',
          'z-50',
          'flex',
          'gap-2',
          'items-center',
          isSearching && 'hidden',
        )}
      >
        <AppOverviewToggle
          isOpen={isInfoOpen}
          onToggle={() => setIsInfoOpen((prev) => !prev)}
          className="md:h-[55px] md:w-[55px] h-10 w-10"
          iconClassName="h-6 w-6"
        />

        <div>
          <button
            onClick={toggleFullscreen}
            className={clsx(
              'group',
              'md:h-[55px]',
              'md:w-[55px]',
              'h-10',
              'w-10',
              'rounded-full',
              'border-[1px]',
              'border-b-[3px]',
              'border-white/60',
              'shadow-md',
              'transition-all',
              'duration-300',
              'hover:shadow-[0_0_15px_rgba(168,85,247,0.3)]',
              'items-center',
              'justify-center',
              'flex',
            )}
          >
            <img
              src="/icon1.svg"
              alt="Prompt"
              className={clsx('h-6', 'w-6', 'transition-transform', 'duration-300', 'group-hover:scale-110')}
            />
          </button>
        </div>
      </div>

      {isInfoOpen && !isSearching && (
        <AppOverviewPanel
          className="absolute top-24 z-50 inset-x-26 bottom-38 pt-[70px]"
          contentMaxWidthClass="max-w-[320px]"
          onClose={() => setIsInfoOpen(false)}
        />
      )}

      {/* ── SOLO VIEW ─────────────────────────────────────────────────────── */}
      {mode === 'solo' ? (
        <div
          className={clsx(
            'relative z-10 w-full',
            'flex flex-col items-center justify-center',
            'gap-6 h-full mx-auto text-center',
          )}
        >
          {!isSearching ? (
            <>
              <MeetNowButton
                onClick={async () => {
                  await beginDiscoverySearch();
                }}
                isSearching={isSearching}
                className="mt-40 w-[79%] h-30"
                iconClass="md:text-xl transition-all md:h-8 md:w-8 h-6 w-6"
                borderClass="md:border-[1.89px] md:border-b-[5.4px] border border-b-[3px] md:rounded-[26px] rounded-[16px]"
                isVideoOn={isVideoOn}
                onVideoClick={() => setIsVideoOn(!isVideoOn)}
              />

              <FilterButtons
                onGenderClick={() => setIsGenderModalOpen(true)}
                onLocationClick={() => setIsLocationModalOpen(true)}
                genderLabel={
                  genderFilter === 'MALE'
                    ? 'Male'
                    : genderFilter === 'FEMALE'
                      ? 'Female'
                      : genderFilter === 'NON_BINARY'
                        ? 'Non-binary'
                        : 'Both'
                }
                locationLabel={
                  !myProfile?.preferredCity || myProfile.preferredCity === 'ANYWHERE_IN_INDIA'
                    ? 'Anywhere'
                    : myProfile.preferredCity
                      .split(/[_-]/)
                      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
                      .join(' ')
                }
                className={clsx('text-white')}
              />
              {discoveryBlockedByOtherTab ? (
                <p className="text-sm text-white/80 max-w-xs px-4">
                  {matchPendingInOtherTab
                    ? 'You matched — switch to your other tab to see them and Meet rn.'
                    : 'Discovery is active in another tab. Close that tab or continue there to search.'}
                </p>
              ) : null}
            </>
          ) : (
            <div
              className={clsx(
                'absolute',
                'inset-0',
                'z-0',
                'overflow-hidden',
                'shadow-2xl',
                'flex flex-col md:block',
              )}
            >
              {/* MOBILE VIEW LOGIC */}
              <MeetSomeoneMobileSearch
                currentCard={currentCard}
                isResumeLoading={isResumeLoading}
                discoveryCityFaceUser={discoveryCityFaceUser}
                currentImageIndex={currentImageIndex}
                setCurrentImageIndex={setCurrentImageIndex}
                waitingForMatch={waitingForMatch}
                waitingMessage={waitingMessage}
                handleCancelWaiting={handleCancelWaiting}
                handleRaincheck={handleRaincheck}
                handleProceed={handleProceed}
                handlePrevImage={handlePrevImage}
                handleNextImage={handleNextImage}
                scale={scale}
                translateY={translateY}
                isVideoOn={isVideoOn}
                setMode={setMode}
                deckPhase={deckPhase}
                availableCities={availableCities}
                handoffSecondsLeft={handoffSecondsLeft}
                handoffCountdownSeconds={handoffCountdownSeconds}
                cancelCityHandoff={cancelCityHandoff}
                handleSelectLocation={handleSelectLocation}
              />

              {/* 🎥 VIDEO (Desktop) — phone/tablet use MeetSomeoneMobileSearch */}
              <div
                className={clsx(
                  'hidden',
                  'lg:block',
                  'relative',
                  'flex-1',
                  'lg:absolute',
                  'lg:inset-0',
                  'z-[1]',
                  'w-full',
                  'min-h-0',
                )}
              >
                <LocalVideo
                  showSoloCheckbox={false}
                  isVideoOn={isVideoOn}
                  onSoloChange={(checked) => setMode(checked ? 'solo' : 'squad')}
                />
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ── SQUAD VIEW ──────────────────────────────────────────────────── */
        <div
          className={clsx(
            'relative',
            'z-10',
            'flex',
            'h-full',
            'min-h-0',
            'w-full',
            'flex-col',
            'items-center',
            'overflow-y-auto',
            'overflow-x-hidden',
            'overscroll-y-contain',
          )}
        >
          {/* Video background for squad mode */}
          <div className={clsx('absolute', 'inset-0', 'z-0', 'overflow-hidden', 'rounded-2xl')} />

          <div
            className={clsx(
              'relative',
              'z-10',
              'flex',
              'h-full',
              'min-h-0',
              'w-full',
              'flex-col',
              'items-center',
              'pb-36',
              'md:pb-40',
              'px-2',
            )}
          >
            {squadProductMessage ? (
              <div
                role="alert"
                className={clsx(
                  'mx-auto',
                  'mb-2',
                  'mt-4',
                  'w-full',
                  'max-w-lg',
                  'shrink-0',
                  'rounded-2xl',
                  'border',
                  'border-red-400/40',
                  'bg-red-950/45',
                  'px-4',
                  'py-3',
                  'text-left',
                  'text-sm',
                  'font-medium',
                  'text-red-50',
                )}
              >
                {squadProductMessage}
              </div>
            ) : null}

            <div
              className={clsx(
                'relative z-10 flex w-full max-w-4xl flex-1 mt-60 flex-col items-center justify-center gap-10 pb-3 text-center',
                'min-h-0',
              )}
            >
              {/* Circles + Share */}
              <div className={clsx('flex w-full shrink-0 flex-col items-center gap-2 text-center md:gap-2.5')}>
                <div className={clsx('w-full shrink-0 text-center')}>
                  <div className={clsx('flex flex-wrap items-center justify-center gap-2 font-sans md:gap-6')}>
                    {/* Me */}
                    <div className={clsx('flex', 'items-center', 'gap-2', 'md:gap-4')}>
                      <div className={clsx('flex', 'flex-col', 'items-center', 'gap-1')}>
                        <div
                          className={clsx('relative', 'w-16', 'h-16', 'md:w-22', 'md:h-22', 'overflow-visible')}
                        >
                          <div
                            className={clsx(
                              'w-full',
                              'h-full',
                              'rounded-full',
                              'border-[3.5px]',
                              'border-white/90',
                              'flex',
                              'items-center',
                              'justify-center',
                              'overflow-hidden',
                              'bg-black/10',
                            )}
                          >
                            <img
                              src={myProfile?.displayPictureUrl || ''}
                              alt="me"
                              className={clsx('w-full', 'h-full', 'object-cover')}
                            />
                          </div>
                        </div>
                        <span className="text-sm md:text-20">Me</span>
                      </div>
                    </div>
                    {squadGuestIds.slice(0, 2).map((guestId, i) => (
                      <div key={`g-${i}`} className={clsx('flex', 'items-center', 'gap-2', 'md:gap-6')}>
                        <div className={clsx('flex shrink-0 items-center self-center')}>
                          <img
                            src="/assets/plus.png"
                            alt=""
                            className={clsx('w-4', 'h-4', 'mb-3 ', 'opacity-90')}
                          />
                        </div>
                        <div className={clsx('flex', 'flex-col', 'items-center', 'gap-1')}>
                          <div
                            className={clsx(
                              'relative',
                              'w-16',
                              'h-16',
                              'md:w-22',
                              'md:h-22',
                              'overflow-visible',
                            )}
                          >
                            <div
                              className={clsx(
                                'w-full',
                                'h-full',
                                'rounded-full',
                                'border-[3.5px]',
                                'border-white/90',
                                'flex',
                                'items-center',
                                'justify-center',
                                'overflow-hidden',
                                'bg-black/10',
                              )}
                            >
                              {guestId && guestProfiles[guestId]?.displayPictureUrl ? (
                                <img
                                  src={guestProfiles[guestId].displayPictureUrl}
                                  alt=""
                                  className={clsx('w-full', 'h-full', 'object-cover')}
                                />
                              ) : guestId ? (
                                <span className="text-xl md:text-3xl text-white/60">…</span>
                              ) : (
                                <span
                                  className={clsx(
                                    'text-2xl',
                                    'md:text-4xl',
                                    'font-outfit',
                                    'font-bold',
                                    'break-words',
                                    'text-white',
                                  )}
                                >
                                  ?
                                </span>
                              )}
                            </div>
                            {guestId ? (
                              <button
                                type="button"
                                disabled={squadMemberActionBusyId === guestId}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveSquadMember?.(guestId);
                                }}
                                className="absolute -top-[0] -right-1 z-20 min-w-7 min-h-7 w-7 h-7 rounded-full bg-white border border-white/90 flex items-center justify-center overflow-hidden disabled:opacity-50"
                                aria-label="Remove squad member"
                              >
                                <span
                                  className="font-bold text-sm mix-blend-difference"
                                  style={{ color: "white" }}
                                >
                                  ✕
                                </span>
                              </button>

                            ) : null}
                          </div>
                          <span className="text-sm md:text-16 ">
                            {guestId ? guestProfiles[guestId]?.username || 'Friend' : 'Who'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={clsx('flex w-full shrink-0 flex-col items-center')}>
                  {canSquadMeet ? (
                    <div
                      className={clsx(
                        'mb-2',
                        'inline-flex',
                        'items-center',
                        'gap-1',
                        'rounded-full',
                        'bg-[#0A032D]/20',
                        'px-4.5',
                        'py-1.5',
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => setSquadLobbyMicMuted((prev) => !prev)}
                        className={clsx(
                          'inline-flex h-9 w-9 items-center justify-center rounded-full border transition',
                          squadLobbyMicMuted
                            ? 'border-red-300/70 bg-red-500/20 text-red-100'
                            : 'border-none text-white hover:bg-white/10',
                        )}
                        title={squadLobbyMicMuted ? 'Unmute microphone' : 'Mute microphone'}
                      >
                        {squadLobbyMicMuted ? (
                          <IoMicOff className="text-lg" />
                        ) : (
                          <IoMic className="text-lg" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setSquadLobbyAudioOff((prev) => !prev)}
                        className={clsx(
                          'inline-flex h-9 w-9 items-center justify-center rounded-full border transition',
                          squadLobbyAudioOff
                            ? 'border-yellow-300/70 bg-yellow-500/20 text-yellow-100'
                            : 'border-none text-white hover:bg-white/10',
                        )}
                        title={squadLobbyAudioOff ? 'Turn audio on' : 'Turn audio off'}
                      >
                        {squadLobbyAudioOff ? (
                          <IoVolumeMute className="text-lg" />
                        ) : (
                          <IoVolumeHigh className="text-lg" />
                        )}
                      </button>
                    </div>
                  ) : null}

                  <div
                    className={clsx(
                      'inline-flex',
                      'shrink-0',
                      'mt-2',
                      'items-center',
                      'gap-7',
                      'rounded-full',
                      'border',
                      'border-white/15',
                      'bg-[#0A032D]/50',
                      'px-8',
                      'py-2.5',
                      'font-sans',
                      'md:gap-6',
                      'md:px-16',
                      'md:py-2.5',
                    )}
                  >
                    <span className={clsx('text-white', 'text-sm', 'mr-1', 'font-outfit', 'text-16')}>
                      Share to
                    </span>
                    <button
                      type="button"
                      disabled={squadShareBusy}
                      onClick={() => void shareSquadInvite('generic')}
                      className={clsx(
                        'hover:bg-white/10',
                        'p-2',
                        'rounded-full',
                        'transition',
                        'text-white',
                        'disabled:opacity-50',
                      )}
                    >
                      <img src="/shareicon3.svg" className={clsx('w-[25px]', 'h-[25px]')} alt="" />
                    </button>
                    <button
                      type="button"
                      disabled={squadShareBusy}
                      onClick={() => void shareSquadInvite('generic')}
                      className={clsx(
                        'hover:bg-white/10',
                        'p-2',
                        'rounded-full',
                        'transition',
                        'text-white',
                        'disabled:opacity-50',
                      )}
                    >
                      <img src="/shareicon2.svg" className={clsx('w-[25x]', 'h-[25px]')} alt="" />
                    </button>
                    <button
                      type="button"
                      disabled={squadShareBusy}
                      onClick={() => void shareSquadInvite('whatsapp')}
                      className={clsx(
                        'hover:bg-white/10',
                        'p-2',
                        'rounded-full',
                        'transition',
                        'text-white',
                        'disabled:opacity-50',
                      )}
                    >
                      <img src="/shareicon1.svg" className={clsx('w-[25px]', 'h-[25px]')} alt="" />
                    </button>
                    <button
                      type="button"
                      disabled={squadShareBusy}
                      onClick={() => void shareSquadInvite('copy')}
                      className={clsx(
                        'hover:bg-white/10',
                        'p-2',
                        'rounded-full',
                        'transition',
                        'text-white',
                        'disabled:opacity-50',
                      )}
                    >
                      <img src="/shareicon4.svg" className={clsx('w-[25px]', 'h-[25px]')} alt="" />
                    </button>
                  </div>
                </div>
              </div>

              {squadHomeInviteMeetSlotActive && canSquadMeet ? (
                <MeetNowButton
                  onClick={handleSquadEnterCall}
                  isSearching={squadMeetBusy}
                  searchingText="Starting..."
                  text="Meet Someone now"
                  className="h-20 w-[50%]"
                  iconClass="md:text-xl transition-all md:h-6 md:w-6 "
                  borderClass="md:border-[1.8px] md:border-b-[4.4px] border border-b-[3px] md:rounded-[20px] rounded-[16px]"
                  isVideoOn={isVideoOn}
                  onVideoClick={() => setIsVideoOn(!isVideoOn)}
                />
              ) : squadHomeInviteMeetSlotActive && quickInviteFriends.length > 0 ? (
                <SquadQuickInviteStrip
                  friends={quickInviteFriends}
                  busyId={quickInviteBusyId}
                  pendingInviteeIds={quickInvitePendingIds}
                  onInvite={(id) => void handleQuickSquadInvite(id)}
                  onCancelInvite={(id) => void handleQuickSquadCancelInvite(id)}
                  onSeeAll={() => setSquadInviteOpen(true)}
                  className="w-[79%]"
                />
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* SHARED BOTTOM BAR (ALWAYS VISIBLE) */}
      <div
        className={clsx(
          'absolute',
          'px-5',
          'bottom-16',
          'left-11',
          'right-11',
          'flex',
          'items-center',
          'justify-between',
          'z-[100]',
          isSearching && 'hidden',
        )}
      >
        {/* Left side */}
        <div className={clsx('flex', 'items-center', 'h-[72px]')}>
          {mode === 'solo' ? (
            <div className={clsx('flex', 'gap-2', 'items-center')}>
              <div
                className={clsx(
                  'border-2',
                  'p-3',
                  'rounded-full',
                  'flex',
                  'items-center',
                  'justify-center',
                  'border-b-4',
                  'border-white/40',
                )}
              >
                <Link href="/beam-tv">
                  <button
                    className={clsx(
                      'relative',
                      'h-10',
                      'w-10',
                      'l',
                      'p-3',
                      'shadow-md',
                      'hover:border-white',
                      'hover:scale-110',
                      'hover:shadow-[0_0_20px_rgba(168,85,247,0.4)]',
                      'active:scale-95',
                      'active:border-b-2',
                      'transition-all',
                      'duration-300',
                    )}
                  >
                    <img
                      src="/tvfame.png"
                      className={clsx('absolute', 'inset-0', 'w-full', 'h-full', 'object-contain')}
                    />
                    <img
                      src="/beamtv.png"
                      className={clsx(
                        'absolute',
                        'inset-0',
                        'm-auto',
                        'w-6',
                        'h-6',
                        'object-contain',
                        'ml-1',
                        'mt-3',
                      )}
                    />
                  </button>
                </Link>
              </div>

              <div className={clsx('border-2', 'rounded-full', 'border-b-4', 'border-white/40')}>
                <Link href="/cards">
                  <button
                    className={clsx(
                      'h-16',
                      'w-16',
                      'rounded-full',
                      'p-3',
                      'shadow-md',
                      'transition-all',
                      'duration-300',
                      'hover:scale-110',
                      'hover:shadow-[0_0_20px_rgba(168,85,247,0.4)]',
                    )}
                  >
                    <img src="/hugeiconscards.svg" alt="cards" />
                  </button>
                </Link>
              </div>
            </div>
          ) : (
            <div className={clsx('flex', 'gap-4', 'items-center')}>
              <button
                type="button"
                onClick={() => setSquadInviteOpen(true)}
                className={clsx('border', 'rounded-full', 'p-2', 'border-white/70', 'w-11', 'h-11')}
                title="Invite friends"
              >
                <img
                  src="/assets/search-icon.svg"
                  alt=""
                  className={clsx(
                    'w-6',
                    'h-6',
                    'mx-auto',
                    'hover:border-white',
                    'hover:scale-120',
                    'hover:shadow-[0_0_20px_rgba(168,85,247,0.4)]',
                    'active:scale-95',
                    'transition-all',
                    'duration-300',
                  )}
                />
              </button>

              <button
                type="button"
                onClick={() => setSquadInviteOpen(true)}
                className={clsx('border', 'rounded-full', 'p-2', 'border-white/70', 'w-11', 'h-11')}
                title="Invite friends"
              >
                <img
                  src="/assets/Vector.svg"
                  alt=""
                  className={clsx(
                    'w-6',
                    'h-6',
                    'mx-auto',
                    'hover:border-white',
                    'hover:scale-120',
                    'hover:shadow-[0_0_20px_rgba(168,85,247,0.4)]',
                    'active:scale-95',
                    'transition-all',
                    'duration-300',
                  )}
                />
              </button>
            </div>
          )}
        </div>

        {/* Solo / Squad toggle */}
        <div
          className={clsx(
            'relative',
            'w-fit',
            'flex',
            'gap-2',
            'border-white/60',
            'border',
            'rounded-full',
            'p-1',
            'bg-black/10',
          )}
        >
          {/* Sliding Pill */}
          <div
            className={clsx(
              'absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full transition-all duration-500 cubic-bezier(0.16, 1, 0.3, 1) border-[1.5px] border-white/70 shadow-[0_0_15px_rgba(168,85,247,0.3)]',
              mode === 'solo' ? 'left-1 bg-black/20' : 'left-[calc(50%+2px)] bg-black/40',
            )}
          />

          <button
            onClick={() => setMode('solo')}
            className={clsx(
              'px-7 py-2 rounded-full text-[14px] transition-all duration-300 hover:scale-105 z-10 relative',
              mode === 'solo' ? 'text-white' : 'text-white/40 hover:text-white/60',
            )}
          >
            Solo
          </button>

          <button
            onClick={() => setMode('squad')}
            className={clsx(
              'px-7 py-2 rounded-full text-[14px] transition-all duration-300 hover:scale-105 z-10 relative',
              mode === 'squad' ? 'text-white' : 'text-white/40 hover:text-white/60',
            )}
          >
            Squad
          </button>
        </div>
      </div>
    </div>
  );
}
