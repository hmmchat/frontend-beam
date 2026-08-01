import { API } from '@/lib/api';

export const BAN_SUPPORT_EMAIL = 'mods@antiscroll.in';
export const BANNED_LOGIN_MESSAGE = `You are banned currently. Contact ${BAN_SUPPORT_EMAIL} for support.`;

function clearClientTokens() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userId');
  } catch {
    // ignore
  }
}

/**
 * Immediately clear local session after a ban (or when auth returns ACCOUNT_BANNED).
 */
export async function forceLogoutBanned({
  message = BANNED_LOGIN_MESSAGE,
  redirect = true,
} = {}) {
  if (typeof window === 'undefined') return;

  const refreshToken = localStorage.getItem('refreshToken');
  clearClientTokens();

  if (refreshToken) {
    try {
      await fetch(API.AUTH.LOGOUT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
    } catch {
      // ignore network errors during forced logout
    }
  }

  try {
    sessionStorage.setItem('banLogoutMessage', message);
  } catch {
    // ignore
  }

  window.dispatchEvent(
    new CustomEvent('account-banned', {
      detail: { message, supportEmail: BAN_SUPPORT_EMAIL },
    })
  );

  if (redirect && !window.location.pathname.startsWith('/')) {
    window.location.href = '/';
  } else if (redirect) {
    window.location.href = '/?banned=1';
  }
}

export function readBanLogoutMessage() {
  if (typeof window === 'undefined') return null;
  try {
    const msg = sessionStorage.getItem('banLogoutMessage');
    if (msg) sessionStorage.removeItem('banLogoutMessage');
    return msg;
  } catch {
    return null;
  }
}

export function isAccountBannedError(errorOrBody) {
  if (!errorOrBody) return false;
  if (errorOrBody.code === 'ACCOUNT_BANNED') return true;
  const message = String(errorOrBody.message || errorOrBody.error || '');
  return /you are banned currently|account_banned|account has been banned/i.test(message);
}
