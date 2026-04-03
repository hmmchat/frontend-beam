"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import Skeleton from "@/components/ui/Skeleton";
import { apiRequestFirstOk, buildGifsSearchUrls, buildGifsTrendingUrls } from "@/lib/api";

function normalizeGif(row) {
  if (!row || typeof row !== "object") return null;
  const previewUrl =
    row.previewUrl ||
    row.preview_url ||
    row?.images?.fixed_width_small?.url ||
    row?.images?.fixed_height_small?.url ||
    row?.images?.preview_gif?.url ||
    row?.images?.downsized_small?.mp4 ||
    row?.images?.original?.url ||
    null;
  const url =
    row.url ||
    row.gifUrl ||
    row.gif_url ||
    row?.images?.original?.url ||
    row?.images?.downsized?.url ||
    previewUrl ||
    null;
  if (!previewUrl && !url) return null;
  return {
    giphyId: row.giphyId || row.id || null,
    previewUrl: String(previewUrl),
    url: String(url),
    width: row.width || row?.images?.fixed_width_small?.width || null,
    height: row.height || row?.images?.fixed_width_small?.height || null,
  };
}

export default function GifPicker({ onSelect, className }) {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState(null);
  const debounceRef = useRef(null);

  const fetchTrending = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const data = await apiRequestFirstOk(buildGifsTrendingUrls());
      const list = data?.gifs || data?.data || data?.results || data || [];
      const arr = Array.isArray(list) ? list : [];
      setRows(arr.map(normalizeGif).filter(Boolean));
    } catch (e) {
      setErr(e?.message || "Could not load GIFs");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSearch = useCallback(async (query) => {
    const qq = (query || "").trim();
    if (!qq) return fetchTrending();
    setLoading(true);
    setErr(null);
    try {
      const data = await apiRequestFirstOk(buildGifsSearchUrls(qq));
      const list = data?.gifs || data?.data || data?.results || data || [];
      const arr = Array.isArray(list) ? list : [];
      setRows(arr.map(normalizeGif).filter(Boolean));
    } catch (e) {
      setErr(e?.message || "Could not search GIFs");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [fetchTrending]);

  useEffect(() => {
    fetchTrending();
  }, [fetchTrending]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchSearch(q);
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [q, fetchSearch]);

  const display = useMemo(() => rows, [rows]);

  return (
    <div
      className={clsx(
        "w-[20rem] max-w-[90vw] rounded-2xl border border-white/20 bg-neutral-950/95 backdrop-blur-md shadow-2xl overflow-hidden",
        className
      )}
      role="dialog"
      aria-label="GIF picker"
    >
      <div className="p-3 border-b border-white/10">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search GIFs"
          className="w-full rounded-xl bg-white/5 border border-white/15 px-3 py-2 text-sm text-white placeholder-white/40 focus:outline-none focus:border-white/30"
        />
      </div>
      <div className="p-2 max-h-[18rem] overflow-auto">
        {err && <div className="px-2 py-2 text-xs text-red-300">{err}</div>}
        {loading && (
          <div className="grid grid-cols-2 gap-2 mb-2">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-28 w-full rounded-xl" />
            ))}
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          {display.map((g) => (
            <button
              key={`${g.giphyId || ""}:${g.previewUrl}`}
              type="button"
              onClick={() => onSelect?.(g)}
              className="rounded-xl overflow-hidden border border-white/10 hover:border-white/25 bg-white/5"
              title="Select GIF"
            >
              <img
                src={g.previewUrl}
                alt="GIF"
                className="block w-full h-28 object-cover"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            </button>
          ))}
        </div>
        {!loading && display.length === 0 && !err && (
          <div className="py-6 text-center text-white/50 text-sm">No GIFs</div>
        )}
      </div>
    </div>
  );
}

