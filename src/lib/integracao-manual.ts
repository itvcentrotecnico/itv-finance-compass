/** Decisão vem exclusivamente do banco; não calcular autorização no navegador. */
export interface ControleManual {
  permitida: boolean;
  motivo: "liberada" | "horario" | "sucesso_diario" | "em_andamento";
  agora_servidor: string;
  ultima_sucesso: string | null;
  proxima_liberacao: string;
}

const formatar = (iso: string) => new Date(iso).toLocaleString("pt-BR", {
  dateStyle: "short", timeStyle: "short", timeZone: "America/Manaus",
});

export function mensagemControleManual(controle: ControleManual): string {
  if (controle.motivo === "sucesso_diario") {
    const ultima = controle.ultima_sucesso ? formatar(controle.ultima_sucesso) : "hoje";
    return `Sincronização manual concluída em ${ultima} (Manaus). Nova sincronização disponível em ${formatar(controle.proxima_liberacao)} (Manaus).`;
  }
  if (controle.motivo === "horario") return "Sincronização manual disponível diariamente das 18h30 às 23h59, horário de Manaus.";
  if (controle.motivo === "em_andamento") return "Já existe uma sincronização em andamento. Aguarde a conclusão.";
  return "Sincronização manual liberada até 23h59, horário de Manaus. Uma conclusão por dia, inclusive sem novos registros.";
}