CREATE OR REPLACE VIEW admin_payments_view AS
SELECT 
  p.id,
  p.amount,
  p.status,
  'deposit' as type,
  p.created_at,
  pr.id as user_id,
  pr.full_name as user_name,
  pr.email as user_email,
  pr.cpf as user_cpf,
  pr.phone as user_phone
FROM payments p
INNER JOIN orders o ON p.order_id = o.id
LEFT JOIN profiles pr ON o.user_id = pr.id
UNION ALL
SELECT 
  w.id,
  w.amount,
  'completed' as status,
  w.type,
  w.created_at,
  pr.id as user_id,
  pr.full_name as user_name,
  pr.email as user_email,
  pr.cpf as user_cpf,
  pr.phone as user_phone
FROM wallet_transactions w
LEFT JOIN profiles pr ON w.user_id = pr.id
WHERE w.type IN ('admin_bonus', 'promo_code');
