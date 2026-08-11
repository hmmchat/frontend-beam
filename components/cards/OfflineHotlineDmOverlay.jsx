'use client';

import { useEffect, useState } from 'react';
import clsx from 'clsx';
import OverlayBackdrop from '@/components/ui/OverlayBackdrop';
import InsufficientBalanceBar from '@/components/ui/InsufficientBalanceBar';
import { API, apiRequest } from '@/lib/api';
import { isInsufficientBalanceError } from '@/lib/walletErrors';

const MAX_CHARS = 250;
const DEFAULT_DM_COST = 10;

/**
 * In-place Hotline DM for offline cards (Figma 8027:5489).
 * Non-friends: friend-request + paid first Hotline message (default 10 coins).
 * Friends: send via friend message path (no first-message fee).
 */
export default function OfflineHotlineDmOverlay({
  open,
  onClose,
  toUserId,
  isAlreadyFriend = false,
  walletCoins = 0,
  onCoinsUpdated,
  onOpenCoinModal,
  onSent,
}) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [dmCost, setDmCost] = useState(DEFAULT_DM_COST);

  useEffect(() => {
    if (!open) return;
    setMessage('');
    setError('');
    setSending(false);
  }, [open, toUserId]);

  useEffect(() => {
    if (!open || isAlreadyFriend) return;
    let cancelled = false;
    (async () => {
      try {
        const catalog = await apiRequest(API.FRIENDS.GET_GIFT_CATALOG);
        const cost = catalog?.firstMessageCostCoins;
        if (!cancelled && typeof cost === 'number' && cost >= 0) {
          setDmCost(cost);
        }
      } catch {
        // keep default
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, isAlreadyFriend]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const cost = isAlreadyFriend ? 0 : dmCost;
  const trimmed = message.trim();
  const hasSufficientCoins = cost === 0 || walletCoins >= cost;
  const canSend = trimmed.length > 0 && !sending && hasSufficientCoins;

  const authHeaders = () => {
    const token = localStorage.getItem('accessToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const resolveOutgoingRequestId = async (headers) => {
    // Prefer dedicated sent friend-requests endpoint, then conversation sent list.
    const endpoints = [
      API.FRIENDS.GET_SENT_FRIEND_REQUESTS,
      API.FRIENDS.GET_SENT_REQUESTS,
    ];
    for (const url of endpoints) {
      try {
        const sent = await apiRequest(url, { headers });
        const list = sent?.requests || sent?.data || sent || [];
        if (!Array.isArray(list)) continue;
        const match = list.find((r) => {
          const other =
            r.toUserId ||
            r.userId ||
            r.otherUserId ||
            r.to?.id ||
            r.otherUser?.id;
          return String(other) === String(toUserId);
        });
        const id = match?.id || match?.requestId || match?.friendRequestId;
        if (id) return id;
      } catch {
        // try next
      }
    }
    return null;
  };

  const handleSend = async () => {
    if (!toUserId || !trimmed) return;
    // Client pre-check — show Buy Coins footer; keep overlay open.
    if (!hasSufficientCoins) return;

    setSending(true);
    setError('');
    try {
      const headers = authHeaders();

      if (isAlreadyFriend) {
        await apiRequest(API.FRIENDS.SEND_FRIEND_MESSAGE(toUserId), {
          method: 'POST',
          headers,
          body: JSON.stringify({ message: trimmed }),
        });
      } else {
        let requestId = null;
        try {
          const frRes = await apiRequest(API.FRIENDS.SEND_FRIEND_REQUEST, {
            method: 'POST',
            headers,
            body: JSON.stringify({ toUserId }),
          });
          requestId =
            frRes?.requestId ||
            frRes?.id ||
            frRes?.friendRequestId ||
            frRes?.data?.id ||
            null;

          // Mutual request may auto-accept → send as friend message
          if (frRes?.autoAccepted) {
            await apiRequest(API.FRIENDS.SEND_FRIEND_MESSAGE(toUserId), {
              method: 'POST',
              headers,
              body: JSON.stringify({ message: trimmed }),
            });
            if (typeof onCoinsUpdated === 'function') await onCoinsUpdated();
            if (typeof onSent === 'function') {
              await onSent({ toUserId, requestId, autoAccepted: true });
            }
            onClose?.();
            return;
          }
        } catch (err) {
          if (isInsufficientBalanceError(err)) {
            setError('');
            return;
          }
          const msg = (err?.message || '').toLowerCase();
          const isKnown =
            msg.includes('already sent') ||
            msg.includes('already pending') ||
            msg.includes('already friend') ||
            msg.includes('already friends') ||
            msg.includes('duplicate');
          if (!isKnown) throw err;
        }

        if (!requestId) {
          requestId = await resolveOutgoingRequestId(headers);
        }

        if (!requestId) {
          throw new Error('Could not start Hotline DM. Please try again.');
        }

        await apiRequest(API.FRIENDS.SEND_REQUEST_MESSAGE(requestId), {
          method: 'POST',
          headers,
          body: JSON.stringify({ message: trimmed }),
        });
      }

      if (typeof onCoinsUpdated === 'function') await onCoinsUpdated();
      if (typeof onSent === 'function') await onSent({ toUserId });
      onClose?.();
    } catch (err) {
      console.error('[HotlineDm] send error:', err);
      // Keep overlay open; footer swaps to Buy Coins via hasSufficientCoins.
      if (isInsufficientBalanceError(err)) {
        setError('');
        return;
      }
      setError(err?.message || 'Failed to send DM.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[220] flex items-end md:items-center justify-center">
      <OverlayBackdrop blur={false} onClick={sending ? undefined : onClose} />

      <div
        className={clsx(
          'relative z-10 w-full max-w-[372px] mx-auto',
          'rounded-[28px] border-2 border-white overflow-hidden',
          'mb-[max(0.5rem,env(safe-area-inset-bottom))] md:mb-0',
          'animate-in fade-in slide-in-from-bottom-4 duration-300',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
        >
          <div className="absolute inset-0 bg-[rgba(78,0,147,0.88)]" />
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: "url('/assets/mb.jpg')",
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
        </div>

        <div className="relative z-10 flex flex-col gap-2 px-3 pt-4 pb-5">
          <div className="flex items-center gap-2 px-3">
            <div className="relative size-6 shrink-0 overflow-clip">
              <img
                src="/icons/hotline-send-mail.svg"
                alt=""
                className="absolute inset-0 size-full object-contain"
              />
            </div>
            <h2 className="font-[family-name:var(--font-otomanopee)] text-[12px] text-white leading-normal">
              Hotline Dm
            </h2>
          </div>

          <div className="relative w-full">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, MAX_CHARS))}
              placeholder="Write something…"
              rows={5}
              disabled={sending}
              className={clsx(
                'w-full h-[152px] resize-none rounded-[22px] border border-white/50',
                'bg-transparent px-10 py-8 text-center font-outfit text-[12px] text-white',
                'placeholder:text-white/40 outline-none focus:border-white/80',
                'disabled:opacity-60',
              )}
            />
            <div className="mt-1 w-full text-right font-outfit text-[10px] text-white pr-2">
              {message.length}/{MAX_CHARS}
            </div>
          </div>

          {error ? (
            <p className="px-2 text-center font-outfit text-[11px] text-rose-200">{error}</p>
          ) : null}

          <div className="px-2 pt-1">
            {!hasSufficientCoins ? (
              <InsufficientBalanceBar
                variant="mobile"
                spendAmount={cost}
                onBuyCoins={onOpenCoinModal}
              />
            ) : (
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="font-outfit text-[12px] text-white leading-normal">
                    Spend coins:
                  </span>
                  <div className="flex items-center gap-1">
                    <img
                      src="/Coins/coin10.png"
                      alt=""
                      className="w-4 h-4 rounded-full object-contain"
                    />
                    <span className="font-[family-name:var(--font-otomanopee)] text-[12px] text-white text-center leading-normal">
                      {cost}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!canSend}
                  className={clsx(
                    'h-[52px] shrink-0 rounded-[12px] border border-white/50 border-b-[3px]',
                    'px-[30px] font-[family-name:var(--font-otomanopee)] text-[12px] text-white',
                    'transition active:scale-95',
                    canSend ? 'hover:bg-white/10' : 'opacity-40 cursor-not-allowed',
                  )}
                >
                  {sending ? 'Sending…' : 'Send DM'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
