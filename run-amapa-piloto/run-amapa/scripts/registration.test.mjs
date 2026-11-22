import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizeCpf, normalizePhone, validCpf, maskCpf, maskPhone, dedicationValue, dedicationOptOut } from '../lib/registration.js';

test('CPF validates check digits and rejects repeated or malformed numbers', () => {
  assert.equal(normalizeCpf('529.982.247-25'), '52998224725');
  assert.equal(validCpf('529.982.247-25'), true);
  for (const value of ['52998224724', '11111111111', '00000000000', '', 'cpf52998224725', '123']) {
    assert.equal(validCpf(value), false, value);
  }
});

test('mobile normalization accepts DDD and country code without accepting landlines', () => {
  assert.equal(normalizePhone('(96) 99999-9999'), '96999999999');
  assert.equal(normalizePhone('+55 (96) 99999-9999'), '96999999999');
  for (const value of ['', '99999-9999', '00999999999', '(96) 3333-3333', 'abc96999999999']) {
    assert.equal(normalizePhone(value), '', value);
  }
});

test('masks format typing and pasted CPF and mobile numbers', () => {
  assert.equal(maskCpf('52998224725'), '529.982.247-25');
  assert.equal(maskCpf('529.982.247-25'), '529.982.247-25');
  assert.equal(maskCpf('5299'), '529.9');
  assert.equal(maskCpf(''), '');
  assert.equal(maskPhone('96999999999'), '(96) 9 9999-9999');
  assert.equal(maskPhone('+55 (96) 99999-9999'), '(96) 9 9999-9999');
  assert.equal(maskPhone('969'), '(96) 9');
  assert.equal(maskPhone(''), '');
});

test('dedication requires text or explicit opt-out and rejects conflicting answers', () => {
  assert.equal(dedicationValue('  Minha família  ', ''), 'Minha família');
  assert.equal(dedicationValue('', 'on'), dedicationOptOut);
  assert.equal(dedicationValue('', ''), null);
  assert.equal(dedicationValue('   ', ''), null);
  assert.equal(dedicationValue('Minha família', 'on'), null);
  assert.equal(dedicationValue('', 'yes'), null);
});
