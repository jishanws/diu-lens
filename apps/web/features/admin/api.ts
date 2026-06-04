import { AdminUser, EnrollmentRecord } from '@/features/admin/auth/types';
import { request } from '@/lib/api';

const GENERIC_ADMIN_ERROR = 'Unable to complete the request right now. Please try again.';
const ENROLLMENTS_ENDPOINT = '/admin/enrollments';

export class AdminApiAuthError extends Error {
  constructor(message = 'Your session has expired. Please sign in again.') {
    super(message);
    this.name = 'AdminApiAuthError';
  }
}

type ApiBusinessResponse = {
  success: boolean;
  message: string;
};

export type ProcessEnrollmentResponse = ApiBusinessResponse & {
  processing_passed: boolean;
  processed_images_count: number;
  embeddings_generated_count: number;
};

export type ApproveEnrollmentResponse = ApiBusinessResponse & {
  approved: boolean;
  processing_attempted: boolean;
  processing_passed: boolean;
  processed_images_count: number;
  embeddings_generated_count: number;
  processing_error: string | null;
};

export type RecognitionMatchCandidate = {
  rank: number;
  student_id: string;
  full_name: string | null;
  university_email: string | null;
  phone: string | null;
  best_distance: number;
  top_avg_distance: number;
  support_count: number;
  matched_angles: string[];
  matched_angles_count: number;
  rank_gap_to_next: number | null;
  decision_reasons: string[];
  classification: 'high_confidence' | 'likely_match' | 'possible_match' | 'low_confidence';
  representative_crop_path: string | null;
  representative_source_image_path: string | null;
  is_likely_match: boolean;
};

export type RecognitionMatchResponse = ApiBusinessResponse & {
  match_found: boolean;
  threshold_used: number;
  top_k: number;
  candidate_pool_limit: number;
  query_embedding_dim: number;
  searched_embedding_rows: number;
  candidates: RecognitionMatchCandidate[];
  weak_candidates: RecognitionMatchCandidate[];
};

export type AdminAuditEvent = {
  id: string;
  timestamp: string | null;
  action_type: string;
  affected_record: string | null;
  operator_identity: string;
  operation_result: 'success' | 'failed' | 'review_required' | 'recorded' | string;
  source: 'enrollment' | 'recognition' | 'session' | string;
  request_id: string | null;
  correlation_id: string | null;
  detail: string;
  recognition?: {
    confidence_score: number | null;
    cosine_distance: number | null;
    threshold_used: number | null;
    processing_duration_ms: number | null;
  };
};

export type SystemHealthResponse = {
  current_status: string;
  degraded_components: string[];
  queue_depth: number;
  active_workers: number;
  retry_rate: number;
  failed_task_rate: number;
  avg_processing_duration: number | null;
  avg_recognition_duration: number | null;
  critical_events: string[];
  recent_incidents: Array<{
    id: number;
    status: string;
    created_at: string | null;
    events: string[];
  }>;
};

export type BiometricTaskRecord = {
  id: number;
  celery_task_id: string;
  student_id: string;
  task_type: string;
  status: string;
  retry_count: number;
  started_at: string | null;
  completed_at: string | null;
  failed_at: string | null;
  error_message: string | null;
  worker_hostname: string | null;
  processing_duration_ms: number | null;
  created_at: string | null;
};

type RecognitionMatchOptions = {
  threshold?: number;
  topK?: number;
  candidatePoolLimit?: number;
};

type AdminLoginResponse = ApiBusinessResponse & {
  access_token?: string;
  token_type?: string;
  role?: string;
  admin?: AdminUser;
};

type AdminMeResponse = ApiBusinessResponse & {
  admin?: AdminUser;
};

type JsonPayload = Record<string, unknown> | null;

type RequestOptions = {
  method?: 'GET' | 'POST';
  body?: Record<string, unknown>;
  token?: string;
  treat401AsAuthError?: boolean;
};

function getMessageFromPayload(payload: JsonPayload): string {
  if (!payload) {
    return GENERIC_ADMIN_ERROR;
  }

  const directMessage = payload.message;
  if (typeof directMessage === 'string' && directMessage.trim()) {
    return directMessage;
  }

  const detail = payload.detail;
  if (detail && typeof detail === 'object') {
    const detailMessage = (detail as Record<string, unknown>).message;
    if (typeof detailMessage === 'string' && detailMessage.trim()) {
      return detailMessage;
    }
  }

  return GENERIC_ADMIN_ERROR;
}

