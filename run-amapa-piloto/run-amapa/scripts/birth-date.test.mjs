import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validBirthDate } from '../lib/birth-date.js';
test('birth date validation rejects invalid dates and future dates', () => {
  assert.equal(validBirthDate('1990-01-02'), true);
  assert.equal(validBirthDate('2000-02-29'), true);
  for (const value of ['1990-02-29', '2000-02-30', '2020-13-01', '2999-01-01', '1899-12-31', '02/01/1990', '', null]) {
    assert.equal(validBirthDate(value), false, String(value));
  }
});
