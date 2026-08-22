/**
 * Shared capture / encode / MediaStream helpers for video calls (thermal + memory).
 */

export const isMobileRuntime = () => {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(max-width: 767px)').matches ||
    /Android|iPhone|iPad|iPod|Mobile/i.test(window.navigator?.userAgent || '')
  );
};

export const getCameraConstraints = ({ exactFrontCamera = false } = {}) => {
  const facingMode = exactFrontCamera ? { exact: 'user' } : { ideal: 'user' };
  if (!isMobileRuntime()) {
    return {
      width: { ideal: 1280 },
      height: { ideal: 720 },
      frameRate: { ideal: 30, max: 30 },
      facingMode
    };
  }

  return {
    width: { ideal: 640, max: 960 },
    height: { ideal: 480, max: 540 },
    frameRate: { ideal: 20, max: 24 },
    facingMode
  };
};

/** Home / discovery preview (video only, no mic). */
export const getPreviewVideoConstraints = () => {
  if (!isMobileRuntime()) {
    return {
      width: { ideal: 1280 },
      height: { ideal: 720 },
      facingMode: 'user'
    };
  }
  return {
    width: { ideal: 640, max: 960 },
    height: { ideal: 480, max: 540 },
    frameRate: { ideal: 20, max: 24 },
    facingMode: 'user'
  };
};

/** Desktop: simulcast. Mobile: single encoder layer (much lower CPU / heat). */
export const getVideoEncodings = () => {
  if (!isMobileRuntime()) {
    return [
      { rid: 'r0', maxBitrate: 200_000, scaleResolutionDownBy: 4 },
      { rid: 'r1', maxBitrate: 700_000, scaleResolutionDownBy: 2 },
      { rid: 'r2', maxBitrate: 2_500_000, scaleResolutionDownBy: 1 }
    ];
  }
  return [{ maxBitrate: 900_000 }];
};

export const getPreferredConsumerLayers = ({ kind, source, remoteCount = 1 } = {}) => {
  if (kind !== 'video') return undefined;
  // Screen share is a single non-simulcast layer — requesting spatialLayer>0
  // can yield a black consumer on some browsers.
  if (source === 'screen') return undefined;
  if (!isMobileRuntime()) {
    return { spatialLayer: 2, temporalLayer: 2 };
  }
  return remoteCount >= 2
    ? { spatialLayer: 0, temporalLayer: 2 }
    : { spatialLayer: 1, temporalLayer: 2 };
};

export const pickH264VideoCodec = (device) => {
  const codecs = device?.rtpCapabilities?.codecs;
  if (!Array.isArray(codecs)) return undefined;
  const h264 = codecs.find(
    (c) => c.kind === 'video' && String(c.mimeType || '').toLowerCase() === 'video/h264'
  );
  if (!h264) return undefined;
  if (isMobileRuntime()) return h264;
  if (/iPhone|iPad|iPod/i.test(typeof navigator !== 'undefined' ? navigator.userAgent || '' : '')) {
    return h264;
  }
  return undefined;
};

export const buildCameraVideoProduceOptions = (device, track) => {
  const encodings = getVideoEncodings();
  const opts = {
    track,
    encodings,
    codecOptions: { videoGoogleStartBitrate: isMobileRuntime() ? 400 : 600 },
    appData: { source: 'camera' },
    stopTracks: false,
  };
  const codec = pickH264VideoCodec(device);
  if (codec) opts.codec = codec;
  return opts;
};

export const getScreenShareConstraints = () => ({
  // Keep this minimal: Safari / iOS / some Chromium builds reject frameRate
  // objects (and `audio: false`) on getDisplayMedia and abort the picker.
  video: true,
});

/**
 * Screen capture is a desktop (and Safari 17+ iPhone) API.
 * Android Chrome/Firefox often omit getDisplayMedia or expose a stub that
 * always rejects.
 */
export const isScreenShareSupported = () => {
  if (typeof navigator === 'undefined') return false;
  if (typeof navigator.mediaDevices?.getDisplayMedia !== 'function') return false;
  if (/Android/i.test(navigator.userAgent || '')) return false;
  return true;
};

export const getBrowserDisplayName = () => {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
  if (/Edg\//i.test(ua)) return 'Edge';
  if (/OPR\/|Opera/i.test(ua)) return 'Opera';
  if (/SamsungBrowser/i.test(ua)) return 'Samsung Internet';
  if (/Firefox|FxiOS/i.test(ua)) return 'Firefox';
  if (/CriOS|Chrome/i.test(ua)) return 'Chrome';
  if (/Safari/i.test(ua)) return 'Safari';
  return 'This browser';
};

export const getScreenShareEncodings = () => [
  { maxBitrate: isMobileRuntime() ? 1_200_000 : 3_000_000 }
];

export const pruneEndedTracks = (stream) => {
  if (!stream) return stream;
  stream.getTracks().forEach((t) => {
    if (t.readyState === 'ended') stream.removeTrack(t);
  });
  return stream;
};

/** Reuse the same MediaStream; swap track for a given kind (camera/audio). */
export const replaceKindTrackInStream = (stream, track) => {
  const target = stream || new MediaStream();
  target
    .getTracks()
    .filter((t) => t.kind === track.kind && t.id !== track.id)
    .forEach((t) => target.removeTrack(t));
  if (!target.getTracks().some((t) => t.id === track.id)) {
    target.addTrack(track);
  }
  return target;
};

/** Screen tile stream (video only). Never calls stop() on replaced remote tracks. */
export const replaceScreenTrackInStream = (screenStream, track) =>
  replaceKindTrackInStream(screenStream, track);

export const removeTrackFromStream = (stream, track) => {
  if (!stream || !track) return stream;
  if (stream.getTracks().some((t) => t.id === track.id)) {
    stream.removeTrack(track);
  }
  return stream;
};