function isApiBusinessResponse(value: unknown): value is ApiBusinessResponse {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const data = value as Record<string, unknown>;
  return typeof data.success === 'boolean' && typeof data.message === 'string';
}

function parseRecognitionCandidate(value: unknown): RecognitionMatchCandidate | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const row = value as Record<string, unknown>;
  if (typeof row.student_id !== 'string' || !row.student_id.trim()) {
    return null;
  }

  const matchedAnglesRaw = row.matched_angles;
  const matchedAngles = Array.isArray(matchedAnglesRaw)
    ? matchedAnglesRaw.filter((item): item is string => typeof item === 'string')
    : [];

  return {
    rank: typeof row.rank === 'number' ? row.rank : 0,
    student_id: row.student_id,
    full_name: typeof row.full_name === 'string' ? row.full_name : null,
    university_email: typeof row.university_email === 'string' ? row.university_email : null,
    phone: typeof row.phone === 'string' ? row.phone : null,
    best_distance: typeof row.best_distance === 'number' ? row.best_distance : Number.POSITIVE_INFINITY,
    top_avg_distance:
      typeof row.top_avg_distance === 'number'
        ? row.top_avg_distance
        : Number.POSITIVE_INFINITY,
    support_count: typeof row.support_count === 'number' ? row.support_count : 0,
    matched_angles: matchedAngles,
    matched_angles_count:
      typeof row.matched_angles_count === 'number'
        ? row.matched_angles_count
        : matchedAngles.length,
    rank_gap_to_next:
      typeof row.rank_gap_to_next === 'number' ? row.rank_gap_to_next : null,
    decision_reasons: Array.isArray(row.decision_reasons)
      ? row.decision_reasons.filter((item): item is string => typeof item === 'string')
      : [],
    classification:
      row.classification === 'high_confidence' ||
      row.classification === 'likely_match' ||
      row.classification === 'possible_match' ||
      row.classification === 'low_confidence'
        ? row.classification
        : 'low_confidence',
    representative_crop_path:
      typeof row.representative_crop_path === 'string' ? row.representative_crop_path : null,
    representative_source_image_path:
      typeof row.representative_source_image_path === 'string'
        ? row.representative_source_image_path
        : null,
    is_likely_match: Boolean(row.is_likely_match),
  };
}

function parseRecognitionResponse(payload: JsonPayload): RecognitionMatchResponse {
  if (!payload || typeof payload !== 'object') {
    return {
      success: false,
      message: GENERIC_ADMIN_ERROR,
      match_found: false,
      threshold_used: 0,
      top_k: 0,
      candidate_pool_limit: 0,
      query_embedding_dim: 0,
      searched_embedding_rows: 0,
      candidates: [],
      weak_candidates: [],
    };
  }

  const data = payload as Record<string, unknown>;
  const candidatesRaw = Array.isArray(data.candidates) ? data.candidates : [];
  const weakCandidatesRaw = Array.isArray(data.weak_candidates) ? data.weak_candidates : [];
  const candidates = candidatesRaw
    .map(parseRecognitionCandidate)
    .filter((item): item is RecognitionMatchCandidate => item !== null)
    .sort((a, b) => a.rank - b.rank);
  const weakCandidates = weakCandidatesRaw
    .map(parseRecognitionCandidate)
    .filter((item): item is RecognitionMatchCandidate => item !== null)
    .sort((a, b) => a.rank - b.rank);

  const success = typeof data.success === 'boolean' ? data.success : false;

  return {
    success,
    message: getMessageFromPayload(payload),
    match_found: typeof data.match_found === 'boolean' ? data.match_found : false,
    threshold_used: typeof data.threshold_used === 'number' ? data.threshold_used : 0,
    top_k: typeof data.top_k === 'number' ? data.top_k : 0,
    candidate_pool_limit: typeof data.candidate_pool_limit === 'number' ? data.candidate_pool_limit : 0,
    query_embedding_dim: typeof data.query_embedding_dim === 'number' ? data.query_embedding_dim : 0,
    searched_embedding_rows: typeof data.searched_embedding_rows === 'number' ? data.searched_embedding_rows : 0,
    candidates,
    weak_candidates: weakCandidates,
  };
}

