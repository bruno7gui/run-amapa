import { admin, db } from '../../../../lib/server';
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
    const page = await db('pilot_registrations?select=name,email,shirt,dedication,status,kit_at&order=created_at.desc,id.desc&limit=500&offset=' + offset);
    rows.push(...page);
    if (page.length < 500) break;
  }
  const content = [['Nome', 'E-mail', 'Camisa', 'Dedicatória', 'Situação', 'Retirada do kit'],
    ...rows.map(row => [row.name, row.email, row.shirt, row.dedication, labels[row.status], row.kit_at]),
  ].map(row => row.map(csv).join(';')).join('\r\n');
  return new Response('\uFEFF' + content, { headers: {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': 'attachment; filename=inscritos-guimaraes.csv',
    'Cache-Control': 'private, no-store',
  } });
}
