import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { parseFailedCaptures } from '../features/registration/verification/failedCaptures.ts';
import { enrollmentResponseMessage } from '../features/registration/responseValidation.ts';

const flowSource = readFileSync(
  new URL('../features/registration/RegistrationFlow.tsx', import.meta.url),
  'utf8'
);
const apiSource = readFileSync(
  new URL('../features/registration/api.ts', import.meta.url),
  'utf8'
);
const basicInfoSource = readFileSync(
  new URL('../features/registration/steps/BasicInfoStep.tsx', import.meta.url),
  'utf8'
);

test('real unsupported-email 422 becomes the basic-info error without capture failures', async () => {
  const backend422 = {
    success: false,
    message: 'Invalid enrollment payload.',
    errors: [
      {
        type: 'value_error',
        loc: ['university_email'],
        msg: 'Value error, Use your official DIU email address.',
        input: 'user@gmail.com',
        url: 'https://errors.pydantic.dev/2.13/v/value_error',
      },
    ],
  };
  assert.equal(
    enrollmentResponseMessage(backend422, false),
    'Use your official DIU email address.'
  );
  assert.deepEqual(parseFailedCaptures(backend422), []);
  assert.match(apiSource, /message: enrollmentResponseMessage\(parsedData, response\.ok\)/);
  assert.match(
    flowSource,
    /if \(!result\.success\) \{\s*setBasicInfoError\(result\.message \|\| GENERIC_ENROLLMENT_ERROR\);\s*return;/
  );
  assert.match(basicInfoSource, /role="alert"[\s\S]*\{errorMessage\}/);
});
