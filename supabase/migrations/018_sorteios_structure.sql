-- ============================================================
-- PREMIAJÁ — Migration 018: Estrutura de Sorteios (Antigas Campanhas)
-- ============================================================

-- Adiciona a coluna 'type' na tabela campaigns para categorizar os sorteios
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'padrao' CHECK (type IN ('diario', 'semanal', 'mensal', 'padrao'));

-- Altera os comentários da tabela para refletir a nova nomenclatura no banco
COMMENT ON TABLE public.campaigns IS 'Tabela que armazena os sorteios (antigas campanhas)';
COMMENT ON COLUMN public.campaigns.type IS 'Tipo de sorteio: diario, semanal, mensal ou padrao';
