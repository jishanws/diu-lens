import type {
  EnrollmentSubmitDiagnostics,
  VerificationAngle,
  VerificationCapturesByAngle,
  VerificationFrameMetadataByAngle,
} from '@/features/registration/verification/types';
import {
  guidedAngles,
  getRequiredFramesForAngle,
} from '@/features/registration/capture/constants';
import { request, ApiConfigError, buildApiUrl } from '@/lib/api';

// ─── Student ID Validation ─────────────────────────────────────────────────

export type StudentIdValidationResult =
  | { valid: true }
  | {
      valid: false;
      reason: 'already_registered' | 'invalid_format' | 'service_unavailable' | 'network_error' | 'unknown';
      message: string;
      studentName?: string;
    };

const REASON_MESSAGES: Record<string, string> = {
  already_registered: 'This student ID is already enrolled.',
  invalid_format: 'Invalid student ID format. Please use your numeric university ID (e.g. 222-15-6001).',
};

/**
 * Student ID format: digits and hyphens only (e.g., "222-15-6001").
 * Matches the backend pattern `^[\d-]+$` with a minimum length of 3.
 */
const STUDENT_ID_FORMAT = /^[\d-]+$/;
const STUDENT_ID_MIN_LENGTH = 3;

/**
 * Normalize a student ID by trimming whitespace.
 * Hyphens are preserved — the backend pattern allows `[\d-]+`.
 */
export function normalizeStudentId(raw: string): string {
  return raw.trim();
}

/**
 * Quick client-side format check that mirrors the backend regex.
 * Returns a user-friendly message on failure, or `null` when valid.
 */
export function checkStudentIdFormat(id: string): string | null {
  if (id.length < STUDENT_ID_MIN_LENGTH) {
    return 'Student ID is too short.';
  }
  if (!STUDENT_ID_FORMAT.test(id)) {
    return 'Invalid student ID format. Only numbers and hyphens are allowed.';
  }
  return null;
}

/**
 * Validates a student ID against the backend before the user advances to
 * Basic Info. Read-only probe — no data is written to the DB.
 *
 * The function performs a local format check first to avoid unnecessary
 * network round-trips, then confirms against the backend.
 */
export async function validateStudentId(
  studentId: string
): Promise<StudentIdValidationResult> {
  const normalized = normalizeStudentId(studentId);

  // ── Client-side pre-validation ────────────────────────────────────────
  const formatError = checkStudentIdFormat(normalized);
  if (formatError) {
    return { valid: false, reason: 'invalid_format', message: formatError };
  }

  // ── Backend validation ────────────────────────────────────────────────
  try {
    const response = await request('/enroll/validate-id', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ student_id: normalized }),
    });

    const rawText = await response.text();

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      parsed = null;
    }

    // ── 404: endpoint unreachable (route mismatch or deployment issue) ──
    if (response.status === 404) {
      return {
        valid: false,
        reason: 'service_unavailable',
        message: 'Verification service is temporarily unavailable. Please try again later.',
      };
    }

    // ── 5xx: server error ──────────────────────────────────────────────
    if (response.status >= 500) {
      console.error('[validate-id] server error', response.status);
      return {
        valid: false,
        reason: 'service_unavailable',
        message: 'Something went wrong on our end. Please try again in a moment.',
      };
    }

    // ── 429: rate limited ──────────────────────────────────────────────
    if (response.status === 429) {
      return {
        valid: false,
        reason: 'service_unavailable',
        message: 'Too many attempts. Please wait a moment and try again.',
      };
    }

    // ── Structured JSON response ───────────────────────────────────────
    if (parsed && typeof parsed === 'object') {
      const data = parsed as Record<string, unknown>;
      if (data.valid === true) {
        return { valid: true };
      }
      if (data.valid === false) {
        const reason = (data.reason as string) || 'unknown';
        const knownReason = reason as 'already_registered' | 'invalid_format' | 'unknown';
        const message =
          REASON_MESSAGES[reason] ?? 'This student ID cannot be used for enrollment.';
        
        let studentName: string | undefined;
        if (knownReason === 'already_registered' && data.student && typeof data.student === 'object') {
          studentName = (data.student as Record<string, string>).name;
        }

        return { valid: false, reason: knownReason, message, studentName };
      }
    }

    // ── Unparseable or unexpected response shape ───────────────────────
    return {
      valid: false,
      reason: 'service_unavailable',
      message: 'Verification service returned an unexpected response. Please try again.',
    };
  } catch (error) {
    // ── API config error (env var missing) ─────────────────────────────
    if (error instanceof ApiConfigError) {
      console.error('[validate-id] API configuration error:', error.message);
      return {
        valid: false,
        reason: 'service_unavailable',
        message: error.message,
      };
    }

    // ── Network / fetch failure ────────────────────────────────────────
    console.error('[validate-id] network error', error);
    return {
      valid: false,
      reason: 'network_error',
      message: 'Unable to connect. Please check your internet connection and try again.',
    };
  }
}

