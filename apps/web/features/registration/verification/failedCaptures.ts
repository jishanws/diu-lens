export const verificationAngles = ['front', 'left', 'right', 'up', 'down'] as const;

export type FailedCaptureAngle = (typeof verificationAngles)[number];

export type FailedCapture = {
  angle: FailedCaptureAngle;
  reason: string;
  errorCode: string;
  measured?: number | Record<string, number>;
  required?: { min?: number; max?: number } | Record<string, { min: number; max: number }>;
};

function isFailedCaptureAngle(value: unknown): value is FailedCaptureAngle {
  return typeof value === 'string' && verificationAngles.includes(value as FailedCaptureAngle);
}

function numericValue(reason: string, key: string): number | undefined {
  const match = reason.match(new RegExp(`(?:^|[,(])${key}:(-?\\d+(?:\\.\\d+)?)`));
  return match ? Number(match[1]) : undefined;
}

function measurementsFromReason(reason: string): Pick<FailedCapture, 'measured' | 'required'> {
  const measuredKeys = ['score', 'value', 'ratio', 'center_offset', 'margin', 'count'];
  const measuredEntry = measuredKeys
    .map((key) => [key, numericValue(reason, key)] as const)
    .find(([, value]) => value !== undefined);
  const min = numericValue(reason, 'min');
  const max = numericValue(reason, 'max');

  if (reason.startsWith('wrong_pose')) {
    const yaw = numericValue(reason, 'yaw');
    const pitch = numericValue(reason, 'pitch');
    const measured = Object.fromEntries(
      Object.entries({ yaw, pitch }).filter((entry): entry is [string, number] => entry[1] !== undefined)
    );
    return Object.keys(measured).length > 0 ? { measured } : {};
  }

  return {
    ...(measuredEntry ? { measured: measuredEntry[1] } : {}),
    ...(min !== undefined || max !== undefined
      ? { required: { ...(min !== undefined ? { min } : {}), ...(max !== undefined ? { max } : {}) } }
      : {}),
  };
}

export function parseFailedCaptures(value: unknown): FailedCapture[] {
  if (!value || typeof value !== 'object') return [];

  const response = value as Record<string, unknown>;
  const detail = response.detail && typeof response.detail === 'object'
    ? response.detail as Record<string, unknown>
    : response;
  if (
    detail.error !== 'BACKEND_IMAGE_VALIDATION_FAILED' &&
    detail.error !== 'sanity_failed'
  ) {
    return [];
  }

  const entries = detail.details;
  if (!Array.isArray(entries)) return [];

  const failures: FailedCapture[] = [];
  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') continue;
    const record = entry as Record<string, unknown>;
    if (!isFailedCaptureAngle(record.angle) || typeof record.reason !== 'string' || !record.reason.trim()) {
      continue;
    }
    const reason = record.reason.trim();
    failures.push({
      angle: record.angle,
      reason,
      errorCode:
        typeof record.error_code === 'string' && record.error_code.trim()
          ? record.error_code.trim()
          : reason.split('(', 1)[0],
      ...measurementsFromReason(reason),
    });
  }

  return failures.sort(
    (left, right) => verificationAngles.indexOf(left.angle) - verificationAngles.indexOf(right.angle)
  );
}

export function failedCaptureAngles(failures: readonly FailedCapture[]): FailedCaptureAngle[] {
  return verificationAngles.filter((angle) => failures.some((failure) => failure.angle === angle));
}

function readableReason(errorCode: string): string {
  return errorCode.replaceAll('_', ' ').toLowerCase();
}

export function formatFailedCaptures(failures: FailedCapture[]): string {
  if (failures.length === 0) return 'Some captures failed backend validation. Please retake the affected angle.';

  const blurryAngles = failedCaptureAngles(
    failures.filter((failure) => failure.errorCode === 'image_blurry')
  );
  const blurMessages = blurryAngles.map(
    (angle) => `The ${angle} photo is slightly blurry. Hold the device steady, clean the camera lens, and retake it in better lighting.`
  );
  const otherFailures = failures.filter((failure) => failure.errorCode !== 'image_blurry');

  const otherMessages = otherFailures.map((failure) => {
    const measured = typeof failure.measured === 'number'
      ? `; measured ${failure.measured}`
      : failure.measured
        ? `; measured ${Object.entries(failure.measured).map(([key, value]) => `${key} ${value}`).join(', ')}`
        : '';
    const required = failure.required && ('min' in failure.required || 'max' in failure.required)
      ? `; required ${'min' in failure.required && failure.required.min !== undefined ? `min ${failure.required.min}` : ''}${'min' in failure.required && 'max' in failure.required ? ', ' : ''}${'max' in failure.required && failure.required.max !== undefined ? `max ${failure.required.max}` : ''}`
      : '';
    return `${failure.angle}: ${readableReason(failure.errorCode)}${measured}${required}`;
  });
  return [...blurMessages, ...otherMessages].join(' ');
}

export function clearFailedAngleValues<T>(
  values: Record<FailedCaptureAngle, T[]>,
  failedAngles: readonly FailedCaptureAngle[]
): Record<FailedCaptureAngle, T[]> {
  const failed = new Set(failedAngles);
  return Object.fromEntries(
    verificationAngles.map((angle) => [angle, failed.has(angle) ? [] : values[angle]])
  ) as Record<FailedCaptureAngle, T[]>;
}
