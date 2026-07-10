import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const apiSource = readFileSync(
  new URL('../features/registration/api.ts', import.meta.url),
  'utf8'
);
const flowSource = readFileSync(
  new URL('../features/registration/RegistrationFlow.tsx', import.meta.url),
  'utf8'
);
const captureSource = readFileSync(
  new URL('../features/registration/capture/GuidedEnrollmentCapture.tsx', import.meta.url),
  'utf8'
);
const progressSource = readFileSync(
  new URL('../features/registration/steps/VerificationProgressStep.tsx', import.meta.url),
  'utf8'
);
const circularGuideSource = readFileSync(
  new URL('../features/registration/verification/CircularProgressGuide.tsx', import.meta.url),
  'utf8'
);

test('verification upload sends stable ownership and idempotency credentials', () => {
  assert.match(apiSource, /'Idempotency-Key': credentials\.idempotencyKey/);
  assert.match(apiSource, /'X-Verification-Token': credentials\.ownerToken/);
  assert.match(apiSource, /crypto\.randomUUID\(\)/);
});

test('submission errors distinguish network and HTTP failure categories', () => {
  for (const status of [404, 413, 422, 500, 503]) {
    assert.match(apiSource, new RegExp(`status === ${status}|status >= ${status}`));
  }
  assert.match(apiSource, /requestId: response\.headers\.get\('x-request-id'\)/);
  assert.match(apiSource, /httpStatus: null/);
});

test('refresh restores the persisted verification job and resumes polling', () => {
  assert.match(flowSource, /localStorage\.getItem\(verificationStorageKey\)/);
  assert.match(flowSource, /setVerificationJob\(persisted\.verificationJob\)/);
  assert.match(flowSource, /fetchEnrollmentVerificationStatus\(/);
  assert.match(flowSource, /window\.setTimeout\(poll, 1500\)/);
});

test('capture data is cleared only after committed registration success', () => {
  assert.match(captureSource, /if \(result\.registrationComplete\) \{\s*clearSession\(\)/);
  assert.match(flowSource, /if \(next\.status === 'succeeded'\)/);
  assert.match(flowSource, /setActiveStep\(4\)/);
});

test('new frontend accepts the legacy synchronous committed response during rollout', () => {
  assert.match(
    flowSource,
    /if \(!result\.verificationJob\)[\s\S]*registrationComplete: true/
  );
});

test('failed verification removes the persisted ownership token immediately', () => {
  assert.match(
    flowSource,
    /if \(next\.status === 'failed'\)[\s\S]*verificationCredentialsRef\.current = null;[\s\S]*localStorage\.removeItem\(verificationStorageKey\)/
  );
});

test('failed-angle jobs return only affected angles to capture', () => {
  assert.match(flowSource, /setRetakeFailures\(verificationJob\.failed_angles\)/);
  assert.match(captureSource, /invalidateAngles\(failedCaptureAngles\(initialFailedCaptures\)\)/);
});

test('progress UI exposes the required bounded stages and controlled retry', () => {
  for (const label of ['Uploading', 'Validating', 'Verifying identity', 'Completing registration']) {
    assert.match(progressSource, new RegExp(label));
  }
  assert.match(progressSource, /failed && <Button onClick=\{onRetry\}>Retry verification<\/Button>/);
});

test('verification ring uses fixed user-relative cardinal positions', () => {
  assert.match(circularGuideSource, /up: -90/);
  assert.match(circularGuideSource, /right: 0/);
  assert.match(circularGuideSource, /down: 90/);
  assert.match(circularGuideSource, /left: 180/);
  assert.match(circularGuideSource, /activeDirection === 'front'/);
  assert.doesNotMatch(circularGuideSource, /index \* segmentAngle/);
});
