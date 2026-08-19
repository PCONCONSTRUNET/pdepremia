-- ============================================================
-- PREMIAJÁ — Migration 014: Configurar Prêmios da Roleta Diária com Imagens
-- ============================================================

INSERT INTO public.system_settings (key, value, updated_at)
VALUES (
  'daily_wheel_prizes',
  '{
    "P Starter": [
      {
        "id": "prize-tente-novamente-1",
        "name": "Tente Novamente",
        "category": "Geral",
        "type": "empty",
        "value": 0,
        "probability": 60,
        "color": "#475569",
        "imageUrl": "/tente_novamente.png"
      },
      {
        "id": "prize-xp-duplo-1",
        "name": "XP Duplo",
        "category": "Geral",
        "type": "physical",
        "value": 0,
        "probability": 15,
        "color": "#8B5CF6",
        "imageUrl": "/xp_duplo.png"
      },
      {
        "id": "prize-cashback-1",
        "name": "Cashback 5%",
        "category": "Geral",
        "type": "physical",
        "value": 0,
        "probability": 15,
        "color": "#10B981",
        "imageUrl": "/cashback_5.png"
      },
      {
        "id": "prize-2-reais-1",
        "name": "R$ 2,00",
        "category": "Geral",
        "type": "balance",
        "value": 2,
        "probability": 8,
        "color": "#3B82F6",
        "imageUrl": "/2_reais.png"
      },
      {
        "id": "prize-5-reais-1",
        "name": "R$ 5,00",
        "category": "Geral",
        "type": "balance",
        "value": 5,
        "probability": 2,
        "color": "#F59E0B",
        "imageUrl": "/5_reais.png"
      }
    ],
    "P Hunter": [
      {
        "id": "prize-tente-novamente-2",
        "name": "Tente Novamente",
        "category": "Geral",
        "type": "empty",
        "value": 0,
        "probability": 60,
        "color": "#475569",
        "imageUrl": "/tente_novamente.png"
      },
      {
        "id": "prize-xp-duplo-2",
        "name": "XP Duplo",
        "category": "Geral",
        "type": "physical",
        "value": 0,
        "probability": 15,
        "color": "#8B5CF6",
        "imageUrl": "/xp_duplo.png"
      },
      {
        "id": "prize-cashback-2",
        "name": "Cashback 5%",
        "category": "Geral",
        "type": "physical",
        "value": 0,
        "probability": 15,
        "color": "#10B981",
        "imageUrl": "/cashback_5.png"
      },
      {
        "id": "prize-2-reais-2",
        "name": "R$ 2,00",
        "category": "Geral",
        "type": "balance",
        "value": 2,
        "probability": 8,
        "color": "#3B82F6",
        "imageUrl": "/2_reais.png"
      },
      {
        "id": "prize-5-reais-2",
        "name": "R$ 5,00",
        "category": "Geral",
        "type": "balance",
        "value": 5,
        "probability": 2,
        "color": "#F59E0B",
        "imageUrl": "/5_reais.png"
      }
    ],
    "P Master": [
      {
        "id": "prize-tente-novamente-3",
        "name": "Tente Novamente",
        "category": "Geral",
        "type": "empty",
        "value": 0,
        "probability": 60,
        "color": "#475569",
        "imageUrl": "/tente_novamente.png"
      },
      {
        "id": "prize-xp-duplo-3",
        "name": "XP Duplo",
        "category": "Geral",
        "type": "physical",
        "value": 0,
        "probability": 15,
        "color": "#8B5CF6",
        "imageUrl": "/xp_duplo.png"
      },
      {
        "id": "prize-cashback-3",
        "name": "Cashback 5%",
        "category": "Geral",
        "type": "physical",
        "value": 0,
        "probability": 15,
        "color": "#10B981",
        "imageUrl": "/cashback_5.png"
      },
      {
        "id": "prize-2-reais-3",
        "name": "R$ 2,00",
        "category": "Geral",
        "type": "balance",
        "value": 2,
        "probability": 8,
        "color": "#3B82F6",
        "imageUrl": "/2_reais.png"
      },
      {
        "id": "prize-5-reais-3",
        "name": "R$ 5,00",
        "category": "Geral",
        "type": "balance",
        "value": 5,
        "probability": 2,
        "color": "#F59E0B",
        "imageUrl": "/5_reais.png"
      }
    ],
    "P Legend": [
      {
        "id": "prize-tente-novamente-4",
        "name": "Tente Novamente",
        "category": "Geral",
        "type": "empty",
        "value": 0,
        "probability": 60,
        "color": "#475569",
        "imageUrl": "/tente_novamente.png"
      },
      {
        "id": "prize-xp-duplo-4",
        "name": "XP Duplo",
        "category": "Geral",
        "type": "physical",
        "value": 0,
        "probability": 15,
        "color": "#8B5CF6",
        "imageUrl": "/xp_duplo.png"
      },
      {
        "id": "prize-cashback-4",
        "name": "Cashback 5%",
        "category": "Geral",
        "type": "physical",
        "value": 0,
        "probability": 15,
        "color": "#10B981",
        "imageUrl": "/cashback_5.png"
      },
      {
        "id": "prize-2-reais-4",
        "name": "R$ 2,00",
        "category": "Geral",
        "type": "balance",
        "value": 2,
        "probability": 8,
        "color": "#3B82F6",
        "imageUrl": "/2_reais.png"
      },
      {
        "id": "prize-5-reais-4",
        "name": "R$ 5,00",
        "category": "Geral",
        "type": "balance",
        "value": 5,
        "probability": 2,
        "color": "#F59E0B",
        "imageUrl": "/5_reais.png"
      }
    ]
  }'::jsonb,
  now()
)
ON CONFLICT (key) DO UPDATE 
SET value = EXCLUDED.value,
    updated_at = EXCLUDED.updated_at;
