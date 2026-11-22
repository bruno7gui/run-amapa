export const sexes = { feminino: 'Feminino', masculino: 'Masculino', nao_informado: 'Prefiro não informar' };
export const categories = { familia: 'Família', amigos: 'Amigos' };

export function normalizeCpf(value) {
  return typeof value === 'string' && /^[\d.\-\s]+$/.test(value) ? value.replace(/\D/g, '') : '';
}

export function validCpf(value) {
  const cpf = normalizeCpf(value);
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;
  for (let length = 9; length <= 10; length++) {
    let sum = 0;
    for (let i = 0; i < length; i++) sum += Number(cpf[i]) * (length + 1 - i);
    const digit = (sum * 10 % 11) % 10;
    if (digit !== Number(cpf[length])) return false;
  }
  return true;
}

export function normalizePhone(value) {
  if (typeof value !== 'string' || !/^[+\d\s().-]+$/.test(value)) return '';
  let phone = value.replace(/\D/g, '');
  if (phone.length === 13 && phone.startsWith('55')) phone = phone.slice(2);
  return /^[1-9]{2}9\d{8}$/.test(phone) ? phone : '';
}

export function formatCpf(value) {
  return value?.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4') || 'Não informado';
}
export function formatPhone(value) {
  return value?.replace(/^(\d{2})(\d)(\d{4})(\d{4})$/, '($1) $2 $3-$4') || 'Não informado';
}

export const dedicationOptOut = 'Prefiro não informar ou não vou correr por ninguém.';

export function dedicationValue(text, optOut) {
  const trimmed = String(text || '').trim();
  if (optOut === 'on') return trimmed ? null : dedicationOptOut;
  if (optOut || !trimmed || trimmed.length > 100) return null;
  return trimmed;
}

export function maskCpf(value) {
  const digits = String(value).replace(/\D/g, '').slice(0, 11);
  return digits.slice(0, 3) + (digits.length > 3 ? '.' + digits.slice(3, 6) : '') +
    (digits.length > 6 ? '.' + digits.slice(6, 9) : '') + (digits.length > 9 ? '-' + digits.slice(9) : '');
}

export function maskPhone(value) {
  let digits = String(value).replace(/\D/g, '');
  if (digits.length === 13 && digits.startsWith('55')) digits = digits.slice(2);
  digits = digits.slice(0, 11);
  if (!digits) return '';
  return '(' + digits.slice(0, 2) + (digits.length >= 2 ? ')' : '') +
    (digits.length > 2 ? ' ' + digits[2] : '') +
    (digits.length > 3 ? ' ' + digits.slice(3, 7) : '') +
    (digits.length > 7 ? '-' + digits.slice(7) : '');
}
