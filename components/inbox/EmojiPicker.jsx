"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";

const EMOJIS = [
  "😀","😃","😄","😁","😆","😅","😂","🤣","😊","😍","😘","😗","😙","😚","🙂","😉","😌","😋","😜","🤪","😝","😎","🤩","🥳",
  "😤","😠","😡","😢","😭","😥","😓","😩","🥺","😳","😱","😴","🤒","🤕","🤢","🤮","🤧","😷",
  "👍","👎","👏","🙏","🤝","💪","🫶","🤟","✌️","👌","👋","🤙","🫡","🤞","☝️","👇",
  "❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","💕","💞","💓","💗","💖","💘","💝",
  "🔥","✨","🌟","💫","🎉","🎊","🎁","💯","✅","❌","⚡️","💥","🌈","☀️","🌙","⭐️",
];

export default function EmojiPicker({ onSelect, className }) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const query = (q || "").trim();
    if (!query) return EMOJIS;
    // Minimal UX: filter only by literal emoji match.
    return EMOJIS.filter((e) => e.includes(query));
  }, [q]);

  return (
    <div
      className={clsx(
        "w-[20rem] max-w-[90vw] rounded-2xl border border-white/20 bg-neutral-950/95 backdrop-blur-md shadow-2xl overflow-hidden",
        className
      )}
      role="dialog"
      aria-label="Emoji picker"
    >
      <div className="p-3 border-b border-white/10">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search"
          className="w-full rounded-xl bg-white/5 border border-white/15 px-3 py-2 text-sm text-white placeholder-white/40 focus:outline-none focus:border-white/30"
        />
      </div>
      <div className="p-2 max-h-[16rem] overflow-auto">
        <div className="grid grid-cols-8 gap-1">
          {filtered.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => onSelect?.(e)}
              className="h-9 w-9 rounded-xl hover:bg-white/10 active:bg-white/15 text-xl flex items-center justify-center"
              title={e}
            >
              {e}
            </button>
          ))}
        </div>
        {filtered.length === 0 && (
          <div className="py-6 text-center text-white/50 text-sm">No results</div>
        )}
      </div>
    </div>
  );
}

