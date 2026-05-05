"use client";

import React, { useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { API, apiRequest } from "@/lib/api";

export default function ProfileMobilePrompts({ onBack, user, setUser }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [localIntent, setLocalIntent] = useState(user?.intent || "");

  useEffect(() => {
    fetchSuggestions();
  }, []);

  useEffect(() => {
    setLocalIntent(user?.intent || "");
  }, [user?.intent]);

  const fetchSuggestions = async () => {
    try {
      setLoading(true);
      const data = await apiRequest(API.USERS.GET_INTENT_PROMPTS(7));
      if (data && data.prompts) {
        setSuggestions(data.prompts.map((p) => p.text || p));
      } else if (Array.isArray(data)) {
        setSuggestions(data.slice(0, 10).map((p) => p.text || p));
      }
    } catch (err) {
      console.error("Failed to fetch suggestions:", err);
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <div className="w-full  flex flex-col h-[100dvh] pb-6">
      {/* TOP */}
      <div className="flex items-center gap-3 mb-6">
        <div
          onClick={onBack}
          className="w-10 h-10 border border-white/40 rounded-full flex items-center justify-center cursor-pointer"
        >
          <ArrowLeft size={18} />
        </div>
        <p className="text-base">My prompt</p>
      </div>

      {/* CARD */}
      <div className="border border-white/30 rounded-[1.5rem] p-2 pb-6">
        {/* CURRENT PROMPT */}
        <div className="border border-white/30 rounded-2xl p-4 text-center text-sm mb-6">
          <textarea
            rows={4}
            value={localIntent}
            onChange={(e) => setLocalIntent(e.target.value)}
            onBlur={() => handleUpdateIntent(localIntent)}
            placeholder="Type your own prompt here..."
            className="w-full bg-transparent resize-none outline-none text-center placeholder-white/40 font-outfit text-base leading-relaxed pt-1"
          />
        </div>


        <div className="mb-4 border-[2px] border-white/30 rounded-2xl p-2 pb-10">
          
     

        {/* SUGGESTIONS HEADER */}
        <div className="flex items-center justify-between mb-4 ">
          <p className="text-sm text-white/70 font-outfit">Suggestions</p>
          <button
            type="button"
            onClick={fetchSuggestions}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/40 transition hover:bg-white/10"
            aria-label="Refresh suggestions"
          >
            <img
              src="/refresh.png"
              alt=""
              className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
            />
          </button>
        </div>

        {/* SUGGESTION CHIPS */}
        <div className="flex flex-wrap gap-2">
          {loading ? (
            <div className="w-full py-8 flex justify-center">
              <div className="w-6 h-6 border-2 border-white/30 rounded-full animate-spin" />
            </div>
          ) : (
            suggestions.map((text, i) => (
              <div
                key={i}
                onClick={() => handleUpdateIntent(text)}
                className={`px-4 py-3 border-[1px] border-white/30 rounded-xl text-[13px] leading-tight transition cursor-pointer font-outfit shrink-0
                  ${user?.intent === text
                    ? "border-yellow-400 border-[1px] border-b-[3px] bg-white/10"
                    : "border-b-[2.7px] hover:bg-white/5"}`}
              >
                {text}
              </div>
            ))
          )}
        </div>

   </div>

  <div 
        onClick={onBack}
        className="border border-white/30 rounded-2xl py-4 text-center mt-8 font-semibold cursor-pointer active:scale-95 transition-all w-[95%] mx-auto"
      >
        Save & Back
      </div>
      </div>

      {/* CTA (Optional, can be used to navigate back or similar) */}
    
    </div>
  );
}
