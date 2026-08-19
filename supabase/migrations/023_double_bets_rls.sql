-- ============================================================
-- PREMIAJÁ — Migration 023: Enable RLS on double_bets
-- ============================================================

ALTER TABLE public.double_bets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own double bets" 
ON public.double_bets 
FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

GRANT SELECT ON public.double_bets TO authenticated;