function parseEnrollment(value: unknown): EnrollmentRecord | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const row = value as Record<string, unknown>;
  const studentId = row.student_id;

  if (typeof studentId !== 'string' || !studentId.trim()) {
    return null;
  }

  const statusRaw = row.status;
  const status =
    statusRaw === 'pending' ||
    statusRaw === 'uploaded' ||
    statusRaw === 'validated' ||
    statusRaw === 'failed' ||
    statusRaw === 'processing' ||
    statusRaw === 'approved' ||
    statusRaw === 'rejected' ||
    statusRaw === 'processed' ||
    statusRaw === 'reset'
      ? statusRaw
      : 'pending';

  const validation = row.validation;
  const validationPassed =
    validation && typeof validation === 'object'
      ? (validation as Record<string, unknown>).validation_passed
      : undefined;

  return {
    student_id: studentId,
    full_name: typeof row.full_name === 'string' ? row.full_name : '',
    university_email: typeof row.university_email === 'string' ? row.university_email : '',
    phone: typeof row.phone === 'string' ? row.phone : '',
    status,
    verification_completed: Boolean(row.verification_completed),
    created_at: typeof row.created_at === 'string' ? row.created_at : null,
    updated_at: typeof row.updated_at === 'string' ? row.updated_at : null,
    rejection_reason: typeof row.rejection_reason === 'string' ? row.rejection_reason : null,
    validation_passed:
      typeof validationPassed === 'boolean' ? validationPassed : null,
    total_required_shots:
      typeof row.total_required_shots === 'number' ? row.total_required_shots : null,
    total_accepted_shots:
      typeof row.total_accepted_shots === 'number' ? row.total_accepted_shots : null,
    active_embeddings_count:
      typeof row.active_embeddings_count === 'number' ? row.active_embeddings_count : 0,
    has_active_embeddings:
      typeof row.has_active_embeddings === 'boolean'
        ? row.has_active_embeddings
        : false,
    processing_state:
      row.processing_state === 'processed' ||
      row.processing_state === 'needs_processing' ||
      row.processing_state === 'processing_failed' ||
      row.processing_state === 'not_applicable'
        ? row.processing_state
        : 'not_applicable',
    last_processing_passed:
      typeof row.last_processing_passed === 'boolean'
        ? row.last_processing_passed
        : null,
    last_processing_message:
      typeof row.last_processing_message === 'string'
        ? row.last_processing_message
        : null,
  };
}

async function requestJson(
  path: string,
  {
    method = 'GET',
    body,
    token,
    treat401AsAuthError = true,
  }: RequestOptions = {}
): Promise<{ status: number; payload: JsonPayload }> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (body) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;

  try {
    response = await request(path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store',
    });
  } catch {
    throw new Error('Network error. Please check your connection and try again.');
  }

  let payload: JsonPayload = null;
  try {
    const parsed = (await response.json()) as unknown;
    payload = parsed && typeof parsed === 'object' ? (parsed as JsonPayload) : null;
  } catch {
    payload = null;
  }

  if ((response.status === 401 || response.status === 403) && treat401AsAuthError) {
    throw new AdminApiAuthError(getMessageFromPayload(payload));
  }

  if (response.status >= 500) {
    throw new Error(getMessageFromPayload(payload));
  }

  return { status: response.status, payload };
}

export async function loginAdmin(email: string, password: string): Promise<AdminLoginResponse> {
  const { payload } = await requestJson('/auth/admin/login', {
    method: 'POST',
    body: { email, password },
    treat401AsAuthError: false,
  });

  if (!payload || typeof payload !== 'object') {
    return { success: false, message: GENERIC_ADMIN_ERROR };
  }

  const normalized = payload as AdminLoginResponse;

  if (!isApiBusinessResponse(normalized)) {
    return { success: false, message: GENERIC_ADMIN_ERROR };
  }

  return normalized;
}

export async function fetchCurrentAdmin(token: string): Promise<AdminUser> {
  const { payload } = await requestJson('/auth/admin/me', { token });

  if (!payload || typeof payload !== 'object') {
    throw new Error(GENERIC_ADMIN_ERROR);
  }

  const data = payload as AdminMeResponse;

  if (!data.success) {
    throw new Error(data.message || GENERIC_ADMIN_ERROR);
  }

  if (!data.admin) {
    throw new Error(GENERIC_ADMIN_ERROR);
  }

  return data.admin;
}

