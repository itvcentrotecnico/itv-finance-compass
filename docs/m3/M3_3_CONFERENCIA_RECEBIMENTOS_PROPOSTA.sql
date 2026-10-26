-- M3.3 — Conferência de recebimentos (PROPOSTA — NÃO EXECUTADA)
-- Escopo: somente financeiro_hml. Não altera tabelas, funções, triggers ou políticas existentes.
-- Operações e movimentos imutáveis continuam a única autoridade de saldo.
-- Esta tabela guarda o controle pré-lançamento (venda x liquidação), sem efeito sobre saldos.

BEGIN;

CREATE TABLE financeiro_hml.tesouraria_conferencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referencia_origem text NOT NULL UNIQUE,          -- ex.: CONTROLE_CAIXA_2026|SETEMBRO 24 - CAIXA|C49 (idempotência de reprocessamento)
  grupo_id uuid NOT NULL DEFAULT gen_random_uuid(), -- agrupa componentes de um pagamento misto
  valor_total_grupo numeric(18,2) CHECK (valor_total_grupo > 0),
  natureza text NOT NULL CHECK (natureza IN ('entrada','saida')),
  forma text NOT NULL CHECK (forma IN ('dinheiro','pix','credito','debito','parcelado','boleto','indefinida')),
  data_ocorrencia date NOT NULL,                   -- data da venda/pagamento na planilha
  descricao varchar(500) NOT NULL CHECK (char_length(btrim(descricao)) >= 2),
  valor_bruto numeric(18,2) NOT NULL CHECK (valor_bruto > 0),
  valor_liquido numeric(18,2) CHECK (valor_liquido > 0 AND valor_liquido <= valor_bruto),
  taxa numeric(18,2) GENERATED ALWAYS AS (valor_bruto - valor_liquido) STORED,
  data_liquidacao date,
  boleto_vencimento date,
  boleto_pagamento date,
  boleto_status text CHECK (boleto_status IN ('pendente','pago','vencido')),
  conta_financeira_id uuid REFERENCES financeiro_hml.contas_financeiras(id), -- nula = pendente de vínculo
  plano_conta_id uuid REFERENCES financeiro_hml.plano_contas(id),
  centro_custo_id uuid REFERENCES financeiro_hml.centros_custo(id),
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','em_conferencia','conciliado','divergente')),
  observacao varchar(500),
  operacao_id uuid UNIQUE REFERENCES financeiro_hml.tesouraria_operacoes(id), -- preenchida só quando virar lançamento
  criado_em timestamptz NOT NULL DEFAULT now(),
  criado_por uuid DEFAULT auth.uid(),
  atualizado_em timestamptz,
  atualizado_por uuid,
  CHECK (forma <> 'boleto' OR boleto_status IS NOT NULL),
  CHECK (status <> 'conciliado' OR conta_financeira_id IS NOT NULL),
  CHECK (forma NOT IN ('credito','debito','parcelado') OR status <> 'conciliado'
         OR (valor_liquido IS NOT NULL AND data_liquidacao IS NOT NULL))
);

CREATE INDEX ON financeiro_hml.tesouraria_conferencias (grupo_id);
CREATE INDEX ON financeiro_hml.tesouraria_conferencias (status, data_ocorrencia);

-- Autoria/atualização sempre pelo banco
CREATE FUNCTION financeiro_hml.tes_conf_autoria() RETURNS trigger
LANGUAGE plpgsql SET search_path = financeiro_hml, pg_temp AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN NEW.criado_por := auth.uid(); NEW.criado_em := now();
  ELSE
    IF OLD.operacao_id IS NOT NULL THEN RAISE EXCEPTION 'Conferência já lançada é imutável'; END IF;
    NEW.referencia_origem := OLD.referencia_origem; NEW.criado_por := OLD.criado_por; NEW.criado_em := OLD.criado_em;
    NEW.atualizado_por := auth.uid(); NEW.atualizado_em := now();
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER tes_conf_autoria BEFORE INSERT OR UPDATE ON financeiro_hml.tesouraria_conferencias
  FOR EACH ROW EXECUTE FUNCTION financeiro_hml.tes_conf_autoria();

-- Trilha de auditoria: reutiliza o trigger genérico existente de financeiro_hml.auditoria
-- (nome confirmado na inspeção antes da aprovação final; linha abaixo a ajustar se diferir)
-- CREATE TRIGGER auditoria AFTER INSERT OR UPDATE ON financeiro_hml.tesouraria_conferencias
--   FOR EACH ROW EXECUTE FUNCTION financeiro_hml.<funcao_auditoria_existente>();

GRANT SELECT, INSERT, UPDATE ON financeiro_hml.tesouraria_conferencias TO authenticated; -- sem DELETE
GRANT ALL ON financeiro_hml.tesouraria_conferencias TO service_role;
ALTER TABLE financeiro_hml.tesouraria_conferencias ENABLE ROW LEVEL SECURITY;

-- Mesmos papéis já usados na Tesouraria (tem_papel existente)
CREATE POLICY conf_ler ON financeiro_hml.tesouraria_conferencias FOR SELECT TO authenticated
  USING (financeiro_hml.tem_papel(ARRAY['administrador_geral','administrador_financeiro','analista_financeiro','consulta_gerencial']));
CREATE POLICY conf_inserir ON financeiro_hml.tesouraria_conferencias FOR INSERT TO authenticated
  WITH CHECK (financeiro_hml.tem_papel(ARRAY['administrador_geral','administrador_financeiro','analista_financeiro']));
CREATE POLICY conf_editar ON financeiro_hml.tesouraria_conferencias FOR UPDATE TO authenticated
  USING (financeiro_hml.tem_papel(ARRAY['administrador_geral','administrador_financeiro','analista_financeiro']))
  WITH CHECK (financeiro_hml.tem_papel(ARRAY['administrador_geral','administrador_financeiro','analista_financeiro']));

COMMIT;
