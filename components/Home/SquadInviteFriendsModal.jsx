'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import clsx from 'clsx';
import { FaArrowLeftLong } from 'react-icons/fa6';
import { API, apiRequest } from '@/lib/api';
import { FaSearch } from 'react-icons/fa';
export default function SquadInviteFriendsModal({ open, onClose, onInviteSent, squadMemberIds = [] }) {
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [sentIds, setSentIds] = useState(() => new Set());
  const [pendingInviteeIds, setPendingInviteeIds] = useState(() => new Set());
  const [inviteProductMessage, setInviteProductMessage] = useState('');

  const loadFriends = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;
      const data = await apiRequest(API.FRIENDS.GET_FRIENDS_WALL);
      const rows = data.friends || [];
      const enriched = await Promise.all(
        rows.map(async (f) => {
          try {
            const u = await apiRequest(API.USERS.GET_USER(f.friendId));
            return {
              friendId: f.friendId,
              photoUrl: f.photoUrl || u?.user?.displayPictureUrl,
              username: u?.user?.username || f.friendId,
            };
          } catch {
            return {
              friendId: f.friendId,
              photoUrl: f.photoUrl,
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
    const loadPending = async () => {
      try {
        const r = await apiRequest(API.SQUAD.PENDING_INVITATIONS_LOBBY);
        const ids = new Set(
          (r?.invitations || [])
            .map((x) => x?.inviteeId)
            .filter(Boolean)
        );
        setPendingInviteeIds(ids);
      } catch {
        setPendingInviteeIds(new Set());
      }
    };
    void loadFriends();
    void loadPending();
  }, [open, loadFriends]);

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
      setPendingInviteeIds((prev) => new Set([...prev, friendId]));
      onInviteSent?.(friendId);
    } catch (e) {
      setInviteProductMessage(e?.message || 'Could not send invite');
    } finally {
      setBusyId(null);
    }
  };

  const cancelInvite = async (friendId) => {
    setBusyId(friendId);
    setInviteProductMessage('');
    try {
      await apiRequest(API.SQUAD.CANCEL_INVITATION, {
        method: 'POST',
        body: JSON.stringify({ inviteeId: friendId }),
      });
      setPendingInviteeIds((prev) => {
        const next = new Set(prev);
        next.delete(friendId);
        return next;
      });
      setSentIds((prev) => {
        const next = new Set(prev);
        next.delete(friendId);
        return next;
      });
      onInviteSent?.(friendId);
    } catch (e) {
      setInviteProductMessage(e?.message || 'Could not cancel invite');
    } finally {
      setBusyId(null);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center md:p-6">


      <button
        type="button"
        className="absolute inset-0 "
        aria-label="Close"
        onClick={onClose}
      />


      <div
        className={clsx(
          'relative w-full max-w-xl border border-white/25 md:rounded-[2rem] rounded-t-[2rem]',
          ' max-h-[90dvh] flex flex-col text-white font-sans overflow-hidden'
        )}
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "url(/assets/mb.jpg)",
            backgroundSize: "cover",
          }}
        />



        <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10 z-50">
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

        <div className="relative z-10 px-6 py-3">
          {inviteProductMessage ? (
            <div
              role="alert"
              className="mb-3 rounded-2xl border border-red-400/40 bg-red-950/45 px-4 py-3 text-sm font-medium text-red-50"
            >
              {inviteProductMessage}
            </div>
          ) : null}
          <div className="flex items-center gap-2 rounded-full border border-white/60 px-1 py-1 ">
            <span className="text-white text-sm border rounded-full h-9 w-9 flex items-center justify-center"><FaSearch className="" /></span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search friends by name or ID"
              className="flex-1 bg-transparent outline-none text-sm placeholder:text-white/40"
            />
          </div>
        </div>

        <div className="relative z-10 flex-1 overflow-y-auto px-2 pb-6">
          {loading ? (
            <p className="text-center text-white/50 py-12 text-sm">Loading friends…</p>
          ) : filtered.length === 0 ? (
            <p className="text-center text-white/50 py-12 text-sm">No friends match your search.</p>
          ) : (
            <ul className="divide-y divide-white/10 border border-white/30 rounded-2xl overflow-hidden mx-2">
              {filtered.map((f) => {
                const sent = sentIds.has(f.friendId) || pendingInviteeIds.has(f.friendId);
                const busy = busyId === f.friendId;
                const alreadyInSquad = squadMemberIds.includes(f.friendId);
                return (
                  <li
                    key={f.friendId}
                    className="flex items-center gap-3 px-3 py-3 "
                  >
                    <div className="relative w-11 h-11 rounded-full overflow-hidden border border-white/30 shrink-0">
                      {(typeof f.photoUrl === "string" && f.photoUrl.trim()) ? (
                        <Image
                          src={f.photoUrl}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="44px"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white text-base font-bold select-none">
                          {(f.username || "U").charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <span className="flex-1 text-sm font-medium truncate">{f.username}</span>
                    <button
                      type="button"
                      disabled={busy || alreadyInSquad}
                      onClick={() => (sent ? cancelInvite(f.friendId) : invite(f.friendId))}
                      className={clsx(
                        'flex items-center font-outfit gap-2 rounded-full px-3 py-1.5 text-xs  transition',
                        alreadyInSquad
                          ? 'bg-white/10 text-white/60   cursor-not-allowed'
                          : sent
                            ? 'bg-yellow-400 text-black'
                            : ' hover:bg-white/25  '
                      )}
                    >
                      <span
                        className={clsx(
                          'w-6 h-6 rounded-full flex items-center justify-center text-xl font-bold',
                          alreadyInSquad
                            ? 'bg-white/10 text-white/70'
                            : sent
                              ? 'bg-black/20'
                              : 'bg-white text-purple-900'
                        )}
                      >
                        {alreadyInSquad ? '•' : sent ? 'x' : '+'}
                      </span>
                      {alreadyInSquad ? 'In squad' : sent ? (busy ? '…' : 'Cancel invite now') : busy ? '…' : 'Invite'}
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
