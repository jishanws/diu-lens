import { AdminAuditEvent } from '@/features/admin/api';

const STORAGE_KEY = 'diu_lens_admin_session_operational_events';
const EVENT_NAME = 'diu-lens-admin-operational-event';
const MAX_EVENTS = 80;

export type OperationResult = 'success' | 'failed' | 'review_required' | 'recorded';

export type RecordOperationInput = {
  actionType: string;
  affectedRecord?: string | null;
  operatorIdentity: string;
  result: OperationResult;
  detail: string;
  requestId?: string | null;
  correlationId?: string | null;
};

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function readSessionOperationalEvents(): AdminAuditEvent[] {
  if (!canUseStorage()) return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is AdminAuditEvent => {
      return Boolean(
        item &&
          typeof item === 'object' &&
          typeof (item as AdminAuditEvent).id === 'string' &&
          typeof (item as AdminAuditEvent).action_type === 'string'
      );
    });
  } catch {
    return [];
  }
}

export function recordOperationEvent(input: RecordOperationInput) {
  if (!canUseStorage()) return;

  const event: AdminAuditEvent = {
    id: `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    action_type: input.actionType,
    affected_record: input.affectedRecord ?? null,
    operator_identity: input.operatorIdentity,
    operation_result: input.result,
    source: 'session',
    request_id: input.requestId ?? null,
    correlation_id: input.correlationId ?? null,
    detail: input.detail,
  };

  const nextEvents = [event, ...readSessionOperationalEvents()].slice(0, MAX_EVENTS);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextEvents));
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: event }));
}

export function subscribeToOperationEvents(listener: () => void) {
  if (!canUseStorage()) return () => undefined;
  window.addEventListener(EVENT_NAME, listener);
  window.addEventListener('storage', listener);
  return () => {
    window.removeEventListener(EVENT_NAME, listener);
    window.removeEventListener('storage', listener);
  };
}

export function mergeAuditEvents(
  backendEvents: AdminAuditEvent[],
  sessionEvents: AdminAuditEvent[]
): AdminAuditEvent[] {
  const seen = new Set<string>();
  return [...sessionEvents, ...backendEvents]
    .filter((event) => {
      if (seen.has(event.id)) return false;
      seen.add(event.id);
      return true;
    })
    .sort((a, b) => {
      const left = new Date(a.timestamp ?? 0).getTime();
      const right = new Date(b.timestamp ?? 0).getTime();
      return right - left;
    });
}
