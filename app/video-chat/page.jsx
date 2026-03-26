'use client';

import clsx from 'clsx';
import useVideoChatRoom from '@/components/video-chat/useVideoChatRoom';
import VideoLayout from '@/components/video-chat/VideoLayout';
import QuickActions from '@/components/video-chat/QuickActions';
import IcebreakerToast from '@/components/video-chat/IcebreakerToast';
import RandomnessModal from '@/components/video-chat/RandomnessModal';
import DebugBadge from '@/components/video-chat/DebugBadge';

export default function VideoChat() {
  const {
    roomInfo, status, remoteStreams, isCamOff, error, partnerInfo,
    friendRequestSentTo, friendshipWithRemote, isRainchecking, showRandomness, setShowRandomness,
    isEnablingPullStranger, pullStrangerCooldownSec, callRoles, roomHealthDebug, icebreaker,
    showIcebreaker, chatMessages, chatInput, setChatInput, showChatInput, setShowChatInput,
    localVideoRef, localStreamRef,
    handleSendFriendRequest, toggleCam, handleIcebreaker, toggleRandomness, handlePullStranger,
    handleBeamcast, sendChatMessage, handleLeaveGroupOrRaincheck, handleKickRemote,
    isValidFriendTargetUserId, sameParticipantId
  } = useVideoChatRoom();

  // --- Render Helpers ---
  const isRoomFull = (remoteStreams.length + 1) >= 4;
  const isPullStrangerDisabled = isRoomFull || isEnablingPullStranger || pullStrangerCooldownSec > 0;

  const localVideoProps = {
    localVideoRef,
    localStreamRef,
    isCamOff,
    chatMessages,
    chatInput,
    setChatInput,
    sendChatMessage,
    showChatInput,
    setShowChatInput,
    toggleCam,
    showLeaveNextButton: status === 'connected',
    onLeaveOrNext: handleLeaveGroupOrRaincheck,
    isRainchecking
  };

  const getRemoteFriendTileProps = (streamInfo) => {
    const uid = String(streamInfo.userId ?? '');
    const valid = isValidFriendTargetUserId(uid);
    return {
      onSendFriendRequest: () => handleSendFriendRequest(uid),
      showAddFriend: valid,
      isAlreadyFriend: Boolean(friendshipWithRemote[uid]),
      isFriendRequestSent: Boolean(friendRequestSentTo[uid])
    };
  };

  const canKickRemoteUser = (remoteUserId) =>
    callRoles.isLocalHost && callRoles.byUserId[String(remoteUserId)] === 'PARTICIPANT';

  const shouldShowReportEmojiOnRemoteTile = (streamInfo) => {
    const list = remoteStreams;
    if (list.length <= 1) return true;
    const pid = String(partnerInfo.id || '');
    const partnerInCall = pid && list.some((s) => String(s.userId) === pid);
    if (partnerInCall) return String(streamInfo.userId) === pid;
    return list[0] && String(list[0].userId) === String(streamInfo.userId);
  };

  const getRemoteTileProfile = (s) => {
    const pid = partnerInfo.id != null && partnerInfo.id !== '' ? String(partnerInfo.id) : '';
    const isPartner = pid !== '' && sameParticipantId(s.userId, pid);
    if (isPartner) {
      return {
        name: s.name || partnerInfo.name || 'Matched!',
        age: s.age || partnerInfo.age || '',
        city: s.city || partnerInfo.city || '',
        displayPictureUrl: s.displayPictureUrl || partnerInfo.displayPictureUrl || '/avatar-placeholder.png'
      };
    }
    return {
      name: s.name || 'Guest',
      age: s.age || '',
      city: s.city || '',
      displayPictureUrl: s.displayPictureUrl || '/avatar-placeholder.png'
    };
  };

  if (status === 'error' && error) {
     return (
       <div className="h-screen w-screen bg-black flex items-center justify-center text-white p-6 text-center">
         <div>
            <h1 className="text-2xl font-black mb-4">Connection Error</h1>
            <p className="text-white/60 mb-8">{error}</p>
            <button onClick={() => window.location.href = '/'} className="bg-purple-600 px-8 py-3 rounded-full font-bold">Go Home</button>
         </div>
       </div>
     );
  }

  return (
    <div className={clsx('h-screen', 'w-screen', 'bg-black', 'flex', 'overflow-hidden', 'font-sans')}>
      <div className={clsx('flex-1', 'min-h-0', 'min-w-0', 'flex', 'p-2', 'gap-2')}>
        
        <VideoLayout 
            remoteStreams={remoteStreams}
            localVideoProps={localVideoProps}
            getRemoteFriendTileProps={getRemoteFriendTileProps}
            getRemoteTileProfile={getRemoteTileProfile}
            shouldShowReportEmojiOnRemoteTile={shouldShowReportEmojiOnRemoteTile}
            canKickRemoteUser={canKickRemoteUser}
            handleKickRemote={handleKickRemote}
            onLeaveOrNext={handleLeaveGroupOrRaincheck}
            isRainchecking={isRainchecking}
        />

        <QuickActions 
            showChatInput={showChatInput}
            callRoles={callRoles}
            toggleRandomness={toggleRandomness}
            handleIcebreaker={handleIcebreaker}
        />

        <IcebreakerToast showIcebreaker={showIcebreaker} icebreaker={icebreaker} />

        <RandomnessModal
          showRandomness={showRandomness}
          setShowRandomness={setShowRandomness}
          callRoles={callRoles}
          handlePullStranger={handlePullStranger}
          isPullStrangerDisabled={isPullStrangerDisabled}
          isEnablingPullStranger={isEnablingPullStranger}
          pullStrangerCooldownSec={pullStrangerCooldownSec}
          isRoomFull={isRoomFull}
          handleBeamcast={handleBeamcast}
        />

        <DebugBadge roomHealthDebug={roomHealthDebug} />
      </div>
    </div>
  );
}
