'use client';

import { useState } from 'react';
import clsx from 'clsx';
import ProfileGuard from '@/components/auth/ProfileGuard';
import OverlayLayer from '@/components/ui/OverlayLayer';
import CoinModal from '@/components/modals/CoinModal';

// VideoChat sub-components
import RemoteVideoTile from '@/components/VideoChat/RemoteVideoTile';
import LocalVideoSection from '@/components/VideoChat/LocalVideoSection';
import BroadcastHud from '@/components/VideoChat/BroadcastHud';
import WaitlistModal from '@/components/VideoChat/WaitlistModal';
import RandomnessModal from '@/components/VideoChat/RandomnessModal';
import IcebreakerToast from '@/components/VideoChat/IcebreakerToast';
import QuickActions from '@/components/video-chat/QuickActions';
import MobileMultiUserControls from '@/components/VideoChat/MobileMultiUserControls';
import GiftOverlay from '@/components/VideoChat/GiftOverlay';
import DareOverlay from '@/components/VideoChat/DareOverlay';
import DareProposalOverlay from '@/components/VideoChat/DareProposalOverlay';
import MemeLoader from '@/components/VideoChat/MemeLoader';
import GroupMembersModal from '@/components/VideoChat/GroupMembersModal';
import SummoningOverlay from '@/components/VideoChat/SummoningOverlay';
import VideoChatMask from '@/components/VideoChat/VideoChatMask';

// All logic lives here
import useVideoChat from '@/components/VideoChat/hooks/useVideoChat';

export default function VideoChat() {
  return (
    <ProfileGuard>
      <VideoChatContent />
    </ProfileGuard>
  );
}

