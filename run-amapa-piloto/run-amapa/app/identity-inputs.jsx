'use client';

import { normalizePhone, validCpf } from '../lib/registration';

const checkCpf = event => event.currentTarget.setCustomValidity(
  !event.currentTarget.value || validCpf(event.currentTarget.value) ? '' : 'Informe um CPF válido, com 11 dígitos.');
const checkPhone = event => event.currentTarget.setCustomValidity(
  !event.currentTarget.value || normalizePhone(event.currentTarget.value) ? '' : 'Informe seu celular com DDD e 9 dígitos.');

export function CpfInput() {
  return <input name="cpf" inputMode="numeric" maxLength={14} placeholder="000.000.000-00"
    onChange={checkCpf} onBlur={checkCpf} required />;
}

export function PhoneInput() {
  return <input name="phone" type="tel" autoComplete="tel" maxLength={22} placeholder="(96) 99999-9999"
    onChange={checkPhone} onBlur={checkPhone} required />;
}
