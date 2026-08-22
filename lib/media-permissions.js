/**
 * One place for camera / mic getUserMedia so pages do not each prompt.
 *
 * Optional preview (home search): ask at most once per session if the browser
 * is still in "prompt". Required call / squad audio still acquire when needed,
 * but never retry after a hard deny.
 */

const ASKED_KEY = 'hmm:mediaAsked';
const DENIED_KEY = 'hmm:mediaDenied';

function readFlags(key) {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return { camera: false, microphone: false };
    const parsed = JSON.parse(raw);
    return {
      camera: Boolean(parsed?.camera),
      microphone: Boolean(parsed?.microphone),
    };
  } catch {
    return { camera: false, microphone: false };
  }
}

function writeFlags(key, next) {
  try {
    sessionStorage.setItem(key, JSON.stringify(next));
  } catch { /* private mode */ }
}

function mergeFlags(key, { camera = false, microphone = false } = {}) {
  const prev = readFlags(key);
  const next = {
    camera: prev.camera || camera,
    microphone: prev.microphone || microphone,
  };
  writeFlags(key, next);
  return next;
}

export function isDeniedMediaError(err) {
  const name = String(err?.name || '');
  return name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError';
}

export function wasMediaAsked(kind) {
  const flags = readFlags(ASKED_KEY);
  return kind === 'microphone' ? flags.microphone : flags.camera;
}

export function isMediaDeniedThisSession(kind) {
  const flags = readFlags(DENIED_KEY);
  return kind === 'microphone' ? flags.microphone : flags.camera;
}

export function markMediaAsked({ camera = false, microphone = false } = {}) {
  return mergeFlags(ASKED_KEY, { camera, microphone });
}

export async function queryMediaPermission(kind) {
  if (typeof navigator === 'undefined' || !navigator.permissions?.query) return 'unknown';
  try {
    const status = await navigator.permissions.query({ name: kind });
    return status?.state || 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * For optional preview only. Returns true when we should wait for a tap
 * instead of auto-calling getUserMedia again.
 */
export async function shouldDeferOptionalCameraPrompt() {
  if (isMediaDeniedThisSession('camera')) return true;
  const state = await queryMediaPermission('camera');
  if (state === 'denied') return true;
  if (state === 'granted') return false;
  return wasMediaAsked('camera');
}

export async function acquireUserMedia(constraints) {
  const wantsVideo = Boolean(constraints?.video);
  const wantsAudio = Boolean(constraints?.audio);
  markMediaAsked({ camera: wantsVideo, microphone: wantsAudio });

  if ((wantsVideo && isMediaDeniedThisSession('camera')) || (wantsAudio && isMediaDeniedThisSession('microphone'))) {
    throw new DOMException('Permission denied', 'NotAllowedError');
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('getUserMedia is not available');
  }

  try {
    return await navigator.mediaDevices.getUserMedia(constraints);
  } catch (err) {
    if (isDeniedMediaError(err)) {
      mergeFlags(DENIED_KEY, { camera: wantsVideo, microphone: wantsAudio });
    }
    throw err;
  }
}
