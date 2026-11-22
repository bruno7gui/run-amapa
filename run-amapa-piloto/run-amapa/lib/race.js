export const raceDate = { label: '14 de março de 2027', numeric: '14/03/2027', note: 'Data prevista, sujeita à confirmação' };
export const title = '2ª Corrida dos Guimarães';
export const shirts = ['PP', 'P', 'M', 'G', 'GG', 'XG'];
export const labels = {
  pending: 'Aguardando pagamento',
  confirmed: 'Inscrição confirmada',
  canceled: 'Pagamento cancelado',
  refunded: 'Pagamento estornado',
  review: 'Em análise pela organização',
};

export function money(cents) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}
