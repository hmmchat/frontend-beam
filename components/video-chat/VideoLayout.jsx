'use client';

import clsx from 'clsx';
import RemoteVideoTile from './RemoteVideoTile';
import LocalVideoSection from './LocalVideoSection';
import FaceCard from '../Home/FaceCard';
import { IoLocationSharp, IoArrowForward } from 'react-icons/io5';

export default function VideoLayout({
  remoteStreams,
  localVideoProps,
  getRemoteFriendTileProps,
  getRemoteTileProfile,
  shouldShowReportEmojiOnRemoteTile,
  canKickRemoteUser,
  handleKickRemote,
  onLeaveOrNext,
  isRainchecking
}) {
  if (remoteStreams.length === 0) {
    return (
      /* Landing/Loading state: 50% LocationCard UI / 50% Local Video */
      <div className="flex flex-col md:flex-row flex-1 min-h-0 min-w-0 gap-2">
        {/* Top Half on Mobile (Location Card UI) */}
        <div className={clsx('flex-1', 'min-h-0', 'min-w-0', 'relative', 'rounded-[2rem]', 'overflow-hidden', 'bg-gradient-to-br from-indigo-900/40 to-purple-900/40', 'border', 'border-white/10', 'shadow-2xl', 'flex', 'flex-col', 'items-center', 'justify-center', 'p-6', 'text-center')}>
           {/* Decorative Background Elements */}
           <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
             <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500 rounded-full blur-[60px]" />
           </div>

           <div className="absolute top-6 right-6 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
             <span className="text-[8px] font-bold text-white/80 uppercase tracking-widest">Suggested City</span>
           </div>

           <div className="relative z-10 flex flex-col items-center gap-4">
             <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center border border-white/20 shadow-inner">
               <IoLocationSharp className="text-2xl text-white animate-pulse" />
             </div>
             
             <div className="space-y-1">
               <h2 className="text-2xl font-bold text-white tracking-tight">Anywhere</h2>
               <p className="text-white/60 text-sm font-medium">1 people meeting now</p>
             </div>
           </div>

           <div className="relative z-10 w-full mt-6 space-y-3 px-4">
             <button
               className="group w-full py-3 bg-white text-indigo-950 font-bold rounded-xl flex items-center justify-center gap-2 text-sm shadow-xl active:scale-95 transition-all"
             >
               Explore this city
               <IoArrowForward className="group-hover:translate-x-1 transition-transform" />
             </button>
             <button
               className="w-full py-2 text-white/40 font-semibold text-xs hover:text-white transition-colors"
             >
               Check another city
             </button>
           </div>
        </div>

        {/* Bottom Half on Mobile (Local Video) */}
        <div className={clsx('flex-1', 'min-h-0', 'min-w-0', 'relative', 'rounded-[2rem]', 'overflow-hidden', 'bg-gray-950', 'border', 'border-white/5', 'shadow-2xl')}>
           <LocalVideoSection {...localVideoProps} />
        </div>
      </div>
    );
  }

  if (remoteStreams.length === 1) {
    const profile = getRemoteTileProfile(remoteStreams[0]);
    return (
      <div className="flex flex-col md:flex-row flex-1 min-h-0 min-w-0 gap-2 overflow-hidden">
        {/* Mobile View: High-Intent FaceCard Full Screen */}
        <div className="block md:hidden flex-1 relative min-h-0 min-w-0 overflow-hidden rounded-[2rem]">
           {/* Background Video (Blurred) */}
           <div className="absolute inset-0 z-0 opacity-40 blur-md pointer-events-none scale-110">
              <RemoteVideoTile
                stream={remoteStreams[0].stream}
                {...profile}
                className="w-full h-full"
              />
           </div>
           
           <div className="relative z-10 w-full h-full flex flex-col items-center justify-center">
              <div className="scale-[0.85] xs:scale-100">
                <FaceCard user={{ ...profile, id: remoteStreams[0].userId }} />
              </div>
              
              {/* Raincheck and Meet Room Buttons */}
              <div className="absolute bottom-10 left-0 right-0 flex justify-center gap-12 z-20">
                <button 
                  onClick={onLeaveOrNext}
                  disabled={isRainchecking}
                  className="w-16 h-16 rounded-full bg-red-500/80 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-2xl active:scale-90 transition-all animate-in fade-in zoom-in duration-500"
                >
                  <img src="/arrowright.png" className="w-8 h-8 object-contain brightness-200" alt="Raincheck" />
                </button>
                <button 
                  className="w-16 h-16 rounded-full bg-green-500/80 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-2xl active:scale-90 transition-all animate-in fade-in zoom-in duration-500 delay-100"
                >
                  <img src="/video.png" className="w-8 h-8 object-contain brightness-200" alt="Meet" />
                </button>
              </div>
           </div>
        </div>

        {/* Desktop View: 1:1 Matched Layout */}
        <div className="hidden md:flex flex-1 gap-2 min-h-0 min-w-0">
          <RemoteVideoTile
            key={`remote-${remoteStreams[0].userId}`}
            {...getRemoteFriendTileProps(remoteStreams[0])}
            stream={remoteStreams[0].stream}
            {...profile}
            showReportEmoji={shouldShowReportEmojiOnRemoteTile(remoteStreams[0])}
            showKickParticipant={canKickRemoteUser(remoteStreams[0].userId)}
            onKickParticipant={() => handleKickRemote(remoteStreams[0].userId)}
          />
          <div className={clsx('flex-1', 'min-h-0', 'min-w-0', 'relative', 'rounded-[2rem]', 'overflow-hidden', 'bg-gray-950', 'border', 'border-white/5', 'shadow-2xl')}>
            <LocalVideoSection {...localVideoProps} />
          </div>
        </div>
      </div>
    );
  }

  // Handle Multiple Remotes (Grid)
  return (
    <div className={clsx('flex-1', 'grid', 'min-h-0', 'min-w-0', remoteStreams.length === 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-2 grid-rows-2', 'gap-2')}>
      {remoteStreams.map((stream) => (
        <RemoteVideoTile
          key={`remote-${stream.userId}`}
          {...getRemoteFriendTileProps(stream)}
          stream={stream.stream}
          {...getRemoteTileProfile(stream)}
          showReportEmoji={shouldShowReportEmojiOnRemoteTile(stream)}
          showKickParticipant={canKickRemoteUser(stream.userId)}
          onKickParticipant={() => handleKickRemote(stream.userId)}
        />
      ))}
      <div className={clsx('relative', 'min-h-0', 'min-w-0', 'rounded-[2rem]', 'overflow-hidden', 'bg-gray-950', 'border', 'border-white/5', 'shadow-2xl')}>
        <LocalVideoSection {...localVideoProps} />
      </div>
    </div>
  );
}