export async function fetchEnrollments(token: string): Promise<EnrollmentRecord[]> {
  const { payload } = await requestJson(ENROLLMENTS_ENDPOINT, { token });

  if (!payload || typeof payload !== 'object') {
    throw new Error(GENERIC_ADMIN_ERROR);
  }

  const rows = (payload as Record<string, unknown>).enrollments;
  if (!Array.isArray(rows)) {
    throw new Error('Unable to load enrollments from the backend response.');
  }

  return rows
    .map(parseEnrollment)
    .filter((row): row is EnrollmentRecord => row !== null)
    .sort((a, b) => {
      const left = new Date(b.updated_at || b.created_at || '').getTime();
      const right = new Date(a.updated_at || a.created_at || '').getTime();
      return left - right;
    });
}

export async function approveEnrollment(
  token: string,
  studentId: string
): Promise<ApproveEnrollmentResponse> {
  const { payload } = await requestJson(`/admin/enrollments/${encodeURIComponent(studentId)}/approve`, {
    method: 'POST',
    token,
  });

  if (!payload || typeof payload !== 'object') {
    return {
      success: false,
      approved: false,
      message: GENERIC_ADMIN_ERROR,
      processing_attempted: false,
      processing_passed: false,
      processed_images_count: 0,
      embeddings_generated_count: 0,
      processing_error: null,
    };
  }

  const data = payload as Record<string, unknown>;
  return {
    success: typeof data.success === 'boolean' ? data.success : false,
    approved: typeof data.approved === 'boolean' ? data.approved : false,
    message: getMessageFromPayload(payload),
    processing_attempted: Boolean(data.processing_attempted),
    processing_passed: Boolean(data.processing_passed),
    processed_images_count:
      typeof data.processed_images_count === 'number' ? data.processed_images_count : 0,
    embeddings_generated_count:
      typeof data.embeddings_generated_count === 'number' ? data.embeddings_generated_count : 0,
    processing_error:
      typeof data.processing_error === 'string' ? data.processing_error : null,
  };
}

export async function rejectEnrollment(
  token: string,
  studentId: string,
  reason: string
): Promise<ApiBusinessResponse> {
  const { payload } = await requestJson(`/admin/enrollments/${encodeURIComponent(studentId)}/reject`, {
    method: 'POST',
    token,
    body: { reason },
  });

  if (isApiBusinessResponse(payload)) {
    return payload;
  }

  return { success: false, message: GENERIC_ADMIN_ERROR };
}

export async function resetEnrollment(
  token: string,
  studentId: string
): Promise<ApiBusinessResponse> {
  const { payload } = await requestJson(`/admin/enrollments/${encodeURIComponent(studentId)}/reset`, {
    method: 'POST',
    token,
  });

  if (isApiBusinessResponse(payload)) {
    return payload;
  }

  return { success: false, message: GENERIC_ADMIN_ERROR };
}

export async function processEnrollment(
  token: string,
  studentId: string
): Promise<ProcessEnrollmentResponse> {
  const { payload } = await requestJson(`/admin/enrollments/${encodeURIComponent(studentId)}/process`, {
    method: 'POST',
    token,
  });

  if (!payload || typeof payload !== 'object') {
    return {
      success: false,
      message: GENERIC_ADMIN_ERROR,
      processing_passed: false,
      processed_images_count: 0,
      embeddings_generated_count: 0,
    };
  }

  const data = payload as Record<string, unknown>;
  return {
    success: typeof data.success === 'boolean' ? data.success : false,
    message: getMessageFromPayload(payload),
    processing_passed: Boolean(data.processing_passed),
    processed_images_count:
      typeof data.processed_images_count === 'number' ? data.processed_images_count : 0,
    embeddings_generated_count:
      typeof data.embeddings_generated_count === 'number' ? data.embeddings_generated_count : 0,
  };
}

