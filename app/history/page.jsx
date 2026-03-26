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
  const [myUserId, setMyUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedSessions, setExpandedSessions] = useState({});
  const [timelineBySession, setTimelineBySession] = useState({});
  const [timelineLoadingBySession, setTimelineLoadingBySession] = useState({});

  useEffect(() => {
    setMyUserId(localStorage.getItem("userId"));
    const fetchHistory = async () => {
      try {
        // GET /streaming/history is authenticated via JWT - no userId param needed
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

  const fetchTimeline = async (sessionId) => {
    if (timelineBySession[sessionId]) return;
    setTimelineLoadingBySession((prev) => ({ ...prev, [sessionId]: true }));
    try {
      const data = await apiRequest(API.STREAMING.GET_HISTORY_TIMELINE(sessionId));
      setTimelineBySession((prev) => ({ ...prev, [sessionId]: data.timeline || [] }));
    } catch (err) {
      console.error("Failed to fetch history timeline:", err);
      setTimelineBySession((prev) => ({ ...prev, [sessionId]: [] }));
    } finally {
      setTimelineLoadingBySession((prev) => ({ ...prev, [sessionId]: false }));
    }
  };

  const toggleTimeline = (sessionId) => {
    setExpandedSessions((prev) => {
      const next = !prev[sessionId];
      if (next) fetchTimeline(sessionId);
      return { ...prev, [sessionId]: next };
    });
  };

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

  const formatTimelineTime = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Kolkata",
    });
  };

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
                  {call.participants
                    .filter((p) => p.userId !== myUserId)
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

                          <IoMdInformationCircleOutline
                            onClick={() => toggleTimeline(call.sessionId)}
                            className="text-lg ml-auto cursor-pointer opacity-70 hover:opacity-100"
                          />
                        </div>

                        {/* HR always */}
                        <hr className="border-white/30" />

                        {/* Card content */}
                        <div className="flex items-center justify-between">
                          {/* Left */}
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-full overflow-hidden border border-white/10">
                              <Image
                                src={participant.displayPictureUrl || "/assets/avatarDefault.png"}
                                alt="user"
                                width={56}
                                height={56}
                                className="object-cover w-full h-full"
                              />
                            </div>

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

                  {expandedSessions[call.sessionId] && (
                    <div className="border border-white/20 rounded-3xl p-4 bg-black/20">
                      <div className="text-xs uppercase tracking-wider text-white/70 mb-3">
                        Room timeline
                      </div>

                      {timelineLoadingBySession[call.sessionId] ? (
                        <div className="text-sm text-white/60">Loading timeline...</div>
                      ) : (timelineBySession[call.sessionId] || []).length === 0 ? (
                        <div className="text-sm text-white/60">No timeline events found.</div>
                      ) : (
                        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                          {(timelineBySession[call.sessionId] || []).map((event, idx) => (
                            <div
                              key={`${call.sessionId}-${event.at}-${event.eventType}-${idx}`}
                              className="flex items-start gap-3 border border-white/15 rounded-xl px-3 py-2"
                            >
                              <div className="text-[11px] text-white/60 min-w-[46px]">
                                {formatTimelineTime(event.at)}
                              </div>
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-white">
                                  {event.title}
                                  {event.username ? ` · ${event.username}` : ""}
                                </div>
                                <div className="text-xs text-white/70 break-words">
                                  {event.description}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
