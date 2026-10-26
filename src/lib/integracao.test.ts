import { describe, expect, it } from "vitest";
import { mapearForma, montarItens, referenciaOrigem, textoCanonico, type FonteGestao } from "./integracao";

const FORMAS = [
  { id: "f-din", nome: "Dinheiro" },
  { id: "f-pix", nome: "Pix" },
  { id: "f-cred", nome: "Crédito" },
  { id: "f-deb", nome: "Débito" },
  { id: "f-bol", nome: "Boleto" },
  { id: "f-bemol", nome: "Bemol" },
];

function fonte(parcial: Partial<FonteGestao>): FonteGestao {
  return { formas: FORMAS, lancamentos: [], pagamentos: [], recebimentos: [], titulosAbertos: [], ...parcial };
}

describe("mapearForma", () => {
  it("mapeia formas conhecidas", () => {
    expect(mapearForma("Dinheiro")).toBe("dinheiro");
    expect(mapearForma("Pix")).toBe("pix");
    expect(mapearForma("Débito")).toBe("debito");
    expect(mapearForma("Boleto")).toBe("boleto");
  });
  it("crédito parcelado vira parcelado", () => {
    expect(mapearForma("Crédito", 1)).toBe("credito");
    expect(mapearForma("Crédito", 3)).toBe("parcelado");
  });
  it("formas desconhecidas ficam indefinidas para revisão", () => {
    expect(mapearForma("Bemol")).toBe("indefinida");
    expect(mapearForma(null)).toBe("indefinida");
    expect(mapearForma("")).toBe("indefinida");
  });
});

describe("referenciaOrigem", () => {
  it("usa projeto + tabela + id", () => {
    expect(referenciaOrigem("caixa_pagamentos", "abc")).toBe("gestao_itv:caixa_pagamentos:abc");
  });
});

describe("textoCanonico", () => {
  const base = { data: "2026-09-08", valor_bruto: "150.00", forma: "pix" as const, descricao: "OS 1 · A" };
  it("é estável para a mesma entrada", () => {
    expect(textoCanonico(base)).toBe(textoCanonico({ ...base }));
  });
  it("muda quando qualquer campo muda", () => {
    expect(textoCanonico({ ...base, valor_bruto: "151.00" })).not.toBe(textoCanonico(base));
    expect(textoCanonico({ ...base, forma: "dinheiro" as const })).not.toBe(textoCanonico(base));
  });
});

describe("montarItens", () => {
  const lanc = { id: "L1", data_lancamento: "2026-09-08", os: "100", cliente: "CLIENTE A", descricao: null, grupo_receita: "servicos", status: "ativo" };

  it("pagamento simples vira item de pagamento", () => {
    const itens = montarItens(fonte({ lancamentos: [lanc], pagamentos: [{ id: "P1", lancamento_id: "L1", forma_pagamento_id: "f-pix", valor: 150, parcelas: 1, valor_liquido: null }] }));
    expect(itens).toHaveLength(1);
    expect(itens[0]!.tipo).toBe("pagamento");
    expect(itens[0]!.referencia).toBe("gestao_itv:caixa_pagamentos:P1");
    expect(itens[0]!.resumo.valor_bruto).toBe("150.00");
    expect(itens[0]!.resumo.forma).toBe("pix");
    expect(itens[0]!.resumo.descricao).toBe("OS 100 · CLIENTE A");
  });

  it("pagamento misto gera um item por pagamento, com referências distintas", () => {
    const itens = montarItens(fonte({
      lancamentos: [lanc],
      pagamentos: [
        { id: "P2a", lancamento_id: "L1", forma_pagamento_id: "f-din", valor: 200, parcelas: 1, valor_liquido: null },
        { id: "P2b", lancamento_id: "L1", forma_pagamento_id: "f-cred", valor: 300, parcelas: 3, valor_liquido: 291 },
      ],
    }));
    expect(itens).toHaveLength(2);
    expect(new Set(itens.map((i) => i.referencia)).size).toBe(2);
    expect(itens[1]!.resumo.forma).toBe("parcelado");
    expect(itens[1]!.resumo.valor_liquido).toBe("291.00");
  });

  it("pagamento de lançamento estornado ou cancelado é ignorado", () => {
    const itens = montarItens(fonte({
      lancamentos: [{ ...lanc, status: "estornado" }],
      pagamentos: [{ id: "P3", lancamento_id: "L1", forma_pagamento_id: "f-pix", valor: 150, parcelas: 1, valor_liquido: null }],
    }));
    expect(itens).toHaveLength(0);
  });

  it("valor líquido inválido vira nulo (fica para conferência)", () => {
    const itens = montarItens(fonte({ lancamentos: [lanc], pagamentos: [{ id: "P4", lancamento_id: "L1", forma_pagamento_id: "f-cred", valor: 100, parcelas: 1, valor_liquido: 101 }] }));
    expect(itens[0]!.resumo.valor_liquido).toBeNull();
  });

  it("recebimento de título usa a data do recebimento", () => {
    const itens = montarItens(fonte({ recebimentos: [{ id: "R1", conta_receber_id: "T1", data_recebimento: "2026-09-10", valor: 500, forma_pagamento_id: "f-bol", referencia: "NF 55", estorno_de_id: null }] }));
    expect(itens).toHaveLength(1);
    expect(itens[0]!.tipo).toBe("recebimento_titulo");
    expect(itens[0]!.resumo.data).toBe("2026-09-10");
    expect(itens[0]!.resumo.forma).toBe("boleto");
  });

  it("recebimento de estorno é ignorado", () => {
    const itens = montarItens(fonte({ recebimentos: [{ id: "R2", conta_receber_id: "T1", data_recebimento: "2026-09-11", valor: 500, forma_pagamento_id: "f-bol", referencia: null, estorno_de_id: "R1" }] }));
    expect(itens).toHaveLength(0);
  });

  it("título em aberto é informativo e nunca receita", () => {
    const itens = montarItens(fonte({ titulosAbertos: [{ id: "T2", os: "103", cliente: "EMPRESA D", valor_original: 700, saldo: 700, vencimento: "2026-10-01" }] }));
    expect(itens).toHaveLength(1);
    expect(itens[0]!.tipo).toBe("titulo_aberto");
    expect(itens[0]!.resumo.forma).toBe("indefinida");
  });

  it("título sem saldo não entra", () => {
    const itens = montarItens(fonte({ titulosAbertos: [{ id: "T3", os: null, cliente: null, valor_original: 700, saldo: 0, vencimento: null }] }));
    expect(itens).toHaveLength(0);
  });

  it("valor zero ou inválido é ignorado", () => {
    const itens = montarItens(fonte({ lancamentos: [lanc], pagamentos: [{ id: "P5", lancamento_id: "L1", forma_pagamento_id: "f-pix", valor: 0, parcelas: 1, valor_liquido: null }] }));
    expect(itens).toHaveLength(0);
  });
});
