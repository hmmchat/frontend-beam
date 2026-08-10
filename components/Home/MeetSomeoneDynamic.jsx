'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import useMeetSomeone from './hooks/useMeetSomeone';
import MeetSomeoneDesktopLeft from './MeetSomeoneDesktopLeft';
import MeetSomeoneDesktopRight from './MeetSomeoneDesktopRight';
import MeetSomeoneNew from './MeetSomeoneNew';
import OverlayLayer from '@/components/ui/OverlayLayer';
import GenderModal from '@/components/modals/GenderModal';
import LocationModal from '@/components/modals/LocationModal';
import CoinModal from '@/components/modals/CoinModal';
import SquadInviteFriendsModal from '@/components/Home/SquadInviteFriendsModal';

export default function MeetSomeoneDynamic() {
  const router = useRouter();
  const state = useMeetSomeone();
  const [purchaseToast, setPurchaseToast] = useState(null);

  const {
    // State
    currentCard,
    setCurrentCard,
    mode,
    setMode,
    coins,
    setCoins,
    isGenderModalOpen,
    setIsGenderModalOpen,
    isLocationModalOpen,
    setIsLocationModalOpen,
    myProfile,
    squadInviteOpen,
    setSquadInviteOpen,
    genderFilter,
    setGenderFilter,
    scale,
    translateY,
    squadLobby,
    squadMeetBusy,
    squadShareBusy,
    quickInviteFriends,
    quickInviteBusyId,
    quickInvitePendingIds,
    squadMemberActionBusyId,
    squadProductMessage,
    squadLobbyCall,
    squadLobbyMicMuted,
    setSquadLobbyMicMuted,
    squadLobbyAudioOff,
    setSquadLobbyAudioOff,
    guestProfiles,
    isSearching,
    setIsSearching,
    isResumeLoading,
    isCoinModalOpen,
    setIsCoinModalOpen,
    waitingForMatch,
    waitingMatchedUser,
    waitingMessage,
    activeMeetingCount,
    overlay,
    setOverlay,
    currentImageIndex,
    setCurrentImageIndex,
    unreadCount,
    isVideoOn,
    setIsVideoOn,
    discoveryBlockedByOtherTab,
    deckPhase,
    availableCities,
    handoffSecondsLeft,
    handoffCountdownSeconds,
    // Derived
    myUserId,
    squadGuestIds,
    isInSquadLobby,
    canSquadMeet,
    squadHomeInviteMeetSlotActive,
    allPhotos,
    discoveryCityFaceUser,
    // Handlers
    fetchMyProfile,
    fetchWalletBalance,
    beginDiscoverySearch,
    handleRaincheck,
    handleProceed,
    handleCancelWaiting,
    handleSelectLocation,
    cancelCityHandoff,
    handleNextImage,
    handlePrevImage,
    toggleFullscreen,
    // Squad handlers
    refreshSquadLobby,
    handleSquadEnterCall,
    handleRemoveSquadMember,
    shareSquadInvite,
    loadQuickInviteFriends,
    handleQuickSquadInvite,
    handleQuickSquadCancelInvite,
  } = state;

  // While waiting for peer Meet rn, always render the pinned partner face card.
  const faceCard =
    waitingForMatch && waitingMatchedUser ? waitingMatchedUser : currentCard;
  const faceDeckPhase =
    waitingForMatch && waitingMatchedUser ? 'user' : deckPhase;

  return (
    <>
      <div
        className={clsx(
          'relative',
          'lg:min-h-screen',
          'h-[100dvh]',
          'w-full',
          'overflow-hidden',
          'font-[family-name:var(--font-otomanopee)]',
        )}
      >
        <main className={clsx('grid', 'grid-cols-1', 'lg:grid-cols-2', 'h-full', 'min-h-0', 'overflow-hidden')}>
          {/* MOBILE / TABLET VIEW (CONDITIONAL) */}
          {!isSearching && (
            <div className={clsx('block', 'lg:hidden')}>
              <MeetSomeoneNew
                onMeetNow={async () => {
                  await beginDiscoverySearch();
                }}
                mode={mode}
                setMode={setMode}
                coins={coins}
                onWalletRefresh={fetchWalletBalance}
                activeUsers={activeMeetingCount}
                myProfile={myProfile}
                unreadCount={unreadCount}
                // Squad props
                squadLobby={squadLobby}
                guestProfiles={guestProfiles}
                squadGuestIds={squadGuestIds}
                canSquadMeet={canSquadMeet}
                handleSquadEnterCall={handleSquadEnterCall}
                shareSquadInvite={shareSquadInvite}
                squadShareBusy={squadShareBusy}
                squadMeetBusy={squadMeetBusy}
                handleRemoveSquadMember={handleRemoveSquadMember}
                squadMemberActionBusyId={squadMemberActionBusyId}
                squadLobbyMicMuted={squadLobbyMicMuted}
                setSquadLobbyMicMuted={setSquadLobbyMicMuted}
                squadLobbyAudioOff={squadLobbyAudioOff}
                setSquadLobbyAudioOff={setSquadLobbyAudioOff}
                quickInviteFriends={quickInviteFriends}
                quickInviteBusyId={quickInviteBusyId}
                quickInvitePendingIds={quickInvitePendingIds}
                handleQuickSquadInvite={handleQuickSquadInvite}
                handleQuickSquadCancelInvite={handleQuickSquadCancelInvite}
                refreshSquadLobby={refreshSquadLobby}
                loadQuickInviteFriends={loadQuickInviteFriends}
                squadProductMessage={squadProductMessage}
                isVideoOn={isVideoOn}
                onVideoClick={() => setIsVideoOn(!isVideoOn)}
              />
            </div>
          )}

          {/* LEFT SIDE (DESKTOP) */}
          <MeetSomeoneDesktopLeft
            isSearching={isSearching}
            currentCard={faceCard}
            isResumeLoading={isResumeLoading}
            discoveryCityFaceUser={discoveryCityFaceUser}
            currentImageIndex={currentImageIndex}
            setCurrentImageIndex={setCurrentImageIndex}
            waitingForMatch={waitingForMatch}
            handlePrevImage={handlePrevImage}
            handleNextImage={handleNextImage}
            activeMeetingCount={activeMeetingCount}
            handleRaincheck={handleRaincheck}
            handleProceed={handleProceed}
            waitingMessage={waitingMessage}
            handleCancelWaiting={handleCancelWaiting}
            setIsSearching={setIsSearching}
            setCurrentCard={setCurrentCard}
            deckPhase={faceDeckPhase}
            availableCities={availableCities}
            handoffSecondsLeft={handoffSecondsLeft}
            handoffCountdownSeconds={handoffCountdownSeconds}
            cancelCityHandoff={cancelCityHandoff}
            handleSelectLocation={handleSelectLocation}
          />

          {/* RIGHT SIDE (DESKTOP + MOBILE SEARCHING) */}
          <MeetSomeoneDesktopRight
            isSearching={isSearching}
            currentCard={faceCard}
            isResumeLoading={isResumeLoading}
            mode={mode}
            setMode={setMode}
            router={router}
            myProfile={myProfile}
            coins={coins}
            setIsCoinModalOpen={setIsCoinModalOpen}
            unreadCount={unreadCount}
            activeMeetingCount={activeMeetingCount}
            genderFilter={genderFilter}
            discoveryBlockedByOtherTab={discoveryBlockedByOtherTab}
            overlay={overlay}
            setOverlay={setOverlay}
            isVideoOn={isVideoOn}
            setIsVideoOn={setIsVideoOn}
            scale={scale}
            translateY={translateY}
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
            beginDiscoverySearch={beginDiscoverySearch}
            toggleFullscreen={toggleFullscreen}
            setIsGenderModalOpen={setIsGenderModalOpen}
            setIsLocationModalOpen={setIsLocationModalOpen}
            deckPhase={faceDeckPhase}
            availableCities={availableCities}
            handoffSecondsLeft={handoffSecondsLeft}
            handoffCountdownSeconds={handoffCountdownSeconds}
            cancelCityHandoff={cancelCityHandoff}
            handleSelectLocation={handleSelectLocation}
            // Squad
            squadLobby={squadLobby}
            squadMeetBusy={squadMeetBusy}
            squadShareBusy={squadShareBusy}
            squadLobbyMicMuted={squadLobbyMicMuted}
            setSquadLobbyMicMuted={setSquadLobbyMicMuted}
            squadLobbyAudioOff={squadLobbyAudioOff}
            setSquadLobbyAudioOff={setSquadLobbyAudioOff}
            squadGuestIds={squadGuestIds}
            guestProfiles={guestProfiles}
            canSquadMeet={canSquadMeet}
            squadHomeInviteMeetSlotActive={squadHomeInviteMeetSlotActive}
            squadProductMessage={squadProductMessage}
            squadMemberActionBusyId={squadMemberActionBusyId}
            handleSquadEnterCall={handleSquadEnterCall}
            handleRemoveSquadMember={handleRemoveSquadMember}
            shareSquadInvite={shareSquadInvite}
            quickInviteFriends={quickInviteFriends}
            quickInviteBusyId={quickInviteBusyId}
            quickInvitePendingIds={quickInvitePendingIds}
            handleQuickSquadInvite={handleQuickSquadInvite}
            handleQuickSquadCancelInvite={handleQuickSquadCancelInvite}
            setSquadInviteOpen={setSquadInviteOpen}
          />
        </main>

        <OverlayLayer
          open={overlay.open}
          url={overlay.url}
          title={overlay.title}
          onClose={() => setOverlay({ open: false, url: '', title: '' })}
        />

        {/* Modals */}
        <GenderModal
          isOpen={isGenderModalOpen}
          onClose={() => {
            setIsGenderModalOpen(false);
            setGenderFilter(localStorage.getItem('genderPreference') || 'ALL');
          }}
          userCoins={coins}
          onCoinsUpdated={(cost) => {
            setCoins((prev) => Math.max(0, prev - cost));
          }}
          onStartBeaming={() => {
            setGenderFilter(localStorage.getItem('genderPreference') || 'ALL');
            if (!isSearching) {
              beginDiscoverySearch();
            }
          }}
        />
        <LocationModal
          isOpen={isLocationModalOpen}
          onClose={() => {
            setIsLocationModalOpen(false);
            fetchMyProfile();
          }}
        />
        <CoinModal
          isOpen={isCoinModalOpen}
          onClose={() => setIsCoinModalOpen(false)}
          onSuccess={async ({ coinsCredited }) => {
            await fetchWalletBalance();
            const credited = Number(coinsCredited) || 0;
            setPurchaseToast(
              credited > 0
                ? `Added ${credited.toLocaleString()} coins`
                : 'Coins added to your wallet'
            );
            window.setTimeout(() => setPurchaseToast(null), 3000);
          }}
        />
        {purchaseToast && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[200] bg-slate-900/80 backdrop-blur-md border border-white/20 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="font-outfit text-sm font-semibold">{purchaseToast}</span>
          </div>
        )}
        <SquadInviteFriendsModal
          open={squadInviteOpen}
          onClose={() => setSquadInviteOpen(false)}
          onInviteSent={() => {
            void refreshSquadLobby();
            void loadQuickInviteFriends();
          }}
          squadMemberIds={squadLobby?.memberIds || []}
        />
      </div>
    </>
  );
}
