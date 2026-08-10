'use client';

import { useEffect, useState } from 'react';
import clsx from 'clsx';
import MemeLoader from '@/components/VideoChat/MemeLoader';
import { API, apiRequest } from '@/lib/api';

/**
 * Same meme loading experience as video-call connect — for discovery wait states
 * that are NOT the city face-card handoff.
 */
export default function DiscoveryMemeLoader({ className }) {
  const [loadingMeme, setLoadingMeme] = useState(null);

  useEffect(() => {
    let cancelled = false;
    let cycleInterval = null;
    const normalizeMeme = (meme) =>
      meme ? { imageUrl: meme.imageUrl || '', text: meme.text } : null;

    (async () => {
      try {
        const response = await apiRequest(API.STREAMING.GET_LOADING_MEMES);
        if (cancelled) return;
        const activeMemes = Array.isArray(response?.memes)
          ? response.memes.filter((meme) => meme && (meme.imageUrl || meme.text))
          : [];
        if (activeMemes.length > 0) {
          const orderedMemes = activeMemes
            .filter((m) => Number.isFinite(Number(m.order)))
            .sort((a, b) => Number(a.order) - Number(b.order));
          const memesToCycle = orderedMemes.length > 0 ? orderedMemes : activeMemes;
          let currentIndex = 0;
          if (orderedMemes.length > 0) {
            const key = 'beam_loading_meme_order_index';
            const prev = Number.parseInt(
              typeof localStorage !== 'undefined' ? localStorage.getItem(key) || '0' : '0',
              10,
            );
            currentIndex = Number.isFinite(prev) ? prev % memesToCycle.length : 0;
            if (typeof localStorage !== 'undefined') {
              localStorage.setItem(key, String((currentIndex + 1) % memesToCycle.length));
            }
          } else {
            currentIndex = Math.floor(Math.random() * memesToCycle.length);
          }
          setLoadingMeme(normalizeMeme(memesToCycle[currentIndex]));
          if (memesToCycle.length > 1) {
            cycleInterval = setInterval(() => {
              currentIndex = (currentIndex + 1) % memesToCycle.length;
              setLoadingMeme(normalizeMeme(memesToCycle[currentIndex]));
            }, 2000);
          }
          return;
        }
      } catch {
        /* fall through */
      }
      try {
        const response = await apiRequest(API.STREAMING.GET_RANDOM_LOADING_MEME);
        if (cancelled) return;
        setLoadingMeme(normalizeMeme(response?.meme || response));
      } catch {
        if (!cancelled) setLoadingMeme({ imageUrl: '', text: '' });
      }
    })();

    return () => {
      cancelled = true;
      if (cycleInterval) clearInterval(cycleInterval);
    };
  }, []);

  return (
    <div
      className={clsx(
        'relative',
        'flex',
        'h-full',
        'w-full',
        'min-h-0',
        'flex-col',
        className,
      )}
    >
      {/* Pocket stroke lives on the parent (Figma 10945:36945) — no nested frame */}
      <MemeLoader loadingMeme={loadingMeme} showFrame={false} />
    </div>
  );
}
