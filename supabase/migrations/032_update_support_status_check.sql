ALTER TABLE public.support_conversations DROP CONSTRAINT IF EXISTS support_conversations_status_check;
ALTER TABLE public.support_conversations ADD CONSTRAINT support_conversations_status_check CHECK (status IN ('open', 'waiting', 'closed'));
