import assert from 'node:assert/strict';
import test from 'node:test';

import { validateDiuEmail } from '../features/registration/verification/emailValidation.ts';

test('valid @diu.edu.bd matches domain rules', () => {
  const result = validateDiuEmail('name@diu.edu.bd');
  assert.equal(result.valid, true);
  assert.equal(result.email, 'name@diu.edu.bd');
});

test('valid @s.diu.edu.bd matches domain rules', () => {
  const result = validateDiuEmail('student@s.diu.edu.bd');
  assert.equal(result.valid, true);
  assert.equal(result.email, 'student@s.diu.edu.bd');
});

test('uppercase domain is normalized and matched case-insensitively', () => {
  const result = validateDiuEmail('NAME@DIU.EDU.BD');
  assert.equal(result.valid, true);
  assert.equal(result.email, 'NAME@diu.edu.bd');
});

test('surrounding spaces are normalized by trimming', () => {
  const result = validateDiuEmail('  student@s.diu.edu.bd  ');
  assert.equal(result.valid, true);
  assert.equal(result.email, 'student@s.diu.edu.bd');
});

test('Gmail domain is rejected', () => {
  const result = validateDiuEmail('user@gmail.com');
  assert.equal(result.valid, false);
});

test('fake suffixes like diu.edu.bd.example.com are rejected', () => {
  const result = validateDiuEmail('user@diu.edu.bd.example.com');
  assert.equal(result.valid, false);
});

test('malformed emails are rejected', () => {
  const malformed = [
    'user@@diu.edu.bd',
    'user@diu',
    '@diu.edu.bd',
    'user@',
    'user name@diu.edu.bd',
    'user@diu.edu.bd@extra',
  ];
  for (const email of malformed) {
    const result = validateDiuEmail(email);
    assert.equal(result.valid, false);
  }
});
