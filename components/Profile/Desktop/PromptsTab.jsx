

"use client";

import React, { useState, useEffect } from "react";
import { API, apiRequest } from "@/lib/api";

export default function PromptsTab({ user, setUser }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSuggestions();
  }, []);

  const fetchSuggestions = async () => {
    try {
      setLoading(true);
      const data = await apiRequest(API.USERS.GET_INTENT_PROMPTS(7));
      if (data && data.prompts) {
        setSuggestions(data.prompts.map((p) => p.text || p));
      } else if (Array.isArray(data)) {
        setSuggestions(data.slice(0, 6).map((p) => p.text || p));
      }
    } catch (err) {
      console.error("Failed to fetch suggestions:", err);
    } finally {
      setLoading(false);
    }
  };

  const [localIntent, setLocalIntent] = useState(user?.intent || "");

  useEffect(() => {
    setLocalIntent(user?.intent || "");
  }, [user?.intent]);

  const handleUpdateIntent = async (newIntent) => {
    if (newIntent === user?.intent) return;
    try {
      if (setUser) {
        setUser((prev) => ({ ...prev, intent: newIntent }));
      }
      await apiRequest(API.USERS.UPDATE_INTENT, {
        method: "PATCH",
        body: JSON.stringify({ intent: newIntent }),
      });
    } catch (err) {
      console.error("Failed to update intent:", err);
    }
  };

  // 🔥 STRICT 5 ROWS ONLY (max 10 suggestions)
  const displayedSuggestions = suggestions.slice(0, 10);

  return (
    <div className="flex h-full w-full flex-col px-6 md:px-10 [@media(max-height:650px)]:scale-[0.76]">
      {/* Prompt Box */}
      <div className="flex-shrink-0 border-[2px] border-white/50 rounded-[2rem] p-5 py-6 text-center text-sm text-white/90 mb-5 ">
        <textarea
          rows={5}
          value={localIntent}
          onChange={(e) => setLocalIntent(e.target.value)}
          onBlur={() => handleUpdateIntent(localIntent)}
          placeholder="Type your own prompt here..."
          className="w-full bg-transparent resize-none outline-none text-center placeholder-white/40 font-outfit text-base leading-relaxed pt-1"
        />
      </div>



      {/* Suggestions */}


      {/* Suggestions */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between mb-3 flex-shrink-0">
          <p className="text-sm text-white/70">Suggestions</p>
          <button
            type="button"
            onClick={fetchSuggestions}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white transition hover:bg-white/10"
            aria-label="Refresh suggestions"
          >
            <img
              src="/refresh.png"
              alt=""
              className={`p-1.5 ${loading ? "animate-spin" : ""}`}
            />
          </button>
        </div>

        {/* Chips — strictly 5 rows max, no scrolling */}
        <div className={`flex flex-wrap gap-2 max-h-[310px] overflow-hidden pb-1 transition-opacity duration-200 ${loading ? "opacity-50 pointer-events-none" : ""}`}>
          {displayedSuggestions.length === 0 && loading ? (
            <div className="w-full py-8 flex justify-center">
              <div className="w-6 h-6 border-2 border-white/30 rounded-full animate-spin" />
            </div>
          ) : (
            displayedSuggestions.map((text, i) => (
              <div
                key={i}
                onClick={() => handleUpdateIntent(text)}
                className={`px-5 py-4 border-[2px] border-white/30 rounded-xl text-[13.5px] leading-tight hover:bg-white/10 transition cursor-pointer font-outfit shrink-0
                  ${user?.intent === text
                    ? "border-yellow-400  border-[2px] border-b-[4px]"
                    : "border-b-[4px]"}`}
              >
                {text}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}