export async function matchRecognitionProbe(
  token: string,
  imageFile: File,
  options: RecognitionMatchOptions = {}
): Promise<RecognitionMatchResponse> {
  const params = new URLSearchParams();
  if (typeof options.topK === 'number') {
    params.set('top_k', String(options.topK));
  }
  if (typeof options.threshold === 'number') {
    params.set('threshold', String(options.threshold));
  }
  if (typeof options.candidatePoolLimit === 'number') {
    params.set('candidate_pool_limit', String(options.candidatePoolLimit));
  }

  const query = params.toString();
  const path = query ? `/admin/recognition/match?${query}` : '/admin/recognition/match';

  const formData = new FormData();
  formData.append('image', imageFile);

  let response: Response;
  try {
    response = await request(path, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: formData,
      cache: 'no-store',
    });
  } catch {
    throw new Error('Network error. Please check your connection and try again.');
  }

  let payload: JsonPayload = null;
  try {
    const parsed = (await response.json()) as unknown;
    payload = parsed && typeof parsed === 'object' ? (parsed as JsonPayload) : null;
  } catch {
    payload = null;
  }

  if (response.status === 401 || response.status === 403) {
    throw new AdminApiAuthError(getMessageFromPayload(payload));
  }

  if (response.status >= 500) {
    throw new Error(getMessageFromPayload(payload));
  }

  return parseRecognitionResponse(payload);
}

