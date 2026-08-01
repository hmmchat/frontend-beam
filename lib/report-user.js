import { API, apiRequest } from './api.js';

const IN_CALL_REPORT_TYPES = new Set(['host', 'participant_host', 'participant']);

export const REPORT_REASONS = ['basic', 'violence_self_harm', 'child_abuse'];

/** Map streaming/call type to backend reportType. */
export function resolveInCallReportType(role) {
  const normalized = String(role || '').toUpperCase();
  if (normalized === 'HOST') return 'host';
  if (normalized === 'PARTICIPANT_HOST') return 'participant_host';
  return 'participant';
}

export function normalizeReportReason(reason) {
  const normalized = String(reason || 'basic')
    .toLowerCase()
    .trim()
    .replace(/-/g, '_');
  return REPORT_REASONS.includes(normalized) ? normalized : 'basic';
}

/**
 * Report a user. In-call reports (host/participant) try the streaming endpoint first
 * (which tracks consecutive-call scoring). If that fails with a server error (5xx),
 * falls back to the universal user-service report endpoint so the report is never lost.
 */
export async function submitUserReport({
  reportedUserId,
  reportType,
  roomId,
  callSessionId,
  reason,
}) {
  if (!reportedUserId) {
    throw new Error('reportedUserId is required');
  }

  const reportReason = normalizeReportReason(reason);
  const payload = {
    reportedUserId: String(reportedUserId),
    reason: reportReason,
  };
  if (reportType) payload.reportType = reportType;

  const normalizedType = String(reportType || '')
    .toLowerCase()
    .trim()
    .replace(/-/g, '_');
  const isInCallReport = IN_CALL_REPORT_TYPES.has(normalizedType);

  if (isInCallReport) {
    const sessionId = callSessionId?.trim() || undefined;
    const rid = roomId?.trim() || undefined;
    if (sessionId) payload.callSessionId = sessionId;
    if (rid) payload.roomId = rid;

    try {
      return await apiRequest(API.STREAMING.REPORT, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    } catch (err) {
      // If streaming service returns a server error (5xx), fall back to user-service.
      // Client errors (4xx) are real failures — re-throw them.
      const status = err?.status || 0;
      if (status >= 400 && status < 500) throw err;

      // 5xx or network error — strip callSessionId/roomId and hit user-service directly
      const fallbackPayload = {
        reportedUserId: String(reportedUserId),
        reason: reportReason,
      };
      if (reportType) fallbackPayload.reportType = reportType;
      return apiRequest(API.USERS.REPORT, {
        method: 'POST',
        body: JSON.stringify(fallbackPayload),
      });
    }
  }

  return apiRequest(API.USERS.REPORT, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
