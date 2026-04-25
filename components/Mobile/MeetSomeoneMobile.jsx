'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import SignUpModal from '@/components/auth/SignUpModal';
import GenderModal from '@/components/modals/GenderModal';
import LocationModal from '@/components/modals/LocationModal';
import SquadInviteFriendsModal from '@/components/Home/SquadInviteFriendsModal';
import SquadQuickInviteStrip from '@/components/Home/SquadQuickInviteStrip';
import { IoMenu, IoHome, IoTimeOutline, IoChatbubbleEllipsesOutline, IoPersonOutline, IoLogoSnapchat, IoLogoInstagram, IoLogoWhatsapp, IoCopyOutline } from 'react-icons/io5';
import { API, apiRequest } from '@/lib/api';
import {
    getNotificationBadgeCount,
    getNotificationCountThrottled,
    subscribeNotificationRealtime,
    subscribeNotificationCount,
} from '@/lib/notification-count';
import clsx from 'clsx';

export default function MeetSomeoneMobile() {
    const router = useRouter();
    const pathname = usePathname();
    const [isSignUpOpen, setIsSignUpOpen] = useState(false);
    const [isGenderModalOpen, setIsGenderModalOpen] = useState(false);
    const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
    const [activeMeetingCount, setActiveMeetingCount] = useState(0);
    const [coins] = useState(25500);
    const [mode, setMode] = useState('solo'); // solo | squad
    const [unreadCount, setUnreadCount] = useState(0);
    const [myProfile, setMyProfile] = useState(null);
    const [squadInviteOpen, setSquadInviteOpen] = useState(false);
    const [squadLobby, setSquadLobby] = useState(null);
    const [squadMeetBusy, setSquadMeetBusy] = useState(false);
    const [squadShareBusy, setSquadShareBusy] = useState(false);
    const [quickInviteFriends, setQuickInviteFriends] = useState([]);
    const [quickInviteBusyId, setQuickInviteBusyId] = useState(null);
    const [quickInvitePendingIds, setQuickInvitePendingIds] = useState(() => new Set());
    const [squadMemberActionBusyId, setSquadMemberActionBusyId] = useState(null);
    const [squadProductMessage, setSquadProductMessage] = useState('');
    const [guestProfiles, setGuestProfiles] = useState({});
    const prevModeSquadRef = useRef(mode);
    const squadPollRef = useRef(null);
    const squadVideoRoomNavKeyRef = useRef('');

    const myUserId = myProfile?.id;

    const squadGuestIds = useMemo(() => {
        if (!squadLobby?.memberIds?.length) return [null, null, null];
        const others = squadLobby.memberIds.filter((id) => id && id !== myUserId).slice(0, 3);
        return [0, 1, 2].map((i) => others[i] || null);
    }, [squadLobby, myUserId]);

    const isInSquadLobby = Boolean(
        squadLobby &&
            myUserId &&
            Array.isArray(squadLobby?.memberIds) &&
            squadLobby.memberIds.includes(myUserId),
    );
    const canSquadMeet =
        isInSquadLobby &&
        squadLobby?.status !== 'IN_CALL' &&
        squadLobby.memberIds.length >= 2;

    /** Squad on home: slot under Share to whenever squad mode is on (lobby may still be loading). */
    const squadHomeInviteMeetSlotActive =
        mode === 'squad' && squadLobby?.status !== 'IN_CALL';

    const refreshSquadLobby = useCallback(async () => {
        try {
            const m = await apiRequest(API.SQUAD.LOBBY_MEMBERSHIP);
            if (m?.role !== 'none' && m?.lobby) {
                setSquadLobby({ ...m.lobby, role: m.role });
            } else {
                setSquadLobby(null);
            }
        } catch {
            setSquadLobby(null);
        }
    }, []);

    useEffect(() => {
        const fetchMetrics = async () => {
            try {
                const res = await apiRequest(API.USERS.GET_ACTIVE_MEETINGS).catch(() => null);
                if (res && typeof res.count === 'number') {
                    setActiveMeetingCount(res.count);
                }
            } catch (e) {
                // silent failure
            }
        };

        const fetchNotifications = async () => {
            try {
                const token = localStorage.getItem('accessToken');
                if (!token) return;
                const notifRes = await getNotificationCountThrottled();
                if (notifRes) {
                    const count = getNotificationBadgeCount(notifRes);
                    setUnreadCount((prev) => (prev === count ? prev : count));
                }
            } catch (e) {
                // silent failure
            }
        };

        fetchMetrics();
        const unsubscribe = subscribeNotificationCount((notifRes) => {
            const count = getNotificationBadgeCount(notifRes);
            setUnreadCount((prev) => (prev === count ? prev : count));
        });
        const unsubscribeRealtime = subscribeNotificationRealtime();
        fetchNotifications();
        const metricsInterval = setInterval(fetchMetrics, 15000);
        const notifInterval = setInterval(fetchNotifications, 10000);
        const onFocus = () => void getNotificationCountThrottled({ force: true, minGapMs: 5000 });
        const onVisible = () => {
            if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
                void getNotificationCountThrottled({ force: true, minGapMs: 5000 });
            }
        };
        if (typeof window !== 'undefined') {
            window.addEventListener('focus', onFocus);
        }
        if (typeof document !== 'undefined') {
            document.addEventListener('visibilitychange', onVisible);
        }
        return () => {
            unsubscribe();
            unsubscribeRealtime();
            clearInterval(metricsInterval);
            clearInterval(notifInterval);
            if (typeof window !== 'undefined') {
                window.removeEventListener('focus', onFocus);
            }
            if (typeof document !== 'undefined') {
                document.removeEventListener('visibilitychange', onVisible);
            }
        };
    }, []);

    useEffect(() => {
        const loadMe = async () => {
            try {
                const token = localStorage.getItem('accessToken');
                if (!token) return;
                const res = await fetch(API.USERS.GET_ME, { headers: { Authorization: `Bearer ${token}` } });
                if (res.ok) {
                    const data = await res.json();
                    setMyProfile(data.user);
                }
            } catch {
                // ignore
            }
        };
        loadMe();
    }, []);

    useEffect(() => {
        const prev = prevModeSquadRef.current;
        prevModeSquadRef.current = mode;
        if (prev === 'squad' && mode === 'solo') {
            void apiRequest(API.SQUAD.TOGGLE_SOLO, { method: 'POST' }).catch(() => {});
        }
        if (mode !== 'squad') setSquadProductMessage('');
    }, [mode]);

    useEffect(() => {
        if (mode !== 'squad') {
            if (squadPollRef.current) {
                clearInterval(squadPollRef.current);
                squadPollRef.current = null;
            }
            return;
        }
        void refreshSquadLobby();
        squadPollRef.current = setInterval(() => void refreshSquadLobby(), 1500);
        return () => {
            if (squadPollRef.current) {
                clearInterval(squadPollRef.current);
                squadPollRef.current = null;
            }
        };
    }, [mode, refreshSquadLobby]);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            const ids = squadGuestIds.filter(Boolean);
            for (const id of ids) {
                try {
                    const r = await apiRequest(API.USERS.GET_USER(id));
                    if (!cancelled && r?.user) {
                        setGuestProfiles((p) => (p[id] ? p : { ...p, [id]: r.user }));
                    }
                } catch {
                    // ignore
                }
            }
        };
        void load();
        return () => {
            cancelled = true;
        };
    }, [squadGuestIds]);

    useEffect(() => {
        if (!squadLobby?.memberIds?.length) {
            setGuestProfiles({});
            return;
        }
        const keep = new Set(squadLobby.memberIds.filter(Boolean));
        setGuestProfiles((prev) => {
            const next = {};
            for (const id of keep) {
                if (prev[id]) next[id] = prev[id];
            }
            return next;
        });
    }, [squadLobby]);

    useEffect(() => {
        if (mode !== 'squad' || !squadLobby) {
            squadVideoRoomNavKeyRef.current = '';
        }
    }, [mode, squadLobby]);

    const applySquadEnterResponse = useCallback(
        async (data) => {
            const roomKey = data?.roomId || '';
            if (!roomKey) return;
            if (squadVideoRoomNavKeyRef.current === roomKey) return;

            const memberIds = data.memberIds || [];
            const others = memberIds.filter((id) => id && id !== myUserId);
            let partner = {
                id: '',
                username: 'Squad',
                age: '',
                city: '',
                displayPictureUrl: '/assets/avatar1.png',
            };
            if (others[0]) {
                try {
                    const pr = await apiRequest(API.USERS.GET_USER(others[0]));
                    const u = pr?.user || {};
                    partner = {
                        id: u.id || others[0],
                        username: u.username || 'Squad',
                        age: '',
                        city: u.preferredCity || '',
                        displayPictureUrl: u.displayPictureUrl || '/assets/avatar1.png',
                    };
                } catch {
                    partner = { ...partner, id: others[0] };
                }
            }
            localStorage.setItem(
                'currentRoom',
                JSON.stringify({
                    roomId: data.roomId,
                    sessionId: data.sessionId,
                    callType: 'squad',
                    memberIds,
                    partner,
                }),
            );
            squadVideoRoomNavKeyRef.current = roomKey;
            router.push('/video-chat');
        },
        [myUserId, router],
    );

    useEffect(() => {
        if (mode !== 'squad' || squadLobby?.status !== 'IN_CALL') return;
        if (squadMeetBusy) return;
        if (typeof window !== 'undefined' && window.location.pathname.startsWith('/video-chat')) return;

        let cancelled = false;
        (async () => {
            try {
                const data = await apiRequest(API.SQUAD.ENTER_CALL, { method: 'POST' });
                if (cancelled) return;
                await applySquadEnterResponse(data);
            } catch (e) {
                if (e?.status === 410) {
                    await refreshSquadLobby();
                }
                // Retry on next poll
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [mode, squadLobby?.status, squadMeetBusy, applySquadEnterResponse, refreshSquadLobby]);

    const handleSquadEnterCall = async () => {
        if (!canSquadMeet || squadMeetBusy) return;
        setSquadProductMessage('');
        setSquadMeetBusy(true);
        try {
            const data = await apiRequest(API.SQUAD.ENTER_CALL, { method: 'POST' });
            await applySquadEnterResponse(data);
        } catch (e) {
            if (e?.status === 410) {
                await refreshSquadLobby();
                setSquadProductMessage('');
            } else {
                setSquadProductMessage(e?.message || 'Could not start squad call');
            }
        } finally {
            setSquadMeetBusy(false);
        }
    };

    const handleRemoveSquadMember = async (memberId) => {
        if (!memberId || squadMemberActionBusyId) return;
        setSquadMemberActionBusyId(memberId);
        setSquadProductMessage('');
        try {
            await apiRequest(API.SQUAD.REMOVE_MEMBER, {
                method: 'POST',
                body: JSON.stringify({ memberId }),
            });
            await refreshSquadLobby();
        } catch (e) {
            setSquadProductMessage(e?.message || 'Could not remove member');
        } finally {
            setSquadMemberActionBusyId(null);
        }
    };

    const handleLeaveSquadSelf = async () => {
        if (!myUserId || squadMemberActionBusyId) return;
        setSquadMemberActionBusyId(myUserId);
        setSquadProductMessage('');
        try {
            const isHost = String(squadLobby?.inviterId || '') === String(myUserId);
            if (isHost) {
                await apiRequest(API.SQUAD.TOGGLE_SOLO, { method: 'POST' });
                setMode('solo');
            } else {
                await apiRequest(API.SQUAD.REMOVE_MEMBER, {
                    method: 'POST',
                    body: JSON.stringify({ memberId: myUserId }),
                });
            }
            await refreshSquadLobby();
        } catch (e) {
            setSquadProductMessage(e?.message || 'Could not leave squad');
        } finally {
            setSquadMemberActionBusyId(null);
        }
    };

    const loadQuickInviteFriends = useCallback(async () => {
        if (!squadHomeInviteMeetSlotActive || !myUserId) {
            setQuickInviteFriends([]);
            setQuickInvitePendingIds(new Set());
            return;
        }
        try {
            const [data, pendingData] = await Promise.all([
                apiRequest(API.SQUAD.QUICK_INVITE_SUGGESTIONS),
                apiRequest(API.SQUAD.PENDING_INVITATIONS_LOBBY).catch(() => null),
            ]);
            const memberSet = new Set((squadLobby?.memberIds || []).filter(Boolean));
            setQuickInvitePendingIds(
                new Set(
                    (pendingData?.invitations || [])
                        .map((x) => x?.inviteeId)
                        .filter(Boolean)
                        .map(String),
                ),
            );
            const raw = data.suggestions || data.peers || [];
            const mapped = raw
                .map((s) => {
                    const id = s.userId || s.friendId || s.peerUserId || s.id;
                    if (!id) return null;
                    return {
                        friendId: String(id),
                        photoUrl: s.displayPictureUrl || s.photoUrl || '/assets/avatar1.png',
                        username: s.username || 'Friend',
                    };
                })
                .filter(Boolean)
                .filter((x) => x.friendId !== String(myUserId) && !memberSet.has(x.friendId));
            setQuickInviteFriends(mapped.slice(0, 3));
        } catch {
            setQuickInviteFriends([]);
            setQuickInvitePendingIds(new Set());
        }
    }, [squadHomeInviteMeetSlotActive, myUserId, squadLobby?.memberIds]);

    useEffect(() => {
        if (mode !== 'squad') {
            setQuickInviteFriends([]);
            setQuickInvitePendingIds(new Set());
            return;
        }
        void loadQuickInviteFriends();
    }, [mode, pathname, loadQuickInviteFriends]);

    const handleQuickSquadInvite = async (friendId) => {
        if (!friendId || quickInviteBusyId) return;
        setQuickInviteBusyId(friendId);
        setSquadProductMessage('');
        try {
            await apiRequest(API.SQUAD.INVITE, {
                method: 'POST',
                body: JSON.stringify({ inviteeId: friendId }),
            });
            setQuickInvitePendingIds((prev) => new Set([...prev, String(friendId)]));
            await refreshSquadLobby();
        } catch (e) {
            setSquadProductMessage(e?.message || 'Could not send invite');
        } finally {
            setQuickInviteBusyId(null);
        }
    };

    const handleQuickSquadCancelInvite = async (friendId) => {
        if (!friendId || quickInviteBusyId) return;
        setQuickInviteBusyId(friendId);
        setSquadProductMessage('');
        try {
            await apiRequest(API.SQUAD.CANCEL_INVITATION, {
                method: 'POST',
                body: JSON.stringify({ inviteeId: friendId }),
            });
            setQuickInvitePendingIds((prev) => {
                const next = new Set(prev);
                next.delete(String(friendId));
                return next;
            });
            await refreshSquadLobby();
        } catch (e) {
            setSquadProductMessage(e?.message || 'Could not cancel invite');
        } finally {
            setQuickInviteBusyId(null);
        }
    };

    const getSquadInviteLink = useCallback(async () => {
        const res = await apiRequest(API.SQUAD.INVITE_EXTERNAL, { method: 'POST' });
        const link = String(res?.inviteLink || '').trim();
        if (!link) {
            throw new Error('Could not create squad share link');
        }
        return link;
    }, []);

    const shareSquadInvite = useCallback(
        async (channel = 'generic') => {
            if (squadShareBusy) return;
            setSquadShareBusy(true);
            setSquadProductMessage('');
            try {
                const link = await getSquadInviteLink();
                const shareText = `Join my squad call on HMM: ${link}`;
                if (channel === 'whatsapp') {
                    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank', 'noopener,noreferrer');
                    return;
                }
                if (channel === 'copy') {
                    await navigator.clipboard.writeText(link);
                    return;
                }
                if (navigator.share) {
                    await navigator.share({ text: shareText, url: link });
                    return;
                }
                await navigator.clipboard.writeText(link);
            } catch (e) {
                setSquadProductMessage(e?.message || 'Could not share squad invite link');
            } finally {
                setSquadShareBusy(false);
            }
        },
        [getSquadInviteLink, squadShareBusy]
    );

    return (
        <div className="relative min-h-screen w-full overflow-hidden font-sans text-white flex flex-col font-[family-name:var(--font-otomanopee)]">


            {/* Layer 1: Stars Pattern (Top Half) */}
            <div
                className="absolute top-0 left-0 w-full h-1/2 z-0 opacity-50"
                style={{
                    backgroundImage: "url('/assets/mb.jpg')",
                    backgroundRepeat: 'repeat',
                    backgroundSize: 'auto',
                    backgroundPosition: 'top left',
                }}
            />

            {/* Layer 2: Waves/Gradient Overlay (Bottom Half) */}
            <div
                className="absolute bottom-0 left-0 w-full h-1/2 z-0"
                style={{
                    backgroundImage: "url('/assets/image50.png')",
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: 'cover',
                    backgroundPosition: 'top center',
                }}
            />

            {/* --- Top Header --- */}
            <div className="relative z-10 flex justify-between items-center px-6 pt-12 pb-4">
                {/* Coins Pill */}
                <button
                    onClick={() => setIsSignUpOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/30 bg-white/10 backdrop-blur-sm"
                >
                    <span className="font-bold text-sm tracking-wide">{coins}</span>
                    <span className="text-xl leading-none mb-1">+</span>
                </button>

                {/* Hamburger Menu */}
                <button className="p-2">
                    <IoMenu className="text-3xl" />
                </button>
            </div>

            {/* --- Toggle Squad/Solo (Centered on split line) --- */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex  rounded-full p-1 border border-white">
                <button
                    onClick={() => setMode('solo')}
                    className={`px-8 py-2 rounded-full text-sm font-semibold transition-all ${mode === 'solo'
                        ? 'bg-[#1a003d] text-white shadow-sm border border-white'
                        : 'text-white hover:text-white'
                        }`}
                >
                    Solo
                </button>
                <button
                    onClick={() => setMode('squad')}
                    className={`px-8 py-2 rounded-full text-sm font-semibold transition-all ${mode === 'squad'
                        ? 'bg-[#1a003d] text-white shadow-sm border border-white/10'
                        : 'text-white/60 hover:text-white'
                        }`}
                >
                    Squad
                </button>
            </div>

            {/* --- Content Area --- */}
            <div className="flex-1 flex flex-col relative z-10">

                {mode === 'solo' ? (
                    /* ===== SOLO VIEW ===== */
                    <div className="flex-1 flex flex-col">
                        {/* --- Main Content (Solo) --- */}
                        <div className="flex-1 flex flex-col items-center justify-start text-center px-6 relative pointer-events-none -mt-5">
                            <div className="">
                                <img src="/assets/Logo.svg" alt="" className='w-44 h-44' />
                            </div>
                            <div className='-mt-14 '>

                                <p className="text-lg font-medium leading-none font-[family-name:var(--font-otomanopee)]">
                                    Meet someone here,
                                </p>
                                <p className="text-lg font-medium leading-none font-[family-name:var(--font-otomanopee)]">
                                    Not sure who, but someone
                                </p>

                                <p className="text-white/80 text-sm font-light mt-4">
                                    {activeMeetingCount !== null ? activeMeetingCount.toLocaleString() : '0'} meeting now
                                </p>
                            </div>

                            {/* Free Coins Icon */}
                            <div className="absolute right-4 bottom-26 -translate-y-1/2 flex flex-col items-center pointer-events-auto">
                                <button className="relative">
                                    <img src="/assets/watch add free coins.svg" alt="Free Coins" className="w-12 h-12" />
                                </button>

                            </div>
                        </div>

                        {/* --- Bottom Controls (Solo) --- */}
                        <div className="relative z-10 w-full px-6 pb-24 flex flex-col gap-6">
                            <button
                                onClick={() => setIsSignUpOpen(true)}
                                className="w-full bg-[#150030] border border-white/30 rounded-2xl py-5 flex items-center justify-center gap-3 active:scale-95 transition-transform"
                            >
                                <img src="/assets/video-off.svg" className="w-6 h-6 invert opacity-80" alt="Camera" />
                                <span className="text-lg font-bold tracking-wide">Meet that someone</span>
                            </button>

                            <div className="w-full bg-[#150030]/80 border border-white/10 rounded-2xl flex items-center h-16 relative overflow-hidden">
                                <button
                                    onClick={() => setIsGenderModalOpen(true)}
                                    className="flex-1 h-full flex items-center justify-center gap-2 hover:bg-white/5 transition px-2"
                                >
                                    <span className="text-xl">⚥</span>
                                    <div className="text-left flex flex-col justify-center">
                                        <span className="text-xs font-bold leading-tight">Girls only</span>
                                        <span className="text-[10px] text-white/50 leading-tight">18/20 Remaining</span>
                                    </div>
                                </button>

                                <div className="w-[1px] h-3/4 bg-white/10"></div>

                                <button
                                    onClick={() => setIsLocationModalOpen(true)}
                                    className="flex-1 h-full flex items-center justify-center gap-2 hover:bg-white/5 transition px-2 text-right"
                                >
                                    <div className="text-right flex flex-col justify-center">
                                        <span className="text-xs font-bold leading-tight">Location</span>
                                        <span className="text-[10px] text-white/50 leading-tight">Bhuwaneshwar</span>
                                    </div>
                                    <span className="text-xl">📍</span>
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* ===== SQUAD VIEW — upper: circles + Share (gap-6); bottom strip = same shell as solo "Bottom Controls" (pb-24 gap-6) ===== */
                    <div className="relative mx-auto flex h-full min-h-0 w-full max-w-3xl flex-1 flex-col">
                        {squadProductMessage ? (
                            <div
                                role="alert"
                                className="mx-6 mb-2 mt-2 shrink-0 rounded-2xl border border-red-400/40 bg-red-950/45 px-4 py-3 text-left text-[13px] font-medium text-red-50"
                            >
                                {squadProductMessage}
                            </div>
                        ) : null}
                        <div className="flex min-h-0 w-full flex-1 flex-col gap-4">
                        {/* justify-end: pull (circles+Share) toward Invite; gap-4 = space to Invite row */}
                        <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-end px-6 pb-1">
                        <div className="flex w-full flex-col items-center gap-2">
                        <div className="w-full shrink-0 pt-2 text-center">
                        <div className="mb-3 flex items-center justify-between">
                            <button type="button" onClick={() => setSquadInviteOpen(true)} className="p-2 rounded-full border border-white/30 hover:bg-white/10">
                                <img src="/assets/search-icon.svg" alt="" className="w-6 h-6" />
                            </button>
                            <img src="/assets/Vector.svg" alt="" className="w-6 h-6" />
                        </div>
                        <div className="flex flex-wrap items-center justify-center gap-2 font-sans">
                            <div className="flex flex-col items-center gap-2">
                                <div className="relative w-16 h-16 overflow-visible">
                                    <div className="w-full h-full rounded-full border border-white/30 overflow-hidden bg-white/5 relative">
                                        <Image
                                            src={myProfile?.displayPictureUrl || '/assets/ico.png'}
                                            alt="me"
                                            fill
                                            className="object-cover"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        disabled={squadMemberActionBusyId === myUserId}
                                        onClick={handleLeaveSquadSelf}
                                        className="absolute -top-2 -right-2 z-20 w-5 h-5 rounded-full bg-red-600 border border-white/90 text-white text-[10px] font-bold flex items-center justify-center disabled:opacity-40"
                                        title="Leave squad"
                                    >
                                        x
                                    </button>
                                </div>
                                <span className="text-xs">Me</span>
                            </div>
                            {squadGuestIds.map((guestId, i) => (
                                <div key={`sg-${i}`} className="flex items-center gap-2">
                                    <div className="flex shrink-0 items-center self-center">
                                        <img src="/assets/plus.png" alt="" className="h-4 w-4 opacity-70" />
                                    </div>
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="relative w-16 h-16 overflow-visible">
                                            <div className="w-full h-full rounded-full border border-white/30 flex items-center justify-center overflow-hidden bg-white/5">
                                                {guestId && guestProfiles[guestId]?.displayPictureUrl ? (
                                                    <Image src={guestProfiles[guestId].displayPictureUrl} alt="" fill className="object-cover" />
                                                ) : guestId ? (
                                                    <span className="text-lg text-white/50">…</span>
                                                ) : (
                                                    <span className="text-2xl text-white/50">?</span>
                                                )}
                                            </div>
                                            {guestId ? (
                                                <button
                                                    type="button"
                                                    disabled={squadMemberActionBusyId === guestId}
                                                    onClick={() => handleRemoveSquadMember(guestId)}
                                                    className="absolute -top-2 -right-2 z-20 w-5 h-5 rounded-full bg-red-600 border border-white/90 text-white text-[10px] font-bold flex items-center justify-center disabled:opacity-40"
                                                    title="Remove from squad"
                                                >
                                                    x
                                                </button>
                                            ) : null}
                                        </div>
                                        <span className="text-xs">{guestId ? guestProfiles[guestId]?.username || 'Friend' : 'Who'}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        </div>

                            <div className="inline-flex w-full shrink-0 flex-col items-center">
                            <div className="inline-flex shrink-0 items-center gap-5 rounded-full border border-white/15 bg-[#0A032D]/45 px-6 py-3 font-sans backdrop-blur-sm">
                            <span className="mr-1 text-sm font-medium text-white/80">Share to</span>
                            <button
                                type="button"
                                disabled={squadShareBusy}
                                onClick={() => void shareSquadInvite('generic')}
                                className="rounded-full p-2 text-white transition hover:bg-white/10 disabled:opacity-50"
                            >
                                <IoLogoSnapchat className="text-2xl" />
                            </button>
                            <button
                                type="button"
                                disabled={squadShareBusy}
                                onClick={() => void shareSquadInvite('generic')}
                                className="rounded-full p-2 text-white transition hover:bg-white/10 disabled:opacity-50"
                            >
                                <IoLogoInstagram className="text-2xl" />
                            </button>
                            <button
                                type="button"
                                disabled={squadShareBusy}
                                onClick={() => void shareSquadInvite('whatsapp')}
                                className="rounded-full p-2 text-white transition hover:bg-white/10 disabled:opacity-50"
                            >
                                <IoLogoWhatsapp className="text-2xl" />
                            </button>
                            <button
                                type="button"
                                disabled={squadShareBusy}
                                onClick={() => void shareSquadInvite('copy')}
                                className="rounded-full p-2 text-white transition hover:bg-white/10 disabled:opacity-50"
                            >
                                <IoCopyOutline className="text-2xl" />
                            </button>
                            </div>
                            </div>
                        </div>
                        </div>

                        {/* pb-*: space above tab bar — lower value moves Invite / Meet closer to bottom nav */}
                        {squadHomeInviteMeetSlotActive && (quickInviteFriends.length > 0 || canSquadMeet) ? (
                            <div className="relative z-10 flex w-full shrink-0 flex-col gap-4 px-6 pb-24">
                                {canSquadMeet ? (
                                    <button
                                        type="button"
                                        disabled={squadMeetBusy}
                                        onClick={handleSquadEnterCall}
                                        className="flex w-full items-center justify-center gap-3 rounded-2xl border border-white/30 bg-[#150030] py-5 transition-transform active:scale-95 disabled:opacity-60"
                                    >
                                        <img src="/assets/video-off.svg" className="h-6 w-6 invert opacity-80" alt="Camera" />
                                        <span className="text-lg font-bold tracking-wide">
                                            {squadMeetBusy ? 'Starting...' : 'Meet Someone now'}
                                        </span>
                                    </button>
                                ) : quickInviteFriends.length > 0 ? (
                                    <SquadQuickInviteStrip
                                        friends={quickInviteFriends}
                                        busyId={quickInviteBusyId}
                                        pendingInviteeIds={quickInvitePendingIds}
                                        onInvite={(id) => void handleQuickSquadInvite(id)}
                                        onCancelInvite={(id) => void handleQuickSquadCancelInvite(id)}
                                        onSeeAll={() => setSquadInviteOpen(true)}
                                        className="w-full"
                                    />
                                ) : null}
                            </div>
                        ) : null}
                        </div>
                    </div>
                )}
            </div>

            {/* --- Bottom Navigation Bar --- */}
            <div className="absolute bottom-0 left-0 w-full bg-[#1a003d] border-t border-white/5 px-6 py-4 flex justify-between items-center z-10">
                <button className="flex flex-col items-center gap-1 text-white hover:text-purple-300 transition">
                    <IoHome className="text-2xl" />
                </button>
                <button className="flex flex-col items-center gap-1 text-white/50 hover:text-white transition">
                    <IoTimeOutline className="text-2xl" />
                </button>
                <button
                    onClick={() => window.location.href = '/inbox'}
                    className="flex flex-col items-center gap-1 text-white/50 hover:text-white transition relative"
                >
                    <IoChatbubbleEllipsesOutline className="text-2xl" />
                    {unreadCount > 0 && (
                        <span
                            className="absolute top-0 right-[-2px] w-2.5 h-2.5 bg-[#ACE723] border-2 border-[#1ECB00] rounded-full shadow-[0_0_12px_rgba(172,231,35,0.6)]"
                        />
                    )}
                </button>
                <button className="flex flex-col items-center gap-1 text-white/50 hover:text-white transition">
                    <div className="w-7 h-7 rounded-full border border-white/50 bg-white/10"></div>
                </button>
            </div>


            {/* Modals */}
            <SignUpModal isOpen={isSignUpOpen} onClose={() => setIsSignUpOpen(false)} />
            <GenderModal isOpen={isGenderModalOpen} onClose={() => setIsGenderModalOpen(false)} />
            <LocationModal isOpen={isLocationModalOpen} onClose={() => setIsLocationModalOpen(false)} />
            <SquadInviteFriendsModal
                open={squadInviteOpen}
                onClose={() => setSquadInviteOpen(false)}
                onInviteSent={() => {
                    void refreshSquadLobby();
                    void loadQuickInviteFriends();
                }}
                squadMemberIds={squadLobby?.memberIds || []}
            />
        </div>
    );
}
