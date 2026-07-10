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
  assert.match(flowSource, /verificationCredentialsRef\.current \?\? createVerificationCredentials\(\)/);
});

test('exact stored captures pass authoritative precheck before job submission', () => {
  const precheckIndex = apiSource.indexOf("request(\n      '/enroll/verification/precheck'");
  const submitIndex = apiSource.indexOf("request('/enroll/verification', requestOptions)");
  assert.ok(precheckIndex >= 0);
  assert.ok(submitIndex > precheckIndex);
  assert.match(apiSource, /if \(!precheckResult\.success\) \{\s*return precheckResult;/);
  assert.match(captureSource, /invalidateAngles\(failedCaptureAngles\(result\.failedCaptures\)\);\s*await requestAccess\(\)/);
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

test('failed verification remains restorable until the user chooses retry', () => {
  assert.match(
    flowSource,
    /if \(next\.status === 'failed'\) \{\s*return;\s*\}/
  );
  assert.match(flowSource, /onRetry=\{\(\) => \{[\s\S]*localStorage\.removeItem\(verificationStorageKey\)/);
});

test('failed-angle jobs return only affected angles to capture', () => {
  assert.match(flowSource, /setRetakeFailures\(verificationJob\.failed_angles\)/);
  assert.match(captureSource, /invalidateAngles\(failedCaptureAngles\(initialFailedCaptures\)\)/);
  assert.match(progressSource, /formatFailedCaptures\(job\.failed_angles\)/);
});

test('accepted upload renders an immediate submission receipt with real job stages', () => {
  for (const label of ['Queued', 'Checking images', 'Generating face template', 'Saving enrollment']) {
    assert.match(progressSource, new RegExp(label));
  }
  assert.match(progressSource, /Registration submitted/);
  assert.match(progressSource, /upload is complete and your enrollment is being verified in the background/);
  const persistedIndex = flowSource.indexOf('window.localStorage.setItem(verificationStorageKey', flowSource.indexOf('setVerificationJob(result.verificationJob)'));
  const captureExitIndex = flowSource.indexOf('setActiveStep(3)', persistedIndex);
  const autoExitIndex = flowSource.indexOf('setExitAfterAcceptedSubmission(true)', captureExitIndex);
  assert.ok(persistedIndex >= 0 && captureExitIndex > persistedIndex && autoExitIndex > captureExitIndex);
  assert.match(flowSource, /window\.setTimeout\(\(\) => \{[\s\S]*window\.location\.assign\('\/'\);[\s\S]*\}, 1600\)/);
  assert.match(progressSource, /succeeded \? 'Registration complete'/);
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