function VideoChatContent() {
  const {
    // Refs
    localVideoRef,
    // State
    roomInfo, status, remoteStreams, isCamOff, error,
    localUserInfo, partnerInfo, friendRequestSentTo, friendshipWithRemote,
    isRainchecking, showRandomness, setShowRandomness,
    isEnablingPullStranger, pullStrangerCooldownSec,
    callRoles, roomHealthDebug,
    icebreaker, showIcebreaker, chatMessages, chatInput, setChatInput,
    showChatInput, setShowChatInput, coins,
    isCoinModalOpen, setIsCoinModalOpen, isBroadcasting,
    broadcastHud, setBroadcastHud, showWaitlist, setShowWaitlist,
    isGiftModalOpen, setIsGiftModalOpen, isDareOpen, isSendingDare,
    selectedGiftId, setSelectedGiftId, activeRemoteGifts, activeLocalGifts,
    activeDareProposal, dareAcceptanceStatus, randomDares, savedDares,
    giftItems, isRolling, setIsRolling, isBroken, setIsBroken,
    waitlist, waitlistLoading, waitlistError,
    selectedWaitlistUser, setSelectedWaitlistUser,
    broadcastChatWarning, overlay, setOverlay,
    isScreenSharing, loadingMeme, showGroupMembersModal, setShowGroupMembersModal,
    reportedUserIds, reportNotification,
    // Computed
    totalLayoutSlots,
    // Handlers
    toggleCam, toggleScreenShare,
    handleSendFriendRequest, handleReportUser,
    handleKickRemote, handleLeaveGroupOrRaincheck,
    handlePullStranger, handleCancelPullStranger,
    handleBeamcast, handleStopBeamcast,
    handleIcebreaker, toggleRandomness,
    handleShareBroadcastLink, copyShareUrl,
    refreshWaitlist, acceptFromWaitlist,
    sendChatMessage, handleChatButtonClick,
    handleLocalGiftComplete, handleRemoteGiftComplete, handleRemoteGiftDismissStart, handleSendGift,
    handleDareSync, handleDareResponse, handleCancelDare, handleSendDare,
    openDareOverlay,
    handleSaveCustomDare, handleDeleteCustomDare,
    refreshWallet,
    // Render helpers
    localVideoProps, getRemoteFriendTileProps, getRemoteTileProfile,
    canKickRemoteUser, shouldShowReportEmojiOnRemoteTile,
  } = useVideoChat();

  const [purchaseToast, setPurchaseToast] = useState(null);

  // ---- Derived values ------------------------------------------------------
  const isPullStrangerDisabled = (remoteStreams.length + 1) >= 4 || isEnablingPullStranger || (pullStrangerCooldownSec > 0);
  const isRoomFull = (remoteStreams.length + 1) >= 4;
  const getRemoteGifts = (userId) =>
    (activeRemoteGifts || []).filter((item) => String(item.targetUserId) === String(userId));

  const getRemoteActiveDareText = (userId) => {
    if (!userId) return undefined;
    const dareGift = (activeRemoteGifts || []).find(g => String(g.targetUserId) === String(userId) && g.gift?.isDare && !g.isDismissed);
    return dareGift?.gift?.dareText || dareGift?.dareText;
  };

  const activeLocalDare = (activeLocalGifts || []).find(g => g.isDare && !g.isDismissed);
  const activeLocalDareText = activeLocalDare?.dareText;

  const hasActiveDare = (activeRemoteGifts || []).some(g => g.gift?.isDare && !g.isDismissed) || !!activeLocalDareText;

  // Gift border + banner effect — any non-dare gift currently animating
  const hasActiveGift = (
    (activeRemoteGifts || []).some(g => !g.gift?.isDare && !g.isDismissed) ||
    (activeLocalGifts || []).some(g => !g.isDare && !g.isDismissed)
  );

  // Get gift banner text for a given remote userId (e.g. "You gifted: 💎 Iron Man")
  const getRemoteActiveGiftLabel = (userId) => {
    if (!userId) return undefined;
    const g = (activeRemoteGifts || []).find(
      item => String(item.targetUserId) === String(userId) && !item.gift?.isDare && !item.isDismissed
    );
    if (!g) return undefined;
    const gift = g.gift || g;
    const diamonds = gift.diamonds || gift.giftPrice || '';
    const giftName = gift.name || '';
    return `You gifted${giftName ? `: ${giftName}` : ''}${diamonds ? ` 💎 ${diamonds}` : ''}`;
  };

  // Get gift banner text for local tile (e.g. "Austin gifted you: 💎 25000")
  const activeLocalGiftItem = (activeLocalGifts || []).find(g => !g.isDare && !g.isDismissed);
  const activeLocalGiftLabel = activeLocalGiftItem
    ? (() => {
      const senderStream = remoteStreams.find(s => String(s.userId) === String(activeLocalGiftItem.senderId));
      const senderName = senderStream?.name || 'Someone';
      const diamonds = activeLocalGiftItem.diamonds || '';
      const giftName = activeLocalGiftItem.name || '';
      return `${senderName} gifted you${giftName ? `: ${giftName}` : ''}${diamonds ? ` 💎 ${diamonds}` : ''}`;
    })()
    : undefined;

  // Pick root background: dare → red, gift → vivid purple, idle → default purple
  const rootBg = hasActiveDare
    ? 'bg-[#8A1515]'
    : hasActiveGift
      ? 'bg-[#4E0093]'
      : 'bg-[#4E0093]';

  return (
    <div className={clsx('h-dvh', 'w-screen', rootBg, 'flex', 'overflow-hidden', 'font-sans', 'transition-colors', 'duration-500')}>

      {/* Background */}
      <div
        className={clsx(
          "absolute inset-0 z-0 transition-opacity duration-500",
          (hasActiveDare || hasActiveGift) ? "opacity-0" : "opacity-100"
        )}
        style={{ backgroundImage: 'url(/assets/mb.jpg)', backgroundRepeat: 'repeat', backgroundSize: 'cover' }}
      />

      <div className={clsx('flex-1', 'min-h-0', 'min-w-0', 'flex', 'flex-col', 'md:flex-row', 'p-2', 'md:gap-2', 'relative')}>

        {/* ================================================================
            LAYOUT ENGINE
        ================================================================ */}
        {remoteStreams.length === 0 ? (

          /* ---- No remote: loading / broadcasting ---- */
          isBroadcasting ? (
            <div className={clsx('flex-1', 'min-h-0', 'min-w-0', 'relative', 'md:rounded-[60px]', 'overflow-hidden', 'bg-gray-950')}>
              <LocalVideoSection {...localVideoProps} />
            </div>
          ) : (
            <>
              <MemeLoader loadingMeme={loadingMeme} />
              <div className={clsx('flex-1', 'min-h-0', 'min-w-0', 'relative', 'md:rounded-[60px]', 'overflow-hidden')}>
                <div className={clsx('md:hidden', 'absolute', 'inset-0', 'h-[95%]', 'w-[95%]', 'border', 'border-white/40', 'rounded-3xl', 'md:rounded-[60px]', 'pointer-events-none', 'z-20', 'transition-colors', 'box-border', 'mx-auto', 'my-auto')} />
                <LocalVideoSection {...localVideoProps} hideAllControls={true} />
              </div>
            </>
          )

        ) : totalLayoutSlots === 2 ? (

          /* ---- 1:1 Matched Layout ---- */
          <>
            <VideoChatMask slots={2} giftAnimationActive={hasActiveGift || hasActiveDare} />
            <RemoteVideoTile
              className={clsx('h-[58%]', 'md:h-auto', 'md:flex-1', 'rounded-t-[1.5rem]', 'md:rounded-[60px]')}
              key={`remote-${remoteStreams[0].userId}`}
              userId={remoteStreams[0].userId}
              isReported={reportedUserIds.has(remoteStreams[0].userId)}
              onReportUser={handleReportUser}
              {...getRemoteFriendTileProps(remoteStreams[0])}
              stream={remoteStreams[0].stream}
              screenShareStream={remoteStreams[0].screenStream || null}
              {...getRemoteTileProfile(remoteStreams[0])}
              showReportEmoji={shouldShowReportEmojiOnRemoteTile(remoteStreams[0])}
              showKickParticipant={canKickRemoteUser(remoteStreams[0].userId)}
              onKickParticipant={() => handleKickRemote(remoteStreams[0].userId)}
              showLeaveNextButton={status === 'connected'}
              leaveIconType={remoteStreams.length > 1 ? 'exit' : 'next'}
              onLeaveOrNext={handleLeaveGroupOrRaincheck}
              isRainchecking={isRainchecking}
              gifts={getRemoteGifts(remoteStreams[0]?.userId)}
              onGiftAnimationComplete={handleRemoteGiftComplete}
              onGiftDismissStart={handleRemoteGiftDismissStart}
              activeRemoteDareText={getRemoteActiveDareText(remoteStreams[0].userId)}
              activeGiftLabel={getRemoteActiveGiftLabel(remoteStreams[0].userId)}
              activeLocalGiftLabel={activeLocalGiftLabel}
              giftAnimationActive={hasActiveGift || hasActiveDare}
            />
            <div className={clsx('h-[42%] md:h-auto md:flex-1', 'min-h-0', 'min-w-0', 'relative', 'rounded-b-[1.5rem]', 'md:rounded-[60px]', 'overflow-hidden', 'bg-gray-950', 'isolate')} style={{ transform: 'translateZ(0)' }}>
              <LocalVideoSection {...localVideoProps} roundedClass="rounded-b-[1.5rem]" activeLocalDareText={activeLocalDareText} activeLocalGiftLabel={activeLocalGiftLabel} giftAnimationActive={hasActiveGift || hasActiveDare} />
            </div>
          </>

        ) : totalLayoutSlots === 3 ? (

          /* ---- 3-User Layout ---- */
          <>
            <VideoChatMask slots={3} giftAnimationActive={hasActiveGift || hasActiveDare} />
            <RemoteVideoTile
              className={clsx('h-[58.2%]', 'md:h-auto', 'md:flex-1', 'rounded-t-[1.5rem]', 'md:rounded-[60px]')}
              key={`remote-${remoteStreams[0].userId}`}
              userId={remoteStreams[0].userId}
              isReported={reportedUserIds.has(remoteStreams[0].userId)}
              onReportUser={handleReportUser}
              {...getRemoteFriendTileProps(remoteStreams[0])}
              onSendFriendRequest={() => {
                remoteStreams.forEach(s => {
                  if (s.userId && !friendshipWithRemote[s.userId] && !friendRequestSentTo[s.userId]) handleSendFriendRequest(s.userId);
                });
              }}
              stream={remoteStreams[0].stream}
              screenShareStream={remoteStreams[0].screenStream || null}
              {...getRemoteTileProfile(remoteStreams[0])}
              showReportEmoji={shouldShowReportEmojiOnRemoteTile(remoteStreams[0])}
              showKickParticipant={canKickRemoteUser(remoteStreams[0].userId)}
              onKickParticipant={() => handleKickRemote(remoteStreams[0].userId)}
              showLeaveNextButton={status === 'connected' && callRoles.isLocalHost}
              leaveIconType={remoteStreams.length > 1 ? 'exit' : 'next'}
              onLeaveOrNext={handleLeaveGroupOrRaincheck}
              isRainchecking={isRainchecking}
              hideNameOnMobile={true}
              gifts={getRemoteGifts(remoteStreams[0]?.userId)}
              onGiftAnimationComplete={handleRemoteGiftComplete}
              onGiftDismissStart={handleRemoteGiftDismissStart}
              multiUserAvatars={remoteStreams.map(s => getRemoteTileProfile(s).displayPictureUrl)}
              onClickMultiUserAvatars={() => setShowGroupMembersModal(true)}
              onReportClick={() => setShowGroupMembersModal(true)}
              showMinusButton={false}
              onMinus={() => handleKickRemote(remoteStreams[0].userId)}
              activeRemoteDareText={getRemoteActiveDareText(remoteStreams[0].userId)}
              activeGiftLabel={getRemoteActiveGiftLabel(remoteStreams[0].userId)}
              activeLocalGiftLabel={activeLocalGiftLabel}
              giftAnimationActive={hasActiveGift || hasActiveDare}
            />
            <div className={clsx('flex', 'min-h-0', 'min-w-0', 'flex-1', 'md:flex-col', 'md:gap-2')}>
              <div className={clsx('flex-1', 'min-h-0', 'min-w-0', 'relative', 'rounded-bl-[1.5rem]', 'md:rounded-[60px]', 'overflow-hidden', 'isolate')} style={{ transform: 'translateZ(0)' }}>
                <RemoteVideoTile
                  key={remoteStreams[1] ? `remote-${remoteStreams[1].userId}` : 'summoning-slot'}
                  userId={remoteStreams[1]?.userId ?? ''}
                  isReported={remoteStreams[1] ? reportedUserIds.has(remoteStreams[1].userId) : false}
                  onReportUser={handleReportUser}
                  {...(remoteStreams[1] ? getRemoteFriendTileProps(remoteStreams[1]) : { showAddFriend: false })}
                  stream={remoteStreams[1]?.stream ?? null}
                  screenShareStream={remoteStreams[1]?.screenStream ?? null}
                  {...(remoteStreams[1] ? getRemoteTileProfile(remoteStreams[1]) : {})}
                  showReportEmoji={remoteStreams[1] ? shouldShowReportEmojiOnRemoteTile(remoteStreams[1]) : false}
                  showKickParticipant={remoteStreams[1] ? canKickRemoteUser(remoteStreams[1].userId) : false}
                  onKickParticipant={remoteStreams[1] ? () => handleKickRemote(remoteStreams[1].userId) : undefined}
                  borderBottomClass="md:bottom-4"
                  hideNameOnMobile={true}
                  hideAddFriendOnMobile={true}
                  hideReportOnMobile={true}
                  hideReport={!remoteStreams[1]}
                  gifts={getRemoteGifts(remoteStreams[1]?.userId)}
                  onGiftAnimationComplete={handleRemoteGiftComplete}
                  onGiftDismissStart={handleRemoteGiftDismissStart}
                  className={clsx('absolute', 'inset-0', 'w-full', 'h-full', 'rounded-bl-[1.5rem]')}
                  showMinusButton={!!remoteStreams[1] && callRoles.isLocalHost}
                  onMinus={remoteStreams[1] ? () => handleKickRemote(remoteStreams[1].userId) : undefined}
                  activeRemoteDareText={getRemoteActiveDareText(remoteStreams[1]?.userId)}
                />
                {!remoteStreams[1] && (
                  <SummoningOverlay
                    cooldownActive={pullStrangerCooldownSec > 0}
                    onCancel={handleCancelPullStranger}
                    variant="layout3"
                  />
                )}
              </div>
              <div className={clsx('flex-1', 'min-h-0', 'min-w-0', 'relative', 'rounded-br-[1.5rem]', 'md:rounded-[60px]', 'overflow-hidden', 'bg-gray-950', 'isolate')} style={{ transform: 'translateZ(0)' }}>
                <LocalVideoSection {...localVideoProps} hideMobileControlsRow={true} roundedClass="rounded-br-[1.5rem]" activeLocalDareText={activeLocalDareText} activeLocalGiftLabel={activeLocalGiftLabel} giftAnimationActive={hasActiveGift || hasActiveDare} />
              </div>
            </div>
          </>

        ) : (

          /* ---- Grid Layout (4 participants): 2×2 ---- */
          <>
            <VideoChatMask slots={4} giftAnimationActive={hasActiveGift || hasActiveDare} />
            <div className={clsx('grid', 'min-h-0', 'min-w-0', 'flex-1', 'grid-cols-2', 'grid-rows-[58.2%]', 'md:grid-rows-2', 'md:gap-2')}>
              <RemoteVideoTile
                className={clsx('flex-1', 'rounded-tl-[1.5rem]', 'md:rounded-[60px]')}
                key={`remote-${remoteStreams[0].userId}`}
              userId={remoteStreams[0].userId}
              isReported={reportedUserIds.has(remoteStreams[0].userId)}
              onReportUser={handleReportUser}
              {...getRemoteFriendTileProps(remoteStreams[0])}
              onSendFriendRequest={() => {
                remoteStreams.forEach(s => {
                  if (s.userId && !friendshipWithRemote[s.userId] && !friendRequestSentTo[s.userId]) handleSendFriendRequest(s.userId);
                });
              }}
              stream={remoteStreams[0].stream}
              screenShareStream={remoteStreams[0].screenStream || null}
              {...getRemoteTileProfile(remoteStreams[0])}
              showReportEmoji={shouldShowReportEmojiOnRemoteTile(remoteStreams[0])}
              showKickParticipant={canKickRemoteUser(remoteStreams[0].userId)}
              onKickParticipant={() => handleKickRemote(remoteStreams[0].userId)}
              isRainchecking={isRainchecking}
              borderBottomClass="md:bottom-4"
              hideNameOnMobile={true}
              gifts={getRemoteGifts(remoteStreams[0]?.userId)}
              onGiftAnimationComplete={handleRemoteGiftComplete}
              onGiftDismissStart={handleRemoteGiftDismissStart}
              multiUserAvatars={remoteStreams.map(s => getRemoteTileProfile(s).displayPictureUrl)}
              onClickMultiUserAvatars={() => setShowGroupMembersModal(true)}
              hideReportOnMobile={true}
              showMinusButton={false}
              onMinus={() => handleKickRemote(remoteStreams[0].userId)}
              activeRemoteDareText={getRemoteActiveDareText(remoteStreams[0].userId)}
              activeGiftLabel={getRemoteActiveGiftLabel(remoteStreams[0].userId)}
              activeLocalGiftLabel={activeLocalGiftLabel}
              giftAnimationActive={hasActiveGift || hasActiveDare}
            />
              <RemoteVideoTile
                className={clsx('flex-1', 'rounded-tr-[1.5rem]', 'md:rounded-[60px]')}
                key={`remote-${remoteStreams[1].userId}`}
                userId={remoteStreams[1].userId}
                isReported={reportedUserIds.has(remoteStreams[1].userId)}
                onReportUser={handleReportUser}
                {...getRemoteFriendTileProps(remoteStreams[1])}
                stream={remoteStreams[1].stream}
                screenShareStream={remoteStreams[1].screenStream || null}
                {...getRemoteTileProfile(remoteStreams[1])}
                showReportEmoji={shouldShowReportEmojiOnRemoteTile(remoteStreams[1])}
                showKickParticipant={canKickRemoteUser(remoteStreams[1].userId)}
                onKickParticipant={() => handleKickRemote(remoteStreams[1].userId)}
                showLeaveNextButton={status === 'connected' && callRoles.isLocalHost}
                leaveIconType={remoteStreams.length > 1 ? 'exit' : 'next'}
                onLeaveOrNext={handleLeaveGroupOrRaincheck}
                onReportClick={() => setShowGroupMembersModal(true)}
                borderBottomClass="md:bottom-4"
                hideNameOnMobile={true}
                hideAddFriendOnMobile={true}
                gifts={getRemoteGifts(remoteStreams[1]?.userId)}
                onGiftAnimationComplete={handleRemoteGiftComplete}
                onGiftDismissStart={handleRemoteGiftDismissStart}
                showMinusButton={false}
                onMinus={() => handleKickRemote(remoteStreams[1].userId)}
                activeRemoteDareText={getRemoteActiveDareText(remoteStreams[1].userId)}
              />
              <div className={clsx('relative', 'rounded-bl-[1.5rem]', 'md:rounded-[60px]', 'overflow-hidden', 'isolate')} style={{ transform: 'translateZ(0)' }}>
                <RemoteVideoTile
                  key={remoteStreams[2] ? `remote-${remoteStreams[2].userId}` : 'summoning-slot-2'}
                  userId={remoteStreams[2]?.userId ?? ''}
                  isReported={remoteStreams[2] ? reportedUserIds.has(remoteStreams[2].userId) : false}
                  onReportUser={handleReportUser}
                  {...(remoteStreams[2] ? getRemoteFriendTileProps(remoteStreams[2]) : { showAddFriend: false })}
                  stream={remoteStreams[2]?.stream ?? null}
                  screenShareStream={remoteStreams[2]?.screenStream ?? null}
                  {...(remoteStreams[2] ? getRemoteTileProfile(remoteStreams[2]) : {})}
                  showReportEmoji={remoteStreams[2] ? shouldShowReportEmojiOnRemoteTile(remoteStreams[2]) : false}
                  showKickParticipant={remoteStreams[2] ? canKickRemoteUser(remoteStreams[2].userId) : false}
                  onKickParticipant={remoteStreams[2] ? () => handleKickRemote(remoteStreams[2].userId) : undefined}
                  hideNameOnMobile={true}
                  hideAddFriendOnMobile={true}
                  hideReportOnMobile={true}
                  hideReport={!remoteStreams[2]}
                  gifts={getRemoteGifts(remoteStreams[2]?.userId)}
                  onGiftAnimationComplete={handleRemoteGiftComplete}
                  onGiftDismissStart={handleRemoteGiftDismissStart}
                  className={clsx('absolute', 'inset-0', 'w-full', 'h-full', 'rounded-bl-[1.5rem]')}
                  showMinusButton={!!remoteStreams[2] && callRoles.isLocalHost}
                  onMinus={remoteStreams[2] ? () => handleKickRemote(remoteStreams[2].userId) : undefined}
                  activeRemoteDareText={getRemoteActiveDareText(remoteStreams[2]?.userId)}
                />
                {!remoteStreams[2] && (
                  <SummoningOverlay
                    cooldownActive={pullStrangerCooldownSec > 0}
                    onCancel={handleCancelPullStranger}
                    variant="layout4"
                  />
                )}
              </div>
              <div className={clsx('relative', 'min-h-0', 'min-w-0', 'rounded-br-[1.5rem]', 'md:rounded-[2rem]', 'overflow-hidden', 'bg-gray-950', 'border', 'border-white/5', 'isolate')} style={{ transform: 'translateZ(0)' }}>
                <LocalVideoSection {...localVideoProps} hideMobileControlsRow={true} roundedClass="rounded-br-[1.5rem]" activeLocalDareText={activeLocalDareText} activeLocalGiftLabel={activeLocalGiftLabel} giftAnimationActive={hasActiveGift || hasActiveDare} />
              </div>
            </div>
          </>
        )}

        {/* ================================================================
            OVERLAYS & MODALS
        ================================================================ */}

        {/* Mobile group chat input */}
        {remoteStreams.length >= 2 && showChatInput && (
          <div className={clsx('md:hidden', 'absolute', 'inset-x-0', 'bottom-20', 'px-4', 'z-[60]', 'pointer-events-auto')}>
            <form onSubmit={e => { e.preventDefault(); sendChatMessage(e); }} className={clsx('animate-in', 'fade-in', 'slide-in-from-bottom-2', 'duration-200')}>
              <input
                autoFocus
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder="Type a message..."
                className={clsx('w-[90%]', 'backdrop-blur-[1px]', 'border', 'border-white/20', 'rounded-lg', 'px-2', 'py-2.5', 'text-white', 'text-sm', 'focus:border-white/40', 'outline-none')}
              />
            </form>
          </div>
        )}

        {/* Mobile multi-user controls */}
        {remoteStreams.length >= 2 && !activeDareProposal && (
          <MobileMultiUserControls
            toggleCam={localVideoProps.toggleCam}
            isCamOff={localVideoProps.isCamOff}
            onChatButtonClick={localVideoProps.onChatButtonClick || (() => localVideoProps.setShowChatInput(!localVideoProps.showChatInput))}
            setIsDareOpen={localVideoProps.setIsDareOpen}
            setIsGiftModalOpen={localVideoProps.setIsGiftModalOpen}
            isScreenSharing={localVideoProps.isScreenSharing}
            onToggleScreenShare={localVideoProps.onToggleScreenShare}
            hideLogo={true}
          />
        )}

        {/* Quick actions (icebreaker, randomness, etc.) */}
        {!(remoteStreams.length === 0 && !isBroadcasting) && (
          <QuickActions
            callRoles={callRoles}
            toggleRandomness={toggleRandomness}
            handleIcebreaker={handleIcebreaker}
            isGiftModalOpen={isGiftModalOpen}
            isDareOpen={isDareOpen}
            onLeaveOrNext={remoteStreams.length >= 2 ? handleLeaveGroupOrRaincheck : null}
            isRainchecking={isRainchecking}
            isRolling={isRolling}
            setIsRolling={setIsRolling}
            isBroken={isBroken}
            setIsBroken={setIsBroken}
            giftAnimationActive={hasActiveGift || hasActiveDare}
          />
        )}

        {/* Gift overlay */}
        <GiftOverlay
          isOpen={isGiftModalOpen}
          onClose={() => { setIsGiftModalOpen(false); setSelectedGiftId(null); }}
          onOpenCoinModal={() => setIsCoinModalOpen(true)}
          onSelectGift={gift => setSelectedGiftId(gift.id)}
          selectedGiftId={selectedGiftId}
          coins={coins}
          participants={remoteStreams.map(s => ({ userId: s.userId, ...getRemoteTileProfile(s) }))}
          onSendGift={handleSendGift}
        />

        {/* Dare overlay */}
        <DareOverlay
          isOpen={isDareOpen && !activeDareProposal}
          onClose={handleCancelDare}
          selectedGiftId={selectedGiftId}
          onSelectGift={giftId => setSelectedGiftId(giftId)}
          onDareSync={handleDareSync}
          dareAcceptanceStatus={dareAcceptanceStatus}
          onSendDare={handleSendDare}
          isSendingDare={isSendingDare}
          coins={coins}
          onOpenCoinModal={() => setIsCoinModalOpen(true)}
          recipientName={remoteStreams.length > 0 ? (remoteStreams[0].name || 'Stranger') : 'Stranger'}
          randomDares={randomDares}
          savedDares={savedDares}
          onSaveCustomDare={handleSaveCustomDare}
          onDeleteCustomDare={handleDeleteCustomDare}
          giftItems={giftItems}
        />

        {/* Dare proposal overlay */}
        <DareProposalOverlay
          isOpen={!!activeDareProposal}
          proposal={activeDareProposal}
          onAccept={() => handleDareResponse(true)}
          onReject={() => handleDareResponse(false)}
        />

        {/* In-app overlay (inbox / history / profile) */}
        <OverlayLayer
          open={overlay.open}
          url={overlay.url}
          title={overlay.title}
          onClose={() => setOverlay({ open: false, url: '', title: '' })}
        />

        {/* Broadcast HUD */}
        <BroadcastHud
          isBroadcasting={isBroadcasting}
          broadcastHud={broadcastHud}
          setShowWaitlist={setShowWaitlist}
          handleShareBroadcastLink={handleShareBroadcastLink}
          setBroadcastHud={setBroadcastHud}
          copyShareUrl={copyShareUrl}
        />

        {/* Icebreaker toast */}
        <IcebreakerToast isOpen={showIcebreaker} icebreaker={icebreaker} />

        {/* Broadcast chat warning */}
        {broadcastChatWarning && (
          <div className={clsx('absolute', 'top-40', 'left-1/2', '-translate-x-1/2', 'z-[61]', 'animate-in', 'fade-in', 'slide-in-from-top-2')}>
            <div className={clsx('bg-amber-500/20', 'backdrop-blur-xl', 'px-6', 'py-3', 'rounded-2xl', 'border', 'border-amber-300/35', 'shadow-2xl', 'max-w-xl', 'text-center')}>
              <p className={clsx('text-amber-100', 'text-sm', 'font-black')}>{broadcastChatWarning}</p>
            </div>
          </div>
        )}

        {/* Report notification toast */}
        {reportNotification && (
          <div className={clsx('absolute', 'top-20', 'left-1/2', '-translate-x-1/2', 'z-[110]', 'bg-slate-900/80', 'backdrop-blur-md', 'outline', 'outline-2', 'outline-white/20', 'border', 'border-white/5', 'text-white', 'px-6', 'py-3', 'rounded-full', 'shadow-2xl', 'flex', 'items-center', 'gap-3', 'animate-in', 'fade-in', 'slide-in-from-top-4')}>
            <div className={clsx('w-2', 'h-2', 'rounded-full', 'bg-green-500', 'animate-pulse')} />
            <span className={clsx('font-outfit', 'text-sm', 'font-semibold')}>{reportNotification}</span>
          </div>
        )}

        {/* Randomness modal */}
        <RandomnessModal
          isOpen={showRandomness}
          onClose={() => setShowRandomness(false)}
          isLocalHost={callRoles.isLocalHost}
          handlePullStranger={handlePullStranger}
          isPullStrangerDisabled={isPullStrangerDisabled}
          isRoomFull={isRoomFull}
          isEnablingPullStranger={isEnablingPullStranger}
          pullStrangerCooldownSec={pullStrangerCooldownSec}
          isBroadcasting={isBroadcasting}
          handleBeamcast={handleBeamcast}
          handleStopBeamcast={handleStopBeamcast}
          setShowWaitlist={setShowWaitlist}
        />

        {/* Group members modal */}
        <GroupMembersModal
          isOpen={showGroupMembersModal}
          onClose={() => setShowGroupMembersModal(false)}
          remoteStreams={remoteStreams}
          getRemoteTileProfile={getRemoteTileProfile}
          friendRequestSentTo={friendRequestSentTo}
          friendshipWithRemote={friendshipWithRemote}
          handleSendFriendRequest={handleSendFriendRequest}
          reportedUserIds={reportedUserIds}
          handleReportUser={handleReportUser}
        />

        {/* Waitlist modal */}
        <WaitlistModal
          isOpen={showWaitlist}
          onClose={() => setShowWaitlist(false)}
          waitlist={waitlist}
          waitlistLoading={waitlistLoading}
          waitlistError={waitlistError}
          refreshWaitlist={refreshWaitlist}
          acceptFromWaitlist={acceptFromWaitlist}
          selectedWaitlistUser={selectedWaitlistUser}
          setSelectedWaitlistUser={setSelectedWaitlistUser}
        />

        {/* QA debug badge */}
        {(roomHealthDebug.graceActive || roomHealthDebug.failureCount > 0) && (
          <div className={clsx('absolute', 'top-6', 'left-1/2', '-translate-x-1/2', 'z-[70]')}>
            <div className={clsx('bg-black/70', 'backdrop-blur-md', 'border', 'border-white/20', 'rounded-xl', 'px-4', 'py-2', 'text-[11px]', 'text-white', 'font-mono')}>
              {roomHealthDebug.graceActive
                ? `PullStranger grace active: ${roomHealthDebug.graceRemainingSec}s`
                : `Room health retries: ${roomHealthDebug.failureCount}/6`}
            </div>
          </div>
        )}
      </div>

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
      />
      {purchaseToast && (
        <div className={clsx('fixed', 'top-20', 'left-1/2', '-translate-x-1/2', 'z-[200]', 'bg-slate-900/80', 'backdrop-blur-md', 'border', 'border-white/20', 'text-white', 'px-6', 'py-3', 'rounded-full', 'shadow-2xl', 'flex', 'items-center', 'gap-3', 'animate-in', 'fade-in', 'slide-in-from-top-4')}>
          <div className={clsx('w-2', 'h-2', 'rounded-full', 'bg-green-500', 'animate-pulse')} />
          <span className={clsx('font-outfit', 'text-sm', 'font-semibold')}>{purchaseToast}</span>
        </div>
      )}
    </div>
  );
}
