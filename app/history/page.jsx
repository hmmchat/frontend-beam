"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { FaArrowLeftLong, FaHeart, FaMessage } from "react-icons/fa6";
import { IoVideocamOutline } from "react-icons/io5";
import { IoMdInformationCircleOutline } from "react-icons/io";
import { API, apiRequest } from "@/lib/api";
import ProfileGuard from "@/components/auth/ProfileGuard";
import HistorySkeleton from "@/components/history/HistorySkeleton";
import { MdOutlineLocationOn } from "react-icons/md";
import FacecardPreviewModal from "@/components/facecard/FacecardPreviewModal";

export default function History() {
  return (
    <ProfileGuard>
      <HistoryContent />
    </ProfileGuard>
  );
}

function HistoryContent() {
  const router = useRouter();
  const [calls, setCalls] = useState([]);
  const [timelinesBySessionId, setTimelinesBySessionId] = useState({});
  const [actionBusyId, setActionBusyId] = useState(null);
  const [productMessage, setProductMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [viewerId, setViewerId] = useState(typeof window !== "undefined" ? localStorage.getItem("userId") : null);
  const [previewUserId, setPreviewUserId] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  useEffect(() => {
    if (!viewerId) {
      const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split(".")[1]));
          const uid = payload.sub || payload.uid || payload.id;
          if (uid) {
            setViewerId(String(uid));
            localStorage.setItem("userId", String(uid));
          }
        } catch (e) { }
      }
    }
  }, [viewerId]);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        // GET /streaming/history is authenticated via JWT \u2014 no userId param needed
        // Backend clamps to max 10 per user.
        const data = await apiRequest(API.STREAMING.GET_HISTORY(10));
        setCalls(data.calls || []);
      } catch (err) {
        console.error("Failed to fetch history:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  // Fetch timeline for each call so the UI can show pull/kick/exit + join order.
  useEffect(() => {
    if (!calls?.length) return;

    let cancelled = false;
    const run = async () => {
      const next = {};
      await Promise.allSettled(
        calls.map(async (c) => {
          try {
            const timelineCall = await apiRequest(API.STREAMING.GET_HISTORY_TIMELINE(c.sessionId));
            next[c.sessionId] = timelineCall?.timeline || [];
          } catch (e) {
            // Keep UI resilient if timeline fails for one call.
            next[c.sessionId] = [];
          }
        })
      );

      if (!cancelled) setTimelinesBySessionId(next);
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [calls]);

  const formatDuration = (seconds) => {
    if (!seconds) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatCityDisplay = (rawCity) => {
    if (!rawCity || rawCity === "ANYWHERE_IN_INDIA" || rawCity === "Anywhere") {
      return "Anywhere in India";
    }
    if (rawCity === "Unknown") return "";
    return rawCity
      .split(/[_-]/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).replace(',', ' |') + " IST";
  };


  const sendFriendRequest = async (toUserId) => {
    if (!toUserId || actionBusyId) return;
    setActionBusyId(toUserId);
    setProductMessage('');
    try {
      await apiRequest(API.FRIENDS.SEND_FRIEND_REQUEST, {
        method: 'POST',
        body: JSON.stringify({ toUserId }),
      });
      setProductMessage('Friend request sent.');
      setCalls((prev) =>
        prev.map((call) => ({
          ...call,
          participants: (call.participants || []).map((p) =>
            String(p.userId) === String(toUserId) ? { ...p, friendRequestSent: true } : p
          ),
        }))
      );
    } catch (e) {
      setProductMessage(e?.message || 'Could not send friend request');
    } finally {
      setActionBusyId(null);
    }
  };

  return (
    <div className="fixed inset-0 h-[100dvh] w-full text-white overflow-hidden">

      {/* Background */}
      <div
        className="absolute inset-0 -z-50"
        style={{
          backgroundImage: "url('/assets/mb.jpg')",
          backgroundRepeat: "repeat",
          backgroundSize: "cover",
        }}
      />

      {/* Page Container */}
      <div className="h-full flex flex-col  md:px-16 md:py-10 py-6 max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-4 mb-6 px-5 justify-between">
          <div className="flex items-center gap-2">
            <div
              onClick={() => { if (window.history.length > 1) { router.back(); } else { router.push('/'); } }}
              className="border-[2px] border-white/40   rounded-full md:p-3.5 p-2   meeting now hover:bg-white/10 transition-colors"
            >
              <FaArrowLeftLong />
            </div>
            <h1 className="text-lg font-medium">History</h1>
          </div>

          <div>
            <img src="/logo.png" alt="Logo" className="w-24 md:w-32" />
          </div>
        </div>

        {/* Main Card */}
        <div className="flex-1 rounded-[60px] md:px-6 md:px-2 overflow-hidden 
                        md:ring md:ring-white/50  
                        ">

          <div className="h-full overflow-y-auto scrollbar-hide space-y-4 pt-3 mt-3 md:px-12 px-3">
            {productMessage ? (
              <div className="mx-2 rounded-2xl border border-white/20 bg-black/25 px-4 py-3 text-sm text-white/90">
                {productMessage}
              </div>
            ) : null}
            {loading ? (
              <HistorySkeleton />
            ) : calls.length === 0 ? (
              <div className="text-center py-10 opacity-50">No history found</div>
            ) : (
              calls.map((call, gi) => {
                const otherParticipants = (call.participants || []).filter(
                  (p) => String(p.userId) !== String(viewerId)
                );
                const hasMultiple = otherParticipants.length > 1;

                return (
                  <div
                    key={call.sessionId}
                    className={`${hasMultiple
                      ? "border border-white/60 rounded-[32px] md:p-2 p-1"
                      : ""
                      } flex flex-col`}
                  >
                    {/* ================= TIMELINE ================= */}
                    {timelinesBySessionId[call.sessionId] && (() => {
                      const timeline = timelinesBySessionId[call.sessionId] || [];
                      const participantById = Object.fromEntries(
                        (call.participants || []).map((p) => [String(p.userId), p])
                      );

                      const joinedEvents = timeline
                        .filter((e) => e.eventType === "participant_joined_time")
                        .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

                      const joinOrder = null;

                      const pulledIn = timeline.find(
                        (e) =>
                          e.eventType === "participant_joined_via_pull_stranger" &&
                          viewerId &&
                          String(e.userId) === String(viewerId)
                      );

                      const kicked = timeline.find(
                        (e) =>
                          e.eventType === "participant_kicked" &&
                          viewerId &&
                          String(e.userId) === String(viewerId)
                      );

                      const exited = null;

                      const primaryEvents = [
                        pulledIn ? { label: "Pulled stranger", at: pulledIn.at } : null,
                        kicked ? { label: "Kicked out", at: kicked.at } : null,
                        exited ? { label: "Exited", at: exited.at } : null,
                      ].filter(Boolean);

                      if (!primaryEvents.length && !joinOrder) return null;

                      // return (
                      //   <div className="flex flex-col gap-2 mb-4 px-2">
                      //     {/* Example timeline content */}
                      //     {joinOrder && (
                      //       <p className="text-xs text-white/70">
                      //         {joinOrder}
                      //       </p>
                      //     )}

                      //     {primaryEvents.map((event, i) => (
                      //       <p key={i} className="text-xs text-white/60">
                      //         {event.label}
                      //       </p>
                      //     ))}
                      //   </div>
                      // );



                    })()}

                    {/* ❌ Removed loading div → it was causing fake top gap */}

                    {/* ================= CARDS ================= */}
                    <div className="flex flex-col gap-4 ">
                      {otherParticipants.map((participant) => (
                        <div
                          key={participant.userId}
                          className="border border-white/40 rounded-[26px] md:p-5 p-3  space-y-4 "
                        >
                          {/* Top row */}
                          <div className="flex items-center gap-3">
                            {call.callType === "Squad" && (
                              <p className="text-xs text-white px-3 py-1 border-2 border-[#FFBC2B] font-semibold rounded-full">
                                Squad
                              </p>
                            )}
                            {call.callType === "Broadcast" && (
                              <div className="flex items-center gap-2">
                                <p className="text-xs text-white px-5 py-1 border-2 border-[#FFBC2B] font-semibold rounded-full flex ">
                                  Squad
                                </p>
                                <img src="/history/broadcast.svg" alt="broadcast" className="w-5 h-5" />
                              </div>

                            )}

                            <span className="text-xs font-outfit text-white/90">
                              {formatDate(call.startedAt)}
                            </span>

                            <img
                              src="/history/infoicon.svg"
                              alt="info"
                              className="w-6 h-6 ml-auto"
                            />
                          </div>

                          <hr className="border-white/40" />

                          {/* Content */}
                          <div className="flex items-center justify-between">
                            {/* Left */}
                            <div className="flex items-center gap-4">
                              <button
                                type="button"
                                onClick={() => {
                                  setPreviewUserId(participant.userId);
                                  setIsPreviewOpen(true);
                                }}
                                className="w-14 md:w-20 h-14 md:h-20  rounded-full overflow-hidden border border-white border-2 hover:bg-white/5 transition-colors"
                              >
                                {(typeof participant.displayPictureUrl === "string" && participant.displayPictureUrl.trim()) ? (
                                  <Image
                                    src={participant.displayPictureUrl}
                                    alt="user"
                                    width={56}
                                    height={56}
                                    className="object-cover w-full h-full "
                                  />
                                ) : (
                                  <div className="w-full h-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white text-xl md:text-3xl font-bold select-none font-outfit">
                                    {(participant.username || "U").charAt(0).toUpperCase()}
                                  </div>
                                )}
                              </button>

                              <div className="">
                                <div
                                  onClick={() => {
                                    setPreviewUserId(participant.userId);
                                    setIsPreviewOpen(true);
                                  }}
                                  className="md:text-[14px] text-[12px] cursor-pointer hover:underline"
                                >
                                  <span className="md:mr-[5px]">👦</span>  {participant.username}
                                </div>

                                <div className="md:text-[14px] text-[11px] font-outfit text-white/80 flex items-center gap-1 mt-1">
                                  <img src="/history/locationline.svg" alt="location" className="md:w-5 md:h-5 w-3 h-3" />
                                  {formatCityDisplay(participant.preferredCity || participant.city || participant.location) || "—"}
                                </div>

                                <div className="flex items-center gap-2 font-semibold md:text-sm text-[11px] font-outfit md:mt-2 mt-1">
                                  <img src="/history/video-outline.svg" alt="videocam" className="md:w-7 md:h-7 w-5 h-5" />
                                  {formatDuration(participant.durationSeconds)}
                                </div>
                              </div>
                            </div>

                            {/* Right */}
                            <div className="flex items-center md:gap-1 gap-[3px]">
                              <button
                                type="button"
                                title={participant.isFriend ? "Message" : (participant.conversationId ? `Message once for ${participant.messageCost ?? 10} coins` : "Message")}
                                onClick={() => {
                                  const q = new URLSearchParams({
                                    chat: participant.conversationId || "",
                                    userId: participant.userId,
                                    username: participant.username || "User",
                                    friend: participant.isFriend ? "1" : "0",
                                  });
                                  if (typeof participant.displayPictureUrl === "string" && participant.displayPictureUrl.trim()) {
                                    q.set("photo", participant.displayPictureUrl);
                                  }
                                  router.push(`/inbox?${q.toString()}`);
                                }}
                                className="w-10 h-10 md:w-14 md:h-14 border border-white/40 border-b-4 rounded-full grid place-items-center hover:bg-white/10 transition-colors"
                              >
                                <img
                                  src="/history/mail.svg"
                                  alt="message"
                                  className="w-6 h-6 md:w-8 md:h-8"
                                />
                              </button>

                              <button
                                type="button"
                                disabled={actionBusyId === participant.userId || participant.friendRequestSent || participant.isFriend}
                                onClick={() => !participant.isFriend && sendFriendRequest(participant.userId)}
                                className={`w-10 h-10 md:w-14 md:h-14 border border-white/40 border-b-4 rounded-full grid place-items-center hover:bg-white/10 transition-colors disabled:opacity-50 ${participant.isFriend ? 'hidden' : ''}`}
                                title={participant.isFriend ? "Friends" : (participant.friendRequestSent ? "Friend request sent" : "Send friend request")}
                              >
                                <img
                                  src="/history/heart.svg"
                                  alt="heart"
                                  className={`w-6 h-6 md:w-8 md:h-8 ${participant.isFriend ? 'hidden' : ''}`}
                                />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>


        </div>




      </div>
      <FacecardPreviewModal
        userId={previewUserId}
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
      />
    </div>
  );
}
