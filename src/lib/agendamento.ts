/** Agendamento diário da sincronização GESTÃO ITV (lógica pura, testável). */

/** Horário oficial: 18h30 em America/Manaus (UTC-4, sem horário de verão). */
export const AGENDAMENTO = { hora: 18, minuto: 30, fuso: "America/Manaus", offsetHoras: -4, diasJanela: 7 } as const;

const DIA_MS = 86_400_000;

/** Data (AAAA-MM-DD) em Manaus para um instante. */
export function dataManaus(agora: Date): string {
  return new Date(agora.getTime() + AGENDAMENTO.offsetHoras * 3_600_000).toISOString().slice(0, 10);
}

/** Próxima execução programada (instante UTC) a partir de agora. */
export function proximaExecucao(agora: Date): Date {
  const hoje = dataManaus(agora);
  const alvoHoje = new Date(`${hoje}T${String(AGENDAMENTO.hora).padStart(2, "0")}:${String(AGENDAMENTO.minuto).padStart(2, "0")}:00-04:00`);
  return alvoHoje.getTime() > agora.getTime() ? alvoHoje : new Date(alvoHoje.getTime() + DIA_MS);
}

/** Janela lida pela execução automática: últimos 7 dias, incluindo hoje (Manaus). */
export function janelaAutomatica(agora: Date): { inicio: string; fim: string } {
  const fim = dataManaus(agora);
  const inicio = new Date(new Date(`${fim}T00:00:00Z`).getTime() - (AGENDAMENTO.diasJanela - 1) * DIA_MS).toISOString().slice(0, 10);
  return { inicio, fim };
}

/** Comparação em tempo constante do segredo do agendador. */
export function segredoConfere(recebido: string | null, esperado: string | undefined): boolean {
  if (!esperado || esperado.length < 32 || !recebido) return false;
  const a = new TextEncoder().encode(recebido);
  const b = new TextEncoder().encode(esperado);
  let dif = a.length ^ b.length;
  for (let i = 0; i < b.length; i++) dif |= (a[i] ?? 0) ^ b[i]!;
  return dif === 0;
}
