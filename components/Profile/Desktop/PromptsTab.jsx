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
        setSuggestions(data.prompts.map(p => p.text || p));
      } else if (Array.isArray(data)) {
        setSuggestions(data.slice(0, 7).map(p => p.text || p));
      }
    } catch (err) {
      console.error("Failed to fetch suggestions:", err);
      // Fallback suggestions

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
      // Optimistic update
      if (setUser) {
        setUser(prev => ({ ...prev, intent: newIntent }));
      }

      await apiRequest(API.USERS.UPDATE_INTENT, {
        method: "PATCH",
        body: JSON.stringify({ intent: newIntent }),
      });
    } catch (err) {
      console.error("Failed to update intent:", err);
      // alert("Failed to update prompt. Please try again.");
    }
  };

  return (
    <div className="flex min-w-0 flex-1 flex-col px-14">
      <div className="border border-white/30  rounded-[2rem] p-5 py-8 text-center text-sm text-white/90">
      <textarea
  rows={4}
  value={localIntent}
  onChange={(e) => setLocalIntent(e.target.value)}
  onBlur={() => handleUpdateIntent(localIntent)}
  placeholder="Type your own prompt here..."
  className="w-full bg-transparent resize-none outline-none text-center 
  placeholder-white/40 font-outfit pt-4"
/>
      </div>

      <div className="mt-3 text-left">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-white/70">Suggestions</p>
          <button
            type="button"
            onClick={fetchSuggestions}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white transition hover:bg-white/10"
            aria-label="Refresh suggestions"
          >
            <img
              src="/refresh.png"
              alt=""
              className={`p-2 ${loading ? "animate-spin" : ""}`}
            />
          </button>
        </div>

<div
  className="flex flex-wrap gap-3 overflow-hidden"
  style={{
    maxHeight: "350px" // 👈 controls ~5 rows
  }}
>
          {loading ? (
            <div className="w-full py-10 flex justify-center">
              <div className="w-6 h-6 border-2 border-white/30  rounded-full animate-spin" />
            </div>
          ) : (
            suggestions.map((text, i) => (
              <div
                key={i}
                onClick={() => handleUpdateIntent(text)}
                className={`max-w-full break-words px-4 py-4 border-[2px] border-white/30 rounded-xl text-[14px] border-b-4 hover:bg-white hover:text-black transition cursor-pointer font-outfit ${user?.intent === text ? 'bg-white text-black' : ''}`}
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
