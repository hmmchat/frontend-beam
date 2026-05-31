import { API, apiRequest } from './api.js';

const IN_CALL_REPORT_TYPES = new Set(['host', 'participant_host', 'participant']);

/** Map streaming/call role to backend reportType. */
export function resolveInCallReportType(role) {
  const normalized = String(role || '').toUpperCase();
  if (normalized === 'HOST') return 'host';
  if (normalized === 'PARTICIPANT_HOST') return 'participant_host';
  return 'participant';
}

/**
 * Report a user. In-call reports (host/participant) must include roomId and/or callSessionId
 * so consecutive-call scoring and streak reset work on the backend.
 */
export async function submitUserReport({
  reportedUserId,
  reportType,
  roomId,
  callSessionId,
}) {
  if (!reportedUserId) {
    throw new Error('reportedUserId is required');
  }

  const payload = { reportedUserId: String(reportedUserId) };
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
    return apiRequest(API.STREAMING.REPORT, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  return apiRequest(API.USERS.REPORT, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