// ─── Enrollment ────────────────────────────────────────────────────────────

const GENERIC_ENROLLMENT_ERROR =
  'Unable to continue right now. Please try again.';
const GENERIC_REGISTRATION_COMPLETION_ERROR =
  'Unable to complete registration right now. Please try again.';
const MIN_CAPTURE_FILE_SIZE_BYTES = 10 * 1024;
const ALLOWED_CAPTURE_CONTENT_TYPES = new Set(['image/jpeg', 'image/png']);
const REQUIRED_VERIFICATION_ANGLES: VerificationAngle[] = [...guidedAngles];

export type EnrollmentPayload = {
  student_id: string;
  full_name: string;
  phone: string;
  university_email: string;
};

export type AngleCaptureSummaryPayload = {
  angle: string;
  accepted_shots: number;
  required_shots: number;
};

export type EnrollmentCompletionPayload = EnrollmentPayload & {
  liveness_passed?: boolean;
  verification_completed: boolean;
  total_required_shots: number;
  total_accepted_shots: number;
  angles: AngleCaptureSummaryPayload[];
  frame_metadata_by_angle?: {
    angle: string;
    frames: { captured_at: number; capture_latency_ms?: number }[];
  }[];
};

type EnrollmentResponse = {
  success: boolean;
  message: string;
};

export type EnrollmentSubmissionResult = EnrollmentResponse & {
  diagnostics?: EnrollmentSubmitDiagnostics;
};

function isEnrollmentResponse(value: unknown): value is EnrollmentResponse {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const result = value as Partial<EnrollmentResponse>;

  return (
    typeof result.success === 'boolean' && typeof result.message === 'string'
  );
}

function toMessageFromUnknown(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }

  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;

  if (typeof record.message === 'string' && record.message.trim()) {
    return record.message.trim();
  }

  if (typeof record.detail === 'string' && record.detail.trim()) {
    return record.detail.trim();
  }

  if (record.detail && typeof record.detail === 'object') {
    const detail = record.detail as Record<string, unknown>;
    if (typeof detail.message === 'string' && detail.message.trim()) {
      return detail.message.trim();
    }
  }

  return null;
}

function dataUrlToBlob(dataUrl: string): Blob | null {
  const commaIndex = dataUrl.indexOf(',');
  if (commaIndex < 0) return null;

  const header = dataUrl.slice(0, commaIndex);
  const content = dataUrl.slice(commaIndex + 1);
  const mimeMatch = header.match(/^data:(.*?);base64$/);
  if (!mimeMatch) return null;

  try {
    const bytes = atob(content);
    const array = new Uint8Array(bytes.length);
    for (let index = 0; index < bytes.length; index += 1) {
      array[index] = bytes.charCodeAt(index);
    }
    return new Blob([array], { type: mimeMatch[1] || 'image/jpeg' });
  } catch {
    return null;
  }
}

