'use client';
import { useRef, useEffect, useCallback } from 'react';

export const buildWsUrl = (baseUrl, params = {}) => {
  const [base, query = ''] = String(baseUrl || '').split('?');
  const qs = new URLSearchParams(query);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value) !== '') {
      qs.set(key, String(value));
    }
  });
  const queryString = qs.toString();
  return queryString ? `${base}?${queryString}` : base;
};

export function useSquadAudio({
  mode,
  isInSquadLobby,
  squadLobbyCall,
  squadLobbyMicMuted,
  squadLobbyAudioOff,
  getStreamingWsUrl,
}) {
  const squadLobbyAudioWsRef = useRef(null);
  const squadLobbyAudioDeviceRef = useRef(null);
  const squadLobbyAudioSendTransportRef = useRef(null);
  const squadLobbyAudioRecvTransportRef = useRef(null);
  const squadLobbyAudioLocalStreamRef = useRef(null);
  const squadLobbyAudioConsumersRef = useRef({});
  const squadLobbyAudioConsumerUserRef = useRef({});
  const squadLobbyAudioProducerMetaRef = useRef({});
  const squadLobbyAudioElsRef = useRef({});
  const squadLobbyAudioProduceResolverRef = useRef(null);
  const squadLobbyAudioPendingProducersRef = useRef([]);
  const squadLobbyAudioMyProducerIdsRef = useRef(new Set());
  const squadLobbyAudioBusyRef = useRef(false);
  const squadLobbyCallBootstrapBusyRef = useRef(false);

  // Keep refs for use in effects without re-running them
  const squadLobbyMicMutedRef = useRef(squadLobbyMicMuted);
  squadLobbyMicMutedRef.current = squadLobbyMicMuted;

  const squadLobbyAudioOffRef = useRef(squadLobbyAudioOff);
  squadLobbyAudioOffRef.current = squadLobbyAudioOff;

  const cleanupSquadLobbyBackgroundAudio = useCallback(() => {
    const ws = squadLobbyAudioWsRef.current;
    if (ws) {
      try {
        ws.close();
      } catch {
        // ignore
      }
      squadLobbyAudioWsRef.current = null;
    }
    Object.values(squadLobbyAudioConsumersRef.current || {}).forEach((consumer) => {
      try {
        consumer?.close?.();
      } catch {
        // ignore
      }
    });
    squadLobbyAudioConsumersRef.current = {};
    squadLobbyAudioConsumerUserRef.current = {};
    squadLobbyAudioProducerMetaRef.current = {};
    squadLobbyAudioProduceResolverRef.current = null;
    squadLobbyAudioPendingProducersRef.current = [];
    squadLobbyAudioMyProducerIdsRef.current = new Set();
    Object.values(squadLobbyAudioElsRef.current || {}).forEach((el) => {
      try {
        el.srcObject = null;
        el.remove();
      } catch {
        // ignore
      }
    });
    squadLobbyAudioElsRef.current = {};
    const local = squadLobbyAudioLocalStreamRef.current;
    if (local) {
      local.getTracks().forEach((track) => track.stop());
      squadLobbyAudioLocalStreamRef.current = null;
    }
    try {
      squadLobbyAudioSendTransportRef.current?.close?.();
    } catch {
      // ignore
    }
    try {
      squadLobbyAudioRecvTransportRef.current?.close?.();
    } catch {
      // ignore
    }
    squadLobbyAudioSendTransportRef.current = null;
    squadLobbyAudioRecvTransportRef.current = null;
    squadLobbyAudioDeviceRef.current = null;
    squadLobbyAudioBusyRef.current = false;
  }, []);

  // Track mic muted state
  useEffect(() => {
    const track = squadLobbyAudioLocalStreamRef.current?.getAudioTracks?.()[0];
    if (track) {
      track.enabled = !squadLobbyMicMuted;
    }
  }, [squadLobbyMicMuted]);

  // Track audio off state
  useEffect(() => {
    Object.values(squadLobbyAudioElsRef.current || {}).forEach((el) => {
      el.muted = squadLobbyAudioOff;
      if (!squadLobbyAudioOff) {
        el.play?.().catch(() => {});
      }
    });
  }, [squadLobbyAudioOff]);

  // Big background audio effect
  useEffect(() => {
    const roomId = squadLobbyCall?.roomId;
    const shouldRun =
      mode === 'squad' &&
      Boolean(roomId) &&
      isInSquadLobby &&
      !(typeof window !== 'undefined' && window.location.pathname.startsWith('/video-chat'));

    if (!shouldRun) {
      cleanupSquadLobbyBackgroundAudio();
      return;
    }
    if (squadLobbyAudioWsRef.current || squadLobbyAudioBusyRef.current) return;

    let cancelled = false;
    const send = (msg) => {
      const ws = squadLobbyAudioWsRef.current;
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(msg));
      }
    };

    const consume = (producerId) => {
      const recvTransport = squadLobbyAudioRecvTransportRef.current;
      const device = squadLobbyAudioDeviceRef.current;
      if (!recvTransport || !device || !roomId) {
        squadLobbyAudioPendingProducersRef.current.push(producerId);
        return;
      }
      send({
        type: 'consume',
        data: {
          roomId,
          transportId: recvTransport.id,
          producerId,
          rtpCapabilities: device.rtpCapabilities,
        },
      });
    };

    const drainPendingLobbyProducers = () => {
      const queued = squadLobbyAudioPendingProducersRef.current.splice(0);
      queued.forEach((pid) => consume(pid));
    };

    const start = async () => {
      squadLobbyAudioBusyRef.current = true;
      try {
        const token = localStorage.getItem('accessToken') || '';
        if (!token) return;
        let userId = '';
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          userId = payload.sub || payload.uid || payload.id || '';
        } catch {
          userId = '';
        }
        if (!userId || !roomId) return;

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 },
          video: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const micTrack = stream.getAudioTracks()[0];
        if (micTrack) micTrack.enabled = !squadLobbyMicMutedRef.current;
        squadLobbyAudioLocalStreamRef.current = stream;

        const ws = new WebSocket(buildWsUrl(getStreamingWsUrl(), {
          userId,
          roomId,
          token,
        }));
        squadLobbyAudioWsRef.current = ws;
        ws.onopen = () => {
          send({
            type: 'join-room',
            data: {
              roomId,
              preserveParticipantOnClose: true,
            },
          });
        };
        ws.onmessage = async (evt) => {
          if (cancelled) return;
          const msg = JSON.parse(evt.data || '{}');
          const { type, data } = msg || {};
          if (type === 'room-joined') {
            const { Device } = await import('mediasoup-client');
            const device = new Device();
            await device.load({ routerRtpCapabilities: data.rtpCapabilities });
            squadLobbyAudioDeviceRef.current = device;
            send({ type: 'create-transport', data: { roomId, producing: true, consuming: false } });
            return;
          }
          if (type === 'transport-created') {
            const { id, iceParameters, iceCandidates, dtlsParameters, producing } = data || {};
            const device = squadLobbyAudioDeviceRef.current;
            if (!device) return;
            if (producing) {
              const transport = device.createSendTransport({ id, iceParameters, iceCandidates, dtlsParameters });
              squadLobbyAudioSendTransportRef.current = transport;
              transport.on('connect', ({ dtlsParameters: dp }, cb) => {
                send({ type: 'connect-transport', data: { roomId, transportId: id, dtlsParameters: dp } });
                cb();
              });
              transport.on('produce', ({ kind, rtpParameters }, cb, errback) => {
                if (kind !== 'audio') {
                  errback?.(new Error('Lobby background only publishes audio'));
                  return;
                }
                squadLobbyAudioProduceResolverRef.current = cb;
                send({ type: 'produce', data: { roomId, transportId: id, kind, rtpParameters } });
              });
              const aTrack = squadLobbyAudioLocalStreamRef.current?.getAudioTracks?.()[0];
              if (aTrack) {
                try {
                  await transport.produce({ track: aTrack });
                } catch {
                  // ignore audio produce errors in lobby mode
                }
              }
              send({ type: 'create-transport', data: { roomId, producing: false, consuming: true } });
              return;
            }
            const transport = device.createRecvTransport({ id, iceParameters, iceCandidates, dtlsParameters });
            squadLobbyAudioRecvTransportRef.current = transport;
            transport.on('connect', ({ dtlsParameters: dp }, cb) => {
              send({ type: 'connect-transport', data: { roomId, transportId: id, dtlsParameters: dp } });
              cb();
            });
            drainPendingLobbyProducers();
            send({ type: 'get-producers', data: { roomId } });
            return;
          }
          if (type === 'producers-list' && Array.isArray(data)) {
            data.forEach((p) => {
              if (!p?.producerId) return;
              if (p.kind && p.kind !== 'audio') return;
              const isSameUser = String(p?.userId || '') === String(userId);
              const isMyProducer = squadLobbyAudioMyProducerIdsRef.current.has(String(p.producerId));
              if (isSameUser && isMyProducer) return;
              if (String(p?.userId || '')) {
                squadLobbyAudioProducerMetaRef.current[String(p.producerId)] = String(p.userId || '');
              }
              consume(p.producerId);
            });
            return;
          }
          if (type === 'new-producer') {
            if (!data?.producerId) return;
            if (data.kind && data.kind !== 'audio') return;
            const isSameUser = String(data?.userId || '') === String(userId);
            const isMyProducer = squadLobbyAudioMyProducerIdsRef.current.has(String(data.producerId));
            if (isSameUser && isMyProducer) return;
            if (String(data?.userId || '')) {
              squadLobbyAudioProducerMetaRef.current[String(data.producerId)] = String(data.userId || '');
            }
            consume(data.producerId);
            return;
          }
          if (type === 'produced') {
            if (data?.id != null) squadLobbyAudioMyProducerIdsRef.current.add(String(data.id));
            if (data?.kind === 'audio') {
              squadLobbyAudioProduceResolverRef.current?.({ id: data.id });
              squadLobbyAudioProduceResolverRef.current = null;
            }
            return;
          }
          if (type === 'consumed') {
            const { id, producerId, kind } = data || {};
            if (!id || !producerId || !kind || kind !== 'audio') return;
            const recvTransport = squadLobbyAudioRecvTransportRef.current;
            if (!recvTransport) return;
            const consumer = await recvTransport.consume({
              id,
              producerId,
              kind,
              rtpParameters: data.rtpParameters,
            });
            squadLobbyAudioConsumersRef.current[id] = consumer;
            const remoteUserId = squadLobbyAudioProducerMetaRef.current[String(producerId)] || String(producerId);
            squadLobbyAudioConsumerUserRef.current[id] = remoteUserId;
            const streamOut = new MediaStream([consumer.track]);
            const audioEl = document.createElement('audio');
            audioEl.autoplay = true;
            audioEl.playsInline = true;
            audioEl.setAttribute('playsinline', 'true');
            audioEl.volume = 1;
            audioEl.style.position = 'fixed';
            audioEl.style.left = '-9999px';
            audioEl.style.top = '0';
            audioEl.style.width = '1px';
            audioEl.style.height = '1px';
            audioEl.style.opacity = '0';
            audioEl.style.pointerEvents = 'none';
            audioEl.srcObject = streamOut;
            audioEl.muted = squadLobbyAudioOffRef.current;
            squadLobbyAudioElsRef.current[id] = audioEl;
            try {
              document.body.appendChild(audioEl);
            } catch {
              // ignore
            }
            try {
              await audioEl.play();
            } catch {
              // autoplay might require user gesture
            }
            return;
          }
          if (type === 'participant-left') {
            const leftUserId = String(data?.userId || '');
            Object.entries(squadLobbyAudioConsumerUserRef.current).forEach(([consumerId, ownerId]) => {
              if (String(ownerId) !== leftUserId) return;
              try {
                squadLobbyAudioConsumersRef.current[consumerId]?.close?.();
              } catch {
                // ignore
              }
              delete squadLobbyAudioConsumersRef.current[consumerId];
              delete squadLobbyAudioConsumerUserRef.current[consumerId];
              const el = squadLobbyAudioElsRef.current[consumerId];
              if (el) {
                try {
                  el.srcObject = null;
                  el.remove();
                } catch {
                  // ignore
                }
                delete squadLobbyAudioElsRef.current[consumerId];
              }
            });
          }
        };
      } catch {
        // silent fail: lobby still works even if background audio fails
      } finally {
        squadLobbyAudioBusyRef.current = false;
      }
    };

    void start();
    return () => {
      cancelled = true;
      cleanupSquadLobbyBackgroundAudio();
    };
  }, [
    cleanupSquadLobbyBackgroundAudio,
    getStreamingWsUrl,
    isInSquadLobby,
    mode,
    squadLobbyCall?.roomId,
  ]);

  return {
    cleanupSquadLobbyBackgroundAudio,
    squadLobbyCallBootstrapBusyRef,
  };
}
