"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { FaArrowLeftLong, FaHeart, FaMessage } from "react-icons/fa6";
import { IoVideocamOutline } from "react-icons/io5";
import { IoMdInformationCircleOutline } from "react-icons/io";
import { API, apiRequest } from "@/lib/api";

export default function History() {
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
    <div className="h-screen w-full relative text-white overflow-hidden">

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
      <div className="h-full flex flex-col px-4 md:px-16 py-10 max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-4 mb-6 justify-between">
          <div className="flex items-center gap-2">
            <div 
              onClick={() => router.push('/')}
              className="border border-white rounded-full p-2 cursor-pointer hover:bg-white/10 transition-colors"
            >
              <FaArrowLeftLong />
            </div>
            <h1 className="text-lg font-medium">History</h1>
          </div>

          <div>
            <img src="./LOGO.png" alt="Logo" className="w-24 md:w-32" />
          </div>
        </div>

        {/* Main Card */}
        <div className="flex-1 rounded-[40px] md:p-6 overflow-hidden 
                        md:ring-2 md:ring-white/40 
                        md:ring-offset-2 md:ring-offset-purple-900/80">

          <div className="h-full overflow-y-auto space-y-8 pr-2">
            {loading ? (
              <div className="text-center py-10 opacity-50">Loading history...</div>
            ) : calls.length === 0 ? (
              <div className="text-center py-10 opacity-50">No history found</div>
            ) : (
              calls.map((call, gi) => (
                <div
                  key={call.sessionId}
                  className="border border-white/30 rounded-[36px] md:p-4 p-2 space-y-4"
                >
                  {/* Call-level activity summary (priority-ish events) */}
                  {timelinesBySessionId[call.sessionId] ? (
                    (() => {
                      const timeline = timelinesBySessionId[call.sessionId] || [];
                      const participantById = Object.fromEntries(
                        (call.participants || []).map((p) => [String(p.userId), p])
                      );

                      const joinedEvents = timeline
                        .filter((e) => e.eventType === "participant_joined_time")
                        .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

                      const joinOrder = joinedEvents
                        .slice(0, 3)
                        .map((e) => participantById[String(e.userId)]?.username || "User")
                        .join(" → ");

                      const pulledIn = timeline
                        .find((e) => e.eventType === "participant_joined_via_pull_stranger" && viewerId && String(e.userId) === String(viewerId));
                      const kicked = timeline
                        .find((e) => e.eventType === "participant_kicked" && viewerId && String(e.userId) === String(viewerId));
                      const exited = timeline
                        .find((e) => e.eventType === "participant_left_time" && viewerId && String(e.userId) === String(viewerId));

                      const primaryEvents = [
                        pulledIn ? { label: "Pulled stranger", at: pulledIn.at } : null,
                        kicked ? { label: "Kicked out", at: kicked.at } : null,
                        exited ? { label: "Exited", at: exited.at } : null,
                      ].filter(Boolean);

                      return (
                        <div className="flex flex-col gap-2">
                          {primaryEvents.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {primaryEvents.map((e, idx) => (
                                <div
                                  key={`${call.sessionId}-evt-${idx}`}
                                  className="text-[11px] px-3 py-1 rounded-full border border-white/20 bg-black/30 text-white/90 font-semibold"
                                >
                                  {e.label}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-xs text-white/60">No special events recorded for this call.</div>
                          )}

                          {joinOrder && (
                            <div className="text-xs text-white/70">
                              Join order: <span className="text-white">{joinOrder}</span>
                            </div>
                          )}
                        </div>
                      );
                    })()
                  ) : (
                    <div className="text-xs text-white/60">Loading timeline...</div>
                  )}

                  {call.participants
                    .filter(p => p.userId !== localStorage.getItem("userId"))
                    .map((participant, i) => (
                      <div
                        key={participant.userId}
                        className="border border-white/30 rounded-3xl p-5 space-y-4"
                      >
                        {/* Top row: Squad + Date */}
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

                          <span className="text-xs text-white/70">
                            {formatDate(call.startedAt)}
                          </span>

                          <IoMdInformationCircleOutline className="text-lg ml-auto cursor-pointer opacity-70 hover:opacity-100" />
                        </div>

                        {/* HR always */}
                        <hr className="border-white/30" />

                        {/* Card content */}
                        <div className="flex items-center justify-between">
                          {/* Left */}
                          <div className="flex items-center gap-4">
                            <button
                              type="button"
                              onClick={() => router.push(`/facecard?userId=${encodeURIComponent(participant.userId)}`)}
                              className="w-14 h-14 rounded-full overflow-hidden border border-white/10 cursor-pointer hover:bg-white/5 transition-colors"
                              aria-label={`View ${participant.username || 'this user'} face card`}
                            >
                              <Image
                                src={participant.displayPictureUrl || "/assets/avatarDefault.png"}
                                alt="user"
                                width={56}
                                height={56}
                                className="object-cover w-full h-full"
                              />
                            </button>

                            <div className="space-y-1">
                              <div className="font-medium">{participant.username || "Stranger"}</div>
                              <div className="text-sm text-white/70">📍 {participant.location || "Somewhere"}</div>
                              <div className="flex items-center gap-2 text-sm text-white/80">
                                <IoVideocamOutline />
                                {formatDuration(participant.durationSeconds)}
                              </div>
                            </div>
                          </div>

                          {/* Right */}
                          <div className="flex items-center gap-4">
                            <button
                              onClick={() => participant.conversationId && router.push(`/inbox?chat=${participant.conversationId}`)}
                              className="w-10 h-10 border border-white/30 rounded-full grid place-items-center hover:bg-white/10 transition-colors"
                            >
                              <FaMessage />
                            </button>
                            <button className={`w-10 h-10 border border-white/30 rounded-full grid place-items-center hover:bg-white/10 transition-colors ${participant.isFriend ? 'text-red-400 border-red-400/50' : ''}`}>
                              <FaHeart />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