function toValidationReasonMessage(value: unknown): string | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;
  const detail = record.detail;
  if (!detail || typeof detail !== 'object') {
    return null;
  }

  const detailRecord = detail as Record<string, unknown>;
  if (
    detailRecord.error === 'sanity_failed' &&
    Array.isArray(detailRecord.details)
  ) {
    const failedReasons = detailRecord.details
      .map((entry) => {
        if (!entry || typeof entry !== 'object') {
          return null;
        }
        const failed = entry as Record<string, unknown>;
        const angle =
          typeof failed.angle === 'string' && failed.angle.trim()
            ? failed.angle.trim()
            : 'unknown';
        const reason =
          typeof failed.reason === 'string' && failed.reason.trim()
            ? failed.reason.trim()
            : 'unknown';
        return `${angle}: ${reason}`;
      })
      .filter((entry): entry is string => Boolean(entry));

    if (failedReasons.length > 0) {
      return `Image sanity checks failed (${failedReasons.join('; ')})`;
    }
  }

  const validation = detailRecord.validation;
  if (!validation || typeof validation !== 'object') {
    return null;
  }

  const validationRecord = validation as Record<string, unknown>;
  const reports = validationRecord.image_reports;
  if (!Array.isArray(reports)) {
    return null;
  }

  const reasons = new Set<string>();

  for (const report of reports) {
    if (!report || typeof report !== 'object') {
      continue;
    }

    const reportRecord = report as Record<string, unknown>;
    const angle =
      typeof reportRecord.angle === 'string' ? reportRecord.angle : 'unknown';
    const failureReasons = reportRecord.failure_reasons;

    if (!Array.isArray(failureReasons)) {
      continue;
    }

    for (const reason of failureReasons) {
      if (typeof reason === 'string' && reason.trim()) {
        reasons.add(`${angle}: ${reason.trim()}`);
      }
    }
  }

  if (reasons.size === 0) {
    return null;
  }

  return `Image sanity checks failed (${Array.from(reasons).join('; ')})`;
}

function toFastApiValidationMessage(value: unknown): string | null {
  let source: unknown = value;
  if (!Array.isArray(source) && source && typeof source === 'object') {
    const record = source as Record<string, unknown>;
    source = record.detail;
  }
  if (!Array.isArray(source)) {
    return null;
  }

  const messages = source
    .map((entry) => {
      if (!entry || typeof entry !== 'object') {
        return null;
      }
      const record = entry as Record<string, unknown>;
      if (typeof record.msg === 'string' && record.msg.trim()) {
        return record.msg.trim();
      }
      return null;
    })
    .filter((message): message is string => Boolean(message));

  if (messages.length === 0) {
    return null;
  }

  return messages.join('; ');
}

export async function submitEnrollment(payload: EnrollmentPayload) {
  return submitEnrollmentRequest(payload, GENERIC_ENROLLMENT_ERROR);
}

export async function submitEnrollmentCompletion(
  payload: EnrollmentCompletionPayload,
  capturesByAngle: VerificationCapturesByAngle,
  frameMetadataByAngle: VerificationFrameMetadataByAngle
) {
  return submitEnrollmentCompletionRequest(
    payload,
    capturesByAngle,
    frameMetadataByAngle,
    GENERIC_REGISTRATION_COMPLETION_ERROR
  );
}

async function submitEnrollmentRequest(
  payload: EnrollmentPayload,
  errorMessage: string
) {
  try {
    const normalizedPayload: EnrollmentPayload = {
      student_id: payload.student_id.trim(),
      full_name: payload.full_name.trim(),
      phone: payload.phone.trim(),
      university_email: payload.university_email.trim(),
    };

    if (
      !normalizedPayload.student_id ||
      !normalizedPayload.full_name ||
      !normalizedPayload.phone ||
      !normalizedPayload.university_email
    ) {
      return {
        success: false,
        message: 'Missing required fields for enrollment submission.',
      };
    }

    const response = await request('/enroll', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(normalizedPayload),
    });
    return await parseEnrollmentResponse(response, errorMessage);
  } catch (error) {
    throw error;
  }
}

