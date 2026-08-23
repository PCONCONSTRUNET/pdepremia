-- ============================================================
-- PREMIAJÁ — Migration 045: Configurar novos Prêmios da Roleta
-- ============================================================

UPDATE public.system_settings 
SET value = '{
  "P Starter": [
    {
      "id": "starter-tente-nov",
      "name": "Tente Novamente",
      "type": "empty",
      "value": 0,
      "probability": 70,
      "color": "#475569",
      "imageUrl": "/tente_novamente.png",
      "category": "Geral"
    },
    {
      "id": "starter-2-rodadas",
      "name": "2 Rodadas Grátis",
      "type": "free_spins",
      "value": 0,
      "probability": 20,
      "color": "#8B5CF6",
      "imageUrl": "/2 rodadas gratis.png",
      "category": "Rodadas",
      "freeSpinsAmount": 2,
      "freeSpinsValue": 0.2
    },
    {
      "id": "starter-5-rodadas",
      "name": "5 Rodadas Grátis",
      "type": "free_spins",
      "value": 0,
      "probability": 8,
      "color": "#10B981",
      "imageUrl": "/5 rodadas gratis.png",
      "category": "Rodadas",
      "freeSpinsAmount": 5,
      "freeSpinsValue": 0.2
    },
    {
      "id": "starter-1-real",
      "name": "R$ 1,00",
      "type": "balance",
      "value": 1,
      "probability": 2,
      "color": "#3B82F6",
      "imageUrl": "/1 real.png",
      "category": "Saldo"
    }
  ],
  "P Hunter": [
    {
      "id": "hunter-tente-nov",
      "name": "Tente Novamente",
      "type": "empty",
      "value": 0,
      "probability": 60,
      "color": "#475569",
      "imageUrl": "/tente_novamente.png",
      "category": "Geral"
    },
    {
      "id": "hunter-2-rodadas",
      "name": "2 Rodadas Grátis",
      "type": "free_spins",
      "value": 0,
      "probability": 25,
      "color": "#8B5CF6",
      "imageUrl": "/2 rodadas gratis.png",
      "category": "Rodadas",
      "freeSpinsAmount": 2,
      "freeSpinsValue": 0.2
    },
    {
      "id": "hunter-5-rodadas",
      "name": "5 Rodadas Grátis",
      "type": "free_spins",
      "value": 0,
      "probability": 10,
      "color": "#10B981",
      "imageUrl": "/5 rodadas gratis.png",
      "category": "Rodadas",
      "freeSpinsAmount": 5,
      "freeSpinsValue": 0.2
    },
    {
      "id": "hunter-10-rodadas",
      "name": "10 Rodadas Grátis",
      "type": "free_spins",
      "value": 0,
      "probability": 4,
      "color": "#F59E0B",
      "imageUrl": "/10 rodadas gratis.png",
      "category": "Rodadas",
      "freeSpinsAmount": 10,
      "freeSpinsValue": 0.2
    },
    {
      "id": "hunter-3-reais",
      "name": "R$ 3,00",
      "type": "balance",
      "value": 3,
      "probability": 1,
      "color": "#3B82F6",
      "imageUrl": "/3 reais.png",
      "category": "Saldo"
    }
  ],
  "P Master": [
    {
      "id": "master-tente-nov",
      "name": "Tente Novamente",
      "type": "empty",
      "value": 0,
      "probability": 50,
      "color": "#475569",
      "imageUrl": "/tente_novamente.png",
      "category": "Geral"
    },
    {
      "id": "master-2-rodadas",
      "name": "2 Rodadas Grátis",
      "type": "free_spins",
      "value": 0,
      "probability": 25,
      "color": "#8B5CF6",
      "imageUrl": "/2 rodadas gratis.png",
      "category": "Rodadas",
      "freeSpinsAmount": 2,
      "freeSpinsValue": 0.2
    },
    {
      "id": "master-5-rodadas",
      "name": "5 Rodadas Grátis",
      "type": "free_spins",
      "value": 0,
      "probability": 15,
      "color": "#10B981",
      "imageUrl": "/5 rodadas gratis.png",
      "category": "Rodadas",
      "freeSpinsAmount": 5,
      "freeSpinsValue": 0.2
    },
    {
      "id": "master-10-rodadas",
      "name": "10 Rodadas Grátis",
      "type": "free_spins",
      "value": 0,
      "probability": 8,
      "color": "#F59E0B",
      "imageUrl": "/10 rodadas gratis.png",
      "category": "Rodadas",
      "freeSpinsAmount": 10,
      "freeSpinsValue": 0.2
    },
    {
      "id": "master-5-reais",
      "name": "R$ 5,00",
      "type": "balance",
      "value": 5,
      "probability": 2,
      "color": "#3B82F6",
      "imageUrl": "/5 reais.png",
      "category": "Saldo"
    }
  ],
  "P Legend": [
    {
      "id": "legend-tente-nov",
      "name": "Tente Novamente",
      "type": "empty",
      "value": 0,
      "probability": 40,
      "color": "#475569",
      "imageUrl": "/tente_novamente.png",
      "category": "Geral"
    },
    {
      "id": "legend-2-rodadas",
      "name": "2 Rodadas Grátis",
      "type": "free_spins",
      "value": 0,
      "probability": 30,
      "color": "#8B5CF6",
      "imageUrl": "/2 rodadas gratis.png",
      "category": "Rodadas",
      "freeSpinsAmount": 2,
      "freeSpinsValue": 0.2
    },
    {
      "id": "legend-5-rodadas",
      "name": "5 Rodadas Grátis",
      "type": "free_spins",
      "value": 0,
      "probability": 20,
      "color": "#10B981",
      "imageUrl": "/5 rodadas gratis.png",
      "category": "Rodadas",
      "freeSpinsAmount": 5,
      "freeSpinsValue": 0.2
    },
    {
      "id": "legend-10-rodadas",
      "name": "10 Rodadas Grátis",
      "type": "free_spins",
      "value": 0,
      "probability": 7,
      "color": "#F59E0B",
      "imageUrl": "/10 rodadas gratis.png",
      "category": "Rodadas",
      "freeSpinsAmount": 10,
      "freeSpinsValue": 0.2
    },
    {
      "id": "legend-10-reais",
      "name": "R$ 10,00",
      "type": "balance",
      "value": 10,
      "probability": 3,
      "color": "#3B82F6",
      "imageUrl": "/10 reais.png",
      "category": "Saldo"
    }
  ]
}'::jsonb
WHERE key = 'daily_wheel_prizes';
