import { admin, db } from '../../../../lib/server';
import { categories, sexes } from '../../../../lib/registration';
import { labels } from '../../../../lib/race';

function csv(value) {
  const str = String(value ?? '');
  const safe = /^[\s]*[=+@-]|^[\t\r\n]/.test(str) ? "'" + str : str;
  return '"' + safe.replaceAll('"', '""') + '"';
}

export async function GET() {
  if (!await admin()) return new Response(null, { status: 401 });
  const rows = [];
  for (let offset = 0; ; offset += 500) {
    const page = await db('pilot_registrations?select=name,email,birth_date,cpf,phone,sex,category,shirt,dedication,terms_accepted_at,status,kit_at&order=created_at.desc,id.desc&limit=500&offset=' + offset);
    rows.push(...page);
    if (page.length < 500) break;
  }
  const content = [['Endereço de e-mail', 'Nome Completo', 'Data de nascimento', 'CPF', 'Celular', 'Sexo', 'Categoria', 'Tamanho da camisa', 'Seu laço', 'Aceite do termo', 'Situação', 'Retirada do kit'],
    ...rows.map(row => [row.email, row.name, row.birth_date?.split('-').reverse().join('/'), row.cpf, row.phone, sexes[row.sex], categories[row.category], row.shirt, row.dedication, row.terms_accepted_at, labels[row.status], row.kit_at]),
  ].map(row => row.map(csv).join(';')).join('\r\n');
  return new Response('\uFEFF' + content, { headers: {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': 'attachment; filename=inscritos-guimaraes.csv',
    'Cache-Control': 'private, no-store',
  } });
}