async function submitEnrollmentCompletionRequest(
  payload: EnrollmentCompletionPayload,
  capturesByAngle: VerificationCapturesByAngle,
  frameMetadataByAngle: VerificationFrameMetadataByAngle,
  errorMessage: string
) {
  let requestUrl = '';
  try {
    const anglesSummary = REQUIRED_VERIFICATION_ANGLES.map((angle) => ({
      angle,
      accepted_shots: capturesByAngle[angle]?.length ?? 0,
      required_shots: getRequiredFramesForAngle(angle),
    }));
    const totalRequiredShots = anglesSummary.reduce(
      (total, entry) => total + entry.required_shots,
      0
    );
    const totalAcceptedShots = anglesSummary.reduce(
      (total, entry) => total + entry.accepted_shots,
      0
    );
    const metadataWithFrames: EnrollmentCompletionPayload = {
      ...payload,
      total_required_shots: totalRequiredShots,
      total_accepted_shots: totalAcceptedShots,
      angles: anglesSummary,
      frame_metadata_by_angle: REQUIRED_VERIFICATION_ANGLES.map((angle) => ({
        angle,
        frames: (frameMetadataByAngle[angle] ?? []).map((frame) => ({
          captured_at: frame.capturedAt,
          capture_latency_ms: frame.captureLatencyMs,
        })),
      })),
    };

    requestUrl = buildApiUrl('/enroll/verification');

    const formData = new FormData();
    formData.append('metadata', JSON.stringify(metadataWithFrames));
    formData.append('student_id', payload.student_id);

    let appendedFiles = 0;

    for (const angle of REQUIRED_VERIFICATION_ANGLES) {
      const captures = capturesByAngle[angle];
      const requiredFramesForAngle = getRequiredFramesForAngle(angle);
      if (!Array.isArray(captures)) {
        return {
          success: false,
          message: `Missing captured verification files for angle: ${angle}. Please retake this shot.`,
        };
      }

      if (captures.length !== requiredFramesForAngle) {
        return {
          success: false,
          message: `Expected exactly ${requiredFramesForAngle} captured files for angle: ${angle}. Please retake this angle.`,
        };
      }

      for (const [index, captureInput] of captures.entries()) {
        let capture = captureInput;
        if (typeof capture === 'string') {
          const converted = dataUrlToBlob(capture);
          if (!converted) {
            return {
              success: false,
              message: `Captured image data is invalid for angle: ${angle}. Please retake this shot.`,
            };
          }
          capture = converted;
        }

        if (!(capture instanceof Blob)) {
          return {
            success: false,
            message: `Captured file is invalid for angle: ${angle}. Please retake this shot.`,
          };
        }

        if (capture.size <= 0) {
          return {
            success: false,
            message: `Captured file is empty for angle: ${angle}. Please retake this shot.`,
          };
        }

        if (capture.size < MIN_CAPTURE_FILE_SIZE_BYTES) {
          return {
            success: false,
            message: `Captured file is too small for angle: ${angle}. Please retake this shot.`,
          };
        }

        const normalizedType = (capture.type || 'image/jpeg').toLowerCase();
        if (!ALLOWED_CAPTURE_CONTENT_TYPES.has(normalizedType)) {
          return {
            success: false,
            message: `Captured file type is invalid for angle: ${angle}. Please retake this shot.`,
          };
        }

        const extension = normalizedType === 'image/png' ? 'png' : 'jpg';
        const fileName = `${angle}_${index + 1}.${extension}`;
        const fileToAppend =
          capture instanceof File
            ? capture
            : new File([capture], fileName, { type: normalizedType });
        if (fileToAppend.size <= 0) {
          return {
            success: false,
            message: `Captured file is empty for angle: ${angle}. Please retake this shot.`,
          };
        }
        formData.append(angle, fileToAppend, fileName);
        appendedFiles += 1;
      }
    }

    if (appendedFiles === 0) {
      return {
        success: false,
        message:
          'No captured verification images found. Please retake the guided shots.',
      };
    }
    const requestOptions: RequestInit = {
      method: 'POST',
      body: formData,
      headers: {
        Accept: 'application/json',
      },
    };

    const debugEnabled =
      process.env.NODE_ENV !== 'production' ||
      (typeof window !== 'undefined' &&
        new URLSearchParams(window.location.search).get('debug') === '1');
    if (debugEnabled) {
      console.info('[verification-submit] request', {
        submitting: true,
        requestUrl,
        studentId: payload.student_id,
        currentRoute:
          typeof window === 'undefined' ? null : window.location.pathname,
        navigationTriggered: false,
        imageCount: appendedFiles,
        countByAngle: Object.fromEntries(
          REQUIRED_VERIFICATION_ANGLES.map((angle) => [
            angle,
            capturesByAngle[angle]?.length ?? 0,
          ])
        ),
        imageBlobSizes: Object.fromEntries(
          REQUIRED_VERIFICATION_ANGLES.map((angle) => [
            angle,
            (capturesByAngle[angle] ?? []).map((capture) => capture.size),
          ])
        ),
      });
    }

    const response = await request('/enroll/verification', requestOptions);

    const parsed = await parseEnrollmentResponse(
      response,
      errorMessage,
      'verification',
      requestUrl
    );
    return parsed;
  } catch (error) {
    console.error('[verification] request failed', error);
    const message =
      error instanceof ApiConfigError
        ? error.message
        : 'Unable to reach the enrollment service. Your captures are preserved; retry submission.';
    return {
      success: false,
      message,
      diagnostics: {
        requestUrl,
        httpStatus: null,
        responseBody: null,
        error: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

async function parseEnrollmentResponse(
  response: Response,
  errorMessage: string,
  logPrefix = 'enroll',
  requestUrl = response.url
): Promise<EnrollmentSubmissionResult> {
  const rawText = await response.text();

  const statusLabel = response.status
    ? `${response.status}${response.statusText ? ` ${response.statusText}` : ''}`
    : 'unknown';
  const logResponseIssue = (body: unknown) => {
    const logPayload = {
      status: response.status,
      statusText: response.statusText,
      body,
    };

    if (response.status >= 500) {
      console.error(`[${logPrefix}] non-OK response`, logPayload);
      return;
    }

    console.warn(`[${logPrefix}] non-OK response`, logPayload);
  };

  let parsedData: unknown = null;
  if (rawText.trim()) {
    try {
      parsedData = JSON.parse(rawText);
    } catch {
      parsedData = rawText;
    }
  }

  if (isEnrollmentResponse(parsedData)) {
    if (!response.ok) {
      logResponseIssue(parsedData);
    }
    return {
      ...parsedData,
      diagnostics: {
        requestUrl,
        httpStatus: response.status,
        responseBody: rawText || null,
        error: response.ok ? null : parsedData.message,
      },
    };
  }

  const derivedMessage =
    toValidationReasonMessage(parsedData) ||
    toFastApiValidationMessage(parsedData) ||
    toMessageFromUnknown(parsedData) ||
    (response.ok ? 'Request completed.' : `Request failed (${statusLabel}).`);

  if (!response.ok) {
    logResponseIssue(parsedData);
    return {
      success: false,
      message: derivedMessage,
      diagnostics: {
        requestUrl,
        httpStatus: response.status,
        responseBody: rawText || null,
        error: derivedMessage,
      },
    };
  }

  return {
    success: true,
    message: derivedMessage,
    diagnostics: {
      requestUrl,
      httpStatus: response.status,
      responseBody: rawText || null,
      error: null,
    },
  };
}

export { GENERIC_ENROLLMENT_ERROR, GENERIC_REGISTRATION_COMPLETION_ERROR };
