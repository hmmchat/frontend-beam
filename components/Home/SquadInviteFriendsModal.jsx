'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import clsx from 'clsx';
import { FaArrowLeftLong } from 'react-icons/fa6';
import { API, apiRequest } from '@/lib/api';

export default function SquadInviteFriendsModal({ open, onClose, onInviteSent, onLobbySync }) {
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [sentIds, setSentIds] = useState(() => new Set());
  const [inviteProductMessage, setInviteProductMessage] = useState('');

  const loadFriends = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;
      const res = await fetch(API.FRIENDS.GET_FRIENDS_WALL, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      const rows = data.friends || [];
      const enriched = await Promise.all(
        rows.map(async (f) => {
          try {
            const u = await apiRequest(API.USERS.GET_USER(f.friendId));
            return {
              friendId: f.friendId,
              photoUrl: f.photoUrl || u?.user?.displayPictureUrl || '/assets/avatar1.png',
              username: u?.user?.username || f.friendId,
            };
          } catch {
            return {
              friendId: f.friendId,
              photoUrl: f.photoUrl || '/assets/avatar1.png',
              username: f.friendId,
            };
          }
        })
      );
      setFriends(enriched);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setInviteProductMessage('');
    loadFriends();
    onLobbySync?.();
  }, [open, loadFriends, onLobbySync]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return friends;
    return friends.filter(
      (f) =>
        f.username.toLowerCase().includes(s) ||
        String(f.friendId).toLowerCase().includes(s)
    );
  }, [friends, q]);

  const invite = async (friendId) => {
    setBusyId(friendId);
    setInviteProductMessage('');
    try {
      await apiRequest(API.SQUAD.INVITE, {
        method: 'POST',
        body: JSON.stringify({ inviteeId: friendId }),
      });
      setSentIds((prev) => new Set([...prev, friendId]));
      onInviteSent?.(friendId);
    } catch (e) {
      setInviteProductMessage(e?.message || 'Could not send invite');
    } finally {
      setBusyId(null);
      onLobbySync?.();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center md:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        className={clsx(
          'relative w-full max-w-xl bg-[#1a003d]/95 border border-white/25 md:rounded-[2rem] rounded-t-[2rem]',
          'shadow-2xl max-h-[90dvh] flex flex-col text-white font-sans overflow-hidden'
        )}
      >
        <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/40 p-2 hover:bg-white/10 transition"
          >
            <FaArrowLeftLong className="text-lg" />
          </button>
          <h2 className="text-base md:text-lg font-semibold tracking-tight">
            Invite friends for squad
          </h2>
        </div>

        <div className="px-4 py-3">
          {inviteProductMessage ? (
            <div
              role="alert"
              className="mb-3 rounded-2xl border border-red-400/40 bg-red-950/45 px-4 py-3 text-sm font-medium text-red-50"
            >
              {inviteProductMessage}
            </div>
          ) : null}
          <div className="flex items-center gap-2 rounded-full border border-white/60 px-4 py-2 bg-black/20">
            <span className="text-white/50 text-sm">⌕</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search friends by name or ID"
              className="flex-1 bg-transparent outline-none text-sm placeholder:text-white/40"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-6">
          {loading ? (
            <p className="text-center text-white/50 py-12 text-sm">Loading friends…</p>
          ) : filtered.length === 0 ? (
            <p className="text-center text-white/50 py-12 text-sm">No friends match your search.</p>
          ) : (
            <ul className="divide-y divide-white/10 border border-white/10 rounded-2xl overflow-hidden mx-2">
              {filtered.map((f) => {
                const sent = sentIds.has(f.friendId);
                const busy = busyId === f.friendId;
                return (
                  <li
                    key={f.friendId}
                    className="flex items-center gap-3 px-3 py-3 bg-white/5"
                  >
                    <div className="relative w-11 h-11 rounded-full overflow-hidden border border-white/30 shrink-0">
                      <Image src={f.photoUrl} alt="" fill className="object-cover" sizes="44px" />
                    </div>
                    <span className="flex-1 text-sm font-medium truncate">{f.username}</span>
                    <button
                      type="button"
                      disabled={sent || busy}
                      onClick={() => invite(f.friendId)}
                      className={clsx(
                        'flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition',
                        sent
                          ? 'bg-yellow-400 text-black'
                          : 'bg-white/15 hover:bg-white/25 border border-white/30'
                      )}
                    >
                      <span
                        className={clsx(
                          'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
                          sent ? 'bg-black/20' : 'bg-white text-purple-900'
                        )}
                      >
                        {sent ? '✓' : '+'}
                      </span>
                      {sent ? 'Sent' : busy ? '…' : 'Invite'}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