export async function checkApiHealth(): Promise<boolean> {
  try {
    const response = await request('/health', {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    return response.ok;
  } catch (error) {
    console.error('[admin-api] health check failed', error);
    return false;
  }
}

export async function fetchSystemHealth(token: string): Promise<SystemHealthResponse> {
  const { payload } = await requestJson('/admin/system-health', { token });

  if (!payload || typeof payload !== 'object') {
    throw new Error('Unable to load system health.');
  }

  const data = payload as Record<string, unknown>;
  return {
    current_status: typeof data.current_status === 'string' ? data.current_status : 'unknown',
    degraded_components: Array.isArray(data.degraded_components)
      ? data.degraded_components.filter((item): item is string => typeof item === 'string')
      : [],
    queue_depth: typeof data.queue_depth === 'number' ? data.queue_depth : 0,
    active_workers: typeof data.active_workers === 'number' ? data.active_workers : 0,
    retry_rate: typeof data.retry_rate === 'number' ? data.retry_rate : 0,
    failed_task_rate: typeof data.failed_task_rate === 'number' ? data.failed_task_rate : 0,
    avg_processing_duration:
      typeof data.avg_processing_duration === 'number' ? data.avg_processing_duration : null,
    avg_recognition_duration:
      typeof data.avg_recognition_duration === 'number' ? data.avg_recognition_duration : null,
    critical_events: Array.isArray(data.critical_events)
      ? data.critical_events.filter((item): item is string => typeof item === 'string')
      : [],
    recent_incidents: Array.isArray(data.recent_incidents)
      ? data.recent_incidents
          .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
          .map((item) => ({
            id: typeof item.id === 'number' ? item.id : 0,
            status: typeof item.status === 'string' ? item.status : 'unknown',
            created_at: typeof item.created_at === 'string' ? item.created_at : null,
            events: Array.isArray(item.events)
              ? item.events.filter((event): event is string => typeof event === 'string')
              : [],
          }))
      : [],
  };
}

export async function fetchBiometricTasks(
  token: string,
  limit = 20
): Promise<BiometricTaskRecord[]> {
  const { payload } = await requestJson(`/admin/biometric-tasks?limit=${limit}`, { token });

  const tasks = payload && typeof payload === 'object' ? (payload as Record<string, unknown>).tasks : null;
  if (!Array.isArray(tasks)) {
    return [];
  }

  return tasks
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map((item) => ({
      id: typeof item.id === 'number' ? item.id : 0,
      celery_task_id: typeof item.celery_task_id === 'string' ? item.celery_task_id : '',
      student_id: typeof item.student_id === 'string' ? item.student_id : '',
      task_type: typeof item.task_type === 'string' ? item.task_type : '',
      status: typeof item.status === 'string' ? item.status : 'unknown',
      retry_count: typeof item.retry_count === 'number' ? item.retry_count : 0,
      started_at: typeof item.started_at === 'string' ? item.started_at : null,
      completed_at: typeof item.completed_at === 'string' ? item.completed_at : null,
      failed_at: typeof item.failed_at === 'string' ? item.failed_at : null,
      error_message: typeof item.error_message === 'string' ? item.error_message : null,
      worker_hostname: typeof item.worker_hostname === 'string' ? item.worker_hostname : null,
      processing_duration_ms:
        typeof item.processing_duration_ms === 'number' ? item.processing_duration_ms : null,
      created_at: typeof item.created_at === 'string' ? item.created_at : null,
    }));
}

export async function fetchAdminAuditEvents(
  token: string,
  limit = 80
): Promise<AdminAuditEvent[]> {
  const { payload } = await requestJson(`/admin/audit-logs?limit=${limit}`, { token });

  const events = payload && typeof payload === 'object' ? (payload as Record<string, unknown>).events : null;
  if (!Array.isArray(events)) {
    return [];
  }

  return events
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map((item) => {
      const recognition = item.recognition;
      return {
        id: typeof item.id === 'string' ? item.id : crypto.randomUUID(),
        timestamp: typeof item.timestamp === 'string' ? item.timestamp : null,
        action_type: typeof item.action_type === 'string' ? item.action_type : 'event_recorded',
        affected_record: typeof item.affected_record === 'string' ? item.affected_record : null,
        operator_identity:
          typeof item.operator_identity === 'string' ? item.operator_identity : 'Unknown operator',
        operation_result:
          typeof item.operation_result === 'string' ? item.operation_result : 'recorded',
        source: typeof item.source === 'string' ? item.source : 'system',
        request_id: typeof item.request_id === 'string' ? item.request_id : null,
        correlation_id: typeof item.correlation_id === 'string' ? item.correlation_id : null,
        detail: typeof item.detail === 'string' ? item.detail : 'Operational event recorded.',
        recognition:
          recognition && typeof recognition === 'object'
            ? {
                confidence_score:
                  typeof (recognition as Record<string, unknown>).confidence_score === 'number'
                    ? ((recognition as Record<string, unknown>).confidence_score as number)
                    : null,
                cosine_distance:
                  typeof (recognition as Record<string, unknown>).cosine_distance === 'number'
                    ? ((recognition as Record<string, unknown>).cosine_distance as number)
                    : null,
                threshold_used:
                  typeof (recognition as Record<string, unknown>).threshold_used === 'number'
                    ? ((recognition as Record<string, unknown>).threshold_used as number)
                    : null,
                processing_duration_ms:
                  typeof (recognition as Record<string, unknown>).processing_duration_ms === 'number'
                    ? ((recognition as Record<string, unknown>).processing_duration_ms as number)
                    : null,
              }
            : undefined,
      };
    });
}

export type EnrollmentDetailsResponse = {
  student: {
    student_id: string;
    full_name: string;
    phone: string;
    university_email: string;
  };
  enrollment: {
    id: number;
    status: string;
    verification_completed: boolean;
    validation_passed: boolean;
    rejection_reason: string | null;
    created_at: string | null;
  };
  biometric_diagnostics: {
    consistency_score: number;
    angle_coverage: number;
    blur_free_frame_count: number;
    total_frames: number;
    overall_capture_quality: number;
    overall_quality_label: string;
  };
  prioritized_images: Array<{
    id: number;
    angle: string;
    file_path: string;
    blur_score: number | null;
    brightness: number | null;
    detection_confidence: number | null;
    is_best: boolean;
  }>;
  supplementary_images: Array<{
    id: number;
    angle: string;
    file_path: string;
    blur_score: number | null;
    brightness: number | null;
    detection_confidence: number | null;
    is_best: boolean;
  }>;
  duplicate_candidates: Array<{
    student_id: string;
    best_distance: number;
    support_count: number;
  }>;
  timeline: Array<{
    id: number;
    event_type: string;
    message: string;
    created_at: string | null;
  }>;
};

export async function fetchEnrollmentDetails(
  token: string,
  studentId: string
): Promise<EnrollmentDetailsResponse> {
  const response = await request(`/admin/enrollments/${studentId}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });

  if (response.status === 401 || response.status === 403) {
    throw new AdminApiAuthError();
  }

  if (!response.ok) {
    throw new Error('Failed to fetch enrollment details.');
  }

  return response.json() as Promise<EnrollmentDetailsResponse>;
}

export type EnrollmentsMetricsResponse = {
  pending_review: number;
  approved_today: number;
  rejected_today: number;
  avg_recognition_confidence: number;
};

export async function fetchEnrollmentMetrics(
  token: string
): Promise<EnrollmentsMetricsResponse> {
  const response = await request('/admin/enrollments-metrics', {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });

  if (response.status === 401 || response.status === 403) {
    throw new AdminApiAuthError();
  }

  if (!response.ok) {
    throw new Error('Failed to fetch metrics.');
  }

  return response.json() as Promise<EnrollmentsMetricsResponse>;
}
