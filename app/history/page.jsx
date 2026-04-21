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
  const [loading, setLoading] = useState(true);

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

  const viewerId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;

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
              onClick={() => router.push('/')}
              className="border border-white rounded-full p-2 0  meeting now hover:bg-white/10 transition-colors"
            >
              <FaArrowLeftLong />
            </div>
            <h1 className="text-lg font-medium">History</h1>
          </div>

          <div>
            <img src="/LOGO.png" alt="Logo" className="w-24 md:w-32" />
          </div>
        </div>

        {/* Main Card */}
        <div className="flex-1 rounded-[60px] md:p-6 overflow-hidden 
                        md:ring md:ring-white/50  
                        ">

          <div className="h-full overflow-y-auto space-y-4 pt-3 mt-3 md:px-6 px-3">
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
    className={`${
      hasMultiple
        ? "border border-white/40 rounded-[32px] md:p-2 p-1"
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

      return (
        <div className="flex flex-col gap-2 mb-4 px-2">
          {/* Example timeline content */}
          {joinOrder && (
            <p className="text-xs text-white/70">
              {joinOrder}
            </p>
          )}

          {primaryEvents.map((event, i) => (
            <p key={i} className="text-xs text-white/60">
              {event.label}
            </p>
          ))}
        </div>
      );
    })()}

    {/* ❌ Removed loading div → it was causing fake top gap */}

    {/* ================= CARDS ================= */}
    <div className="flex flex-col gap-4">
      {otherParticipants.map((participant) => (
        <div
          key={participant.userId}
          className="border border-white/30 rounded-[26px] p-5 space-y-4"
        >
          {/* Top row */}
          <div className="flex items-center gap-3">
            {call.callType === "Squad" && (
              <p className="text-xs text-white px-3 py-1 border-2 border-[#FFBC2B] font-semibold rounded-full">
                Squad
              </p>
            )}
            {call.callType === "Broadcast" && (
              <p className="text-xs text-white px-3 py-1 border-2 border-blue-400 font-semibold rounded-full">
                Broadcast
              </p>
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
                onClick={() =>
                  router.push(
                    `/facecard?userId=${encodeURIComponent(
                      participant.userId
                    )}`
                  )
                }
                className="w-14 h-14 rounded-full overflow-hidden border border-white/10 hover:bg-white/5 transition-colors"
              >
                <Image
                  src={
                    participant.displayPictureUrl ||
                    "/assets/avatarDefault.png"
                  }
                  alt="user"
                  width={56}
                  height={56}
                  className="object-cover w-full h-full"
                />
              </button>

              <div className="space-y-1">
                <div className="md:text-[16px] text-[12px]">
                  👦 {participant.username || "Stranger"}
                </div>

                <div className="md:text-[16px] text-[11px] font-outfit text-white/80 flex items-center gap-1">
                  <MdOutlineLocationOn />
                  {participant.location || "Somewhere"}
                </div>

                <div className="flex items-center gap-2 md:text-sm text-[11px] font-outfit">
                  <IoVideocamOutline />
                  {formatDuration(participant.durationSeconds)}
                </div>
              </div>
            </div>

            {/* Right */}
            <div className="flex items-center gap-4">
              <button
                onClick={() =>
                  participant.conversationId &&
                  router.push(`/inbox?chat=${participant.conversationId}`)
                }
                className="w-10 h-10 border border-white/40 rounded-full grid place-items-center hover:bg-white/10 transition-colors"
              >
                <img
                  src="/history/mail.svg"
                  alt="message"
                  className="w-6 h-6"
                />
              </button>

              <button
                className={`w-10 h-10 border border-white/40 rounded-full grid place-items-center hover:bg-white/10 transition-colors ${
                  participant.isFriend
                    ? "text-red-400 border-red-400/50"
                    : ""
                }`}
              >
                <img
                  src="/history/heart.svg"
                  alt="heart"
                  className="w-6 h-6"
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
    </div>
  );
}
