'use client';

import { useState } from 'react';
import { normalizePhone, validCpf, maskCpf, maskPhone } from '../lib/registration';

function MaskedInput({ mask, validate, message, ...props }) {
  const [value, setValue] = useState('');
  function apply(input, raw, digitsBeforeCaret) {
    const formatted = mask(raw);
    setValue(formatted);
    input.setCustomValidity(!formatted || validate(formatted) ? '' : message);
    let caret = 0, digits = 0;
    while (caret < formatted.length && digits < digitsBeforeCaret) {
      if (/\d/.test(formatted[caret])) digits++;
      caret++;
    }
    requestAnimationFrame(() => input.setSelectionRange(caret, caret));
  }
  function onChange(event) {
    const input = event.currentTarget;
    const prefix = input.value.slice(0, input.selectionStart ?? input.value.length);
    apply(input, input.value, prefix.replace(/\D/g, '').length);
  }
  function onKeyDown(event) {
    const input = event.currentTarget, caret = input.selectionStart;
    if (caret === null || caret !== input.selectionEnd) return;
    const backwards = event.key === 'Backspace';
    if (!backwards && event.key !== 'Delete') return;
    let index = backwards ? caret - 1 : caret;
    if (index < 0 || index >= value.length || /\d/.test(value[index])) return;
    while (index >= 0 && index < value.length && !/\d/.test(value[index])) index += backwards ? -1 : 1;
    if (index < 0 || index >= value.length) return;
    event.preventDefault();
    const count = value.slice(0, backwards ? index : caret).replace(/\D/g, '').length;
    apply(input, value.slice(0, index) + value.slice(index + 1), count);
  }
  return <input {...props} value={value} onChange={onChange} onKeyDown={onKeyDown} required />;
}

export function CpfInput() {
  return <MaskedInput name="cpf" inputMode="numeric" maxLength={14} placeholder="000.000.000-00"
    mask={maskCpf} validate={validCpf} message="Informe um CPF válido, com 11 dígitos." />;
}

export function PhoneInput() {
  return <MaskedInput name="phone" type="tel" autoComplete="tel" maxLength={22} placeholder="(99) 9 9999-9999"
    mask={maskPhone} validate={normalizePhone} message="Informe seu celular com DDD e 9 dígitos." />;
